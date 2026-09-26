# Testar o Clerk de produção na máquina local

Este guia explica como rodar o app no seu computador usando a **instância de
produção** do Clerk (chaves `pk_live_` / `sk_live_`). Isso serve para reproduzir
localmente os problemas de login que só aparecem em produção.

```bash
npm run dev:prod     # abre em https://local.menuonline.site
```

O dia a dia continua com `npm run dev`, que usa a instância de desenvolvimento
do Clerk em `http://localhost:3000`.

## Por que não basta trocar as chaves no `.env.local`

A instância de produção do Clerk tem três exigências que a instância de
desenvolvimento não tem:

1. **Domínio.** Ela só aceita requisições vindas de `menuonline.site` ou de
   um subdomínio dele. Em `localhost` o login falha.
2. **HTTPS.** Os cookies de sessão são `Secure`, então o app precisa rodar em
   HTTPS.
3. **Nenhuma porta no endereço.** A API do Clerk (`clerk.menuonline.site`)
   compara o cabeçalho `Origin` do navegador com o domínio, e a porta faz
   parte do `Origin`. Testando direto na API:

   | `Origin` enviado                     | Resposta do Clerk |
   | ------------------------------------ | ----------------- |
   | `https://local.menuonline.site:3000` | **400**           |
   | `https://local.menuonline.site`      | 200               |
   | `https://menuonline.site`            | 200               |

   Com o erro 400, o console do navegador mostra:
   _"Production Keys are only allowed for domain menuonline.site. The Request
   HTTP Origin header must be equal to or a subdomain of the requesting URL."_

A solução é usar um subdomínio (`local.menuonline.site`) que aponta para a sua
própria máquina, servido em HTTPS na porta 443, que é a porta padrão e por
isso não aparece no endereço.

## Preparação (uma vez por máquina)

Os comandos que usam `sudo` ou `mkcert -install` pedem a senha de
administrador. Rode-os no seu terminal.

**1. Apontar o subdomínio para a sua máquina**

```bash
echo "127.0.0.1 local.menuonline.site" | sudo tee -a /etc/hosts
```

**2. Criar um certificado HTTPS confiável**

```bash
brew install mkcert
mkcert -install        # instala uma autoridade certificadora local no Keychain
mkdir -p certificates
mkcert -key-file certificates/localhost-key.pem \
       -cert-file certificates/localhost.pem \
       localhost 127.0.0.1 ::1 local.menuonline.site
```

A pasta `certificates/` está no `.gitignore`, porque guarda uma chave privada.

> Por que não usar o certificado automático do Next (`--experimental-https`
> sem argumentos)? O mkcert que o Next baixa para
> `~/Library/Caches/mkcert/` veio sem permissão de execução e sem assinatura
> de código. Em Mac com Apple Silicon o sistema mata o processo (`SIGKILL`).
> O mkcert do Homebrew é assinado e funciona.

**3. Criar o `.env.prod.local` com as chaves de produção**

```bash
clerk auth login
clerk env pull --instance prod --file .env.prod.local
```

Depois acrescente ao arquivo as outras variáveis que o app precisa
(`DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `BILLING_MODE`, etc.). **De
preferência use um banco de teste, não o de produção.** Esse arquivo também é
ignorado pelo git, pela regra `.env*.local`.

Para conferir que a instância de produção está pronta (DNS, SSL e OAuth):

```bash
clerk deploy status
```

## Rodar

```bash
npm run dev:prod
```

Abra **https://local.menuonline.site**, sem porta.

## O que foi alterado no projeto

### `package.json`: script `dev:prod`

```
set -a && . ./.env.prod.local && set +a && next dev --experimental-https --experimental-https-key certificates/localhost-key.pem --experimental-https-cert certificates/localhost.pem -H 0.0.0.0 -p 443
```

| Trecho                                                   | Para que serve                                                                                                                                                                                                   |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `set -a && . ./.env.prod.local && set +a`                | Carrega as chaves de produção no ambiente antes de subir o Next. O Next não sobrescreve variáveis que já existem, então elas têm prioridade sobre o `.env.local`, que continua com as chaves de desenvolvimento. |
| `--experimental-https-key` / `--experimental-https-cert` | Usa o certificado gerado pelo mkcert do Homebrew, em vez do mkcert quebrado que o Next baixa.                                                                                                                    |
| `-p 443`                                                 | Tira a porta do endereço, o que o Clerk exige (ver tabela acima).                                                                                                                                                |
| `-H 0.0.0.0`                                             | No macOS, um usuário comum só pode usar a porta 443 escutando em todas as interfaces. Em `127.0.0.1` dá `EACCES` sem sudo.                                                                                       |

Não use `node --env-file=...` para carregar as variáveis. O Next repassa essa
opção para um processo filho pelo `NODE_OPTIONS`, onde ela não é permitida, e
o servidor não sobe.

### `next.config.ts`

- `allowedDevOrigins: ["local.menuonline.site"]`: o servidor de dev do Next
  bloqueia requisições de hosts desconhecidos. Como ele escuta em `0.0.0.0`,
  o subdomínio precisa ser liberado explicitamente.
- O CSP de desenvolvimento agora inclui `wss:` em `connect-src`. Em HTTPS, o
  recarregamento automático (HMR) usa WebSocket seguro, que antes era
  bloqueado.

### `.gitignore`

A pasta `certificates/` foi adicionada.

## Como foi validado

A página `https://local.menuonline.site/entrar` foi aberta num Chromium sem
extensões, via Playwright. O resultado:

- os scripts do Clerk (`clerk.browser.js` e `ui.browser.js`) carregaram de
  `clerk.menuonline.site`;
- `/v1/environment` e `/v1/client` responderam 200;
- `window.Clerk.loaded` ficou `true`;
- o formulário de login e o botão do Google apareceram.

## Problemas encontrados e solução

| Sintoma                                                                   | Causa                                                                        | Solução                                                        |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `--env-file= is not allowed in NODE_OPTIONS`                              | O Next repassa as opções do `node` para um processo filho                    | Carregar o arquivo com `set -a && . ./.env.prod.local`         |
| `Failed to generate self-signed certificate` (status 126 ou `SIGKILL`)    | O mkcert do cache do Next está sem permissão de execução e sem assinatura    | mkcert do Homebrew e certificado passado por parâmetro         |
| `getaddrinfo ENOTFOUND local.menuonline.site`                             | Falta a linha no `/etc/hosts`                                                | Passo 1 da preparação                                          |
| `Production Keys are only allowed for domain…` (400 em `/v1/client`)      | Porta `:3000` no `Origin`                                                    | Rodar na porta 443                                             |
| `Failed to load Clerk JS` com o servidor do Clerk respondendo normalmente | Bloqueio no próprio navegador: bloqueador de anúncios ou cache de DNS antigo | Desativar o bloqueador para o domínio ou reiniciar o navegador |
| `EADDRINUSE 0.0.0.0:443`                                                  | Já existe outro `dev:prod` rodando                                           | Encerrar o outro processo (`lsof -nP -iTCP:443 -sTCP:LISTEN`)  |
| `Another next dev server is already running`                              | Um `npm run dev` está aberto na mesma pasta                                  | O Next só aceita um servidor de dev por pasta; encerre o outro |

## Webhooks

O login funciona sem webhook. Ele só espelha no banco as mudanças feitas
fora do app: `user.updated` (nome e e-mail) e `user.deleted` (conta apagada
pelo dashboard do Clerk). A rota é `/api/webhooks/clerk`.

Cada endpoint cadastrado no Clerk tem o seu próprio signing secret
(`whsec_…`). Com a variável vazia, a rota responde 503 e não faz nada; com um
valor que não começa com `whsec_`, **o app inteiro falha** na validação das
variáveis de ambiente.

**Produção:** na instância de produção do Clerk, em Webhooks, crie um
endpoint `https://menuonline.site/api/webhooks/clerk` com os eventos
`user.updated` e `user.deleted`. Coloque o secret dele em
`CLERK_WEBHOOK_SIGNING_SECRET` na Vercel e faça um novo deploy.

**Local:** o Clerk não alcança `local.menuonline.site`, que só existe no seu
`/etc/hosts`. A CLI resolve isso com um endereço de repasse:
`https://webhooks.clerk.com/in/<CLERK_WEBHOOK_RELAY_TOKEN>/`. O token fica no
`.env.prod.local` para o endereço não mudar entre execuções.

1. Cadastre esse endereço como um **segundo endpoint** na mesma instância de
   produção, com os mesmos dois eventos.
2. Coloque o secret dele em `CLERK_WEBHOOK_SIGNING_SECRET` no
   `.env.prod.local`.
3. Rode, com o `dev:prod` no ar:

   ```bash
   npm run webhooks:local
   ```

O script aponta o `NODE_EXTRA_CA_CERTS` para a autoridade do mkcert, porque a
CLI roda em Node e não confia no certificado local por padrão.

Os dois endpoints recebem os mesmos eventos. Enquanto o `webhooks:local` não
estiver rodando, as entregas locais falham e o Clerk tenta de novo; se ficar
muito tempo parado, desative esse endpoint no dashboard. Se o banco for o
mesmo nos dois ambientes, o evento é processado uma vez só: o `svix-id` é o
mesmo nas duas entregas e a rota ignora a repetida.

## Limitações

- **Rede local:** escutando em `0.0.0.0`, o app fica acessível para outros
  aparelhos da sua rede, usando as chaves de produção e o banco do
  `.env.prod.local`. Use só em redes confiáveis. Se o macOS perguntar sobre
  conexões de entrada, pode negar.
- **Usuários reais:** quem fizer login aqui cria ou usa contas da instância de
  produção do Clerk.
