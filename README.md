# MenuQR — plataforma white label de cardápio digital

SaaS multi-tenant onde **cada restaurante cria a própria conta, cadastra o negócio e monta o
cardápio**. O sistema publica uma página de cardápio com a marca do cliente e os pedidos são
finalizados no WhatsApp do estabelecimento.

- **`/`** — landing page que vende o produto (para o dono do restaurante).
- **`/criar-conta`, `/entrar`** — cadastro e login, pelas telas do Clerk em português.
- **`/painel`** — painel do lojista: negócio, cardápio, publicação, link, QR code e conta.
- **`/r/[slug]`** — cardápio público do restaurante, com carrinho e checkout no WhatsApp.

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind 4 + SQLite/libSQL**, com o
**[Clerk](https://clerk.com)** cuidando do login. Banco, cardápio e QR code rodam dentro do
próprio projeto.

---

## Índice

- [Como funciona](#como-funciona)
- [Modo demonstração (sem banco)](#modo-demonstração-sem-banco)
- [Rodando o projeto](#rodando-o-projeto)
- [O cardápio de exemplo](#o-cardápio-de-exemplo)
- [Checkout: o que o cliente vê antes de enviar](#checkout-o-que-o-cliente-vê-antes-de-enviar)
- [Fotos dos pratos e logo](#fotos-dos-pratos-e-logo)
- [Conta e login](#conta-e-login)
- [Erros em produção](#erros-em-produção)
- [Cache do cardápio publicado](#cache-do-cardápio-publicado)
- [Contas e dados de demonstração](#contas-e-dados-de-demonstração)
- [Arquitetura](#arquitetura)
- [Multi-tenant na prática](#multi-tenant-na-prática)
- [Segurança](#segurança)
- [SEO](#seo)
- [Publicação](#publicação)
- [Estrutura de pastas](#estrutura-de-pastas)
- [O que já está pronto e o que não está](#o-que-já-está-pronto-e-o-que-não-está)

---

## Como funciona

**Para o dono do restaurante**

1. Cria a conta pelo Clerk (e-mail e senha, ou um provedor que você tenha ligado no painel dele).
2. Cadastra o negócio: nome, endereço do cardápio (`/r/seu-restaurante`) e o WhatsApp que recebe
   os pedidos.
3. Monta o cardápio: categorias, itens com foto, preços e complementos (ponto da carne, tamanho,
   adicionais pagos com limite de escolhas).
4. Ajusta horários, bairros atendidos com taxa e prazo, pedido mínimo, frete grátis, formas de
   pagamento, cor da marca e logo.
5. Publica. O link e o QR code ficam prontos para as redes sociais, mesas e embalagens.

**Para o cliente do restaurante**

1. Abre o cardápio pelo link ou QR code.
2. Escolhe os itens e os complementos, com o preço calculado na hora.
3. Informa nome, WhatsApp, endereço e forma de pagamento no carrinho.
4. Toca em “Enviar pedido pelo WhatsApp” e a conversa abre com o pedido escrito:

```
*NOVO PEDIDO — Cantina da Nona*
Pedido #2208-1847-K7 · 22/08/2026 às 18:47

*🧾 Itens*
1x Nhoque da Nona — R$ 48,90
   • Molho: Quatro queijos

*💰 Valores*
Subtotal: R$ 48,90
*Total: R$ 48,90*

*👤 Cliente*
Nome: Cliente Teste
WhatsApp: (11) 98888-7777

*🏠 Retirada no local*
Previsão: 20-30 min

*💳 Pagamento*
Pix
```

## Rodando o projeto

Requisitos: Node.js 20.9+.

```bash
npm install
cp .env.example .env.local     # ajuste a URL pública
npm run db:seed                # cria o banco e um restaurante de demonstração
npm run dev                    # http://localhost:3000
```

| Comando             | O que faz                                                      |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Ambiente de desenvolvimento                                     |
| `npm run build`     | Build de produção                                               |
| `npm start`         | Servidor de produção                                            |
| `npm run lint`      | ESLint (regras do Next e do React)                              |
| `npm run typecheck` | Checagem de tipos                                               |
| `npm run db:seed`   | Cria as tabelas e o restaurante de demonstração                 |
| `npm run db:reset`  | Apaga o banco local e recria do zero                            |
| `npm run check:exemplo` | Confere que o cardápio de exemplo é igual nos dois modos     |
| `npm run check`     | Lint + tipos + cardápio de exemplo                              |

> **Importante:** `NEXT_PUBLIC_SITE_URL` é embutida no build. Defina a URL real **antes** de
> `npm run build`, senão o canonical e o sitemap apontam para o domínio padrão.

## O cardápio de exemplo

O restaurante de exemplo (`/r/sabor-e-brasa`) tem **uma fonte só**:
`src/lib/demo/sample-menu.json`. O mesmo arquivo alimenta o modo demonstração
(pelo bundle, direto no navegador), o seed do banco (`scripts/seed.mjs`) e a
ilustração da página inicial. Antes eram duas cópias escritas à mão, e elas
divergiram — um item chegou a perder os complementos numa delas.

Para editar o exemplo, mexa no JSON e rode `npm run check:exemplo`: o comando
popula um banco descartável com o seed de verdade, lê de volta pelos mesmos
repositórios que o cardápio público usa e compara campo a campo.

A tela também é a mesma nos dois caminhos: o cardápio servido pelo banco, o do
modo demonstração e a prévia do painel montam `StoreFrame` + `StoreMenu`
(`src/components/store/`). Não existe uma versão "do exemplo" e outra "dos
lojistas" — qualquer melhoria no cardápio vale para os dois no mesmo commit.

## Checkout: o que o cliente vê antes de enviar

Quatro regras que evitam surpresa depois do pedido enviado:

- **A sacola é reconferida** contra o cardápio toda vez que a página abre
  (`reviewCart`, em `src/lib/cart-store.ts`). Item que saiu do cardápio ou esgotou é
  removido, preço que mudou é atualizado, e o cliente vê exatamente o que foi corrigido.
- **O total só fecha quando o frete é conhecido.** Sem bairro escolhido, a entrega
  aparece como “a calcular” e o total mostra `R$ x + entrega` — nunca um número que
  vai mudar depois.
- **Aberto ou fechado segue o relógio do restaurante**, não o do celular do cliente: o fuso
  sai da UF do endereço (`timeZoneForState`, em `src/lib/hours.ts`). A data, a hora e o número
  do pedido na mensagem usam o mesmo fuso, e o número ganha um sufixo sorteado (`-K7`) para
  dois pedidos no mesmo minuto não saírem iguais.
- **Loja fechada avisa no topo da sacola**, com o horário da próxima abertura. Sem
  agendamento, o botão de enviar já fica desabilitado; com `acceptOrdersWhenClosed`
  ligado, o aviso vira informativo e o pedido segue como agendamento.
- **Bairro fora da área tem saída.** A opção “meu bairro não está na lista” pede o
  bairro, oferece retirada e manda a mensagem marcada como `PEDIDO A CONFIRMAR`, com
  a entrega “a combinar” — em vez de deixar o cliente travado num `select`.
- **Restaurante sem bairros cadastrados** não mostra lista vazia: o bairro vira texto
  livre e a taxa segue “a combinar” na mensagem.
- **O modo do pedido respeita a loja.** A preferência entrega/retirada é lembrada entre
  restaurantes; numa loja que só faz retirada o checkout já abre em retirada
  (`resolveOrderMode`), em vez de pedir um endereço que não serve para nada.
- **Complementos mantêm o id entre edições** (grupo e opção com o mesmo nome). A sacola
  guarda esses ids; se um obrigatório deixa de existir, o item sai da sacola com aviso,
  em vez de seguir para o WhatsApp sem o tamanho e mais barato.

## Fotos dos pratos e logo

O lojista envia a foto pelo painel e ela fica **no próprio banco** — sem serviço de armazenamento
para contratar. O navegador reduz a imagem antes de enviar (lado maior até 1200 px, WebP, alvo de
400 KB; uma foto de celular de 4 MB chega com algumas dezenas de KB), o que também apaga o EXIF,
inclusive a localização.

- `POST /api/imagens` exige login e posse do negócio, confere a origem da requisição, aceita só
  JPEG, PNG e WebP **pelos bytes do arquivo** (SVG nunca), até 600 KB e 60 envios por hora por negócio.
- `GET /img/<id>` serve a imagem com cache imutável: o id nunca muda de conteúdo.
- O valor guardado no item ou na logo é `/img/<uuid>`; emoji e URL `https://` continuam valendo.
- Imagem que deixou de ser usada pelo negócio é apagada no envio seguinte, depois de um dia de folga.
- No modo demonstração não há servidor, então o botão de envio não aparece.

## Conta e login

Quem cuida de senha, sessão, confirmação de e-mail e recuperação é o **Clerk**. O projeto não
guarda senha nenhuma, e não há e-mail transacional para configurar.

- **`/entrar` e `/criar-conta`** são rotas coringa (`[[...rest]]`) com os componentes `<SignIn>` e
  `<SignUp>`. Precisam ser coringa porque o Clerk resolve as etapas (código, provedor externo,
  senha nova) em caminhos abaixo delas. Cadastro novo cai em `/painel/comecar`; quem foi mandado
  ao login por um link do painel volta para onde estava, pelo `?proximo=`.
- **`/painel/conta`** mostra o `<UserProfile>` do Clerk (nome, e-mail, senha, aparelhos conectados)
  e, embaixo, o **excluir conta** que é nosso: apaga negócio, cardápio e fotos, tira o cardápio
  público do ar na hora e só então apaga o acesso no Clerk. Nessa ordem de propósito — o contrário
  deixaria o cardápio publicado sem dono.
- **Quem é o lojista no banco.** A tabela `users` continua existindo: é o dono a que o negócio se
  prende (`businesses.owner_id`). Ela ganhou a coluna `clerk_user_id`, e `getCurrentUser`
  (`src/server/auth/current-user.ts`) traduz o usuário do Clerk para essa linha, criando-a na
  primeira vez que a conta aparece. Só nesse primeiro acesso há uma ida à API do Clerk; depois o
  nome e o e-mail saem do banco.
- **Conta antiga é adotada pelo e-mail.** Uma linha sem `clerk_user_id` (criada antes do Clerk, ou
  pelo seed) é adotada por quem entrar com o mesmo endereço — o lojista reencontra o cardápio em
  vez de começar do zero. Linha que já pertence a outra conta nunca é tomada.
- **Traduzido e na cor da marca**: `<ClerkProvider>` recebe `ptBR` de `@clerk/localizations` e o
  vermelho do MenuQR em `appearance.variables` (`src/app/layout.tsx`).

## Erros em produção

`src/instrumentation.ts` registra cada erro de servidor como uma linha JSON (`"event":"menuqr_error"`),
e a tela de erro relata os do navegador para `POST /api/erros`, que grava a mesma linha — dá para
filtrar por `menuqr_error` nos logs da hospedagem. Identificador no caminho (as etapas de login do
Clerk abaixo de `/entrar`) sai mascarado. O comentário no topo do arquivo mostra onde plugar Sentry ou similar.

## Cache do cardápio publicado

`/r/[slug]` é pré-renderizado por `generateStaticParams`. Para essas páginas, invalidar
pelo caminho concreto (`/r/sabor-e-brasa`) **não** funciona: só o padrão da rota
(`/r/[slug]`) derruba o cache. Toda escrita passa por `revalidateStore`
(`src/server/revalidate.ts`), que chama as duas formas — sem isso o lojista muda o preço
e o cliente continua vendo o antigo até o `revalidate` de 5 minutos vencer.

## Contas e dados de demonstração

O seed cria um restaurante completo para você navegar:

- Cardápio público: **`/r/sabor-e-brasa`** (4 categorias, 9 itens, complementos, 4 bairros)
- Dono do cardápio: a linha **demo@menuqr.app**, criada **sem acesso ligado**

Não há mais senha de demonstração no README — não há senha nenhuma neste projeto. Para assumir o
cardápio de exemplo, crie uma conta em `/criar-conta` usando `demo@menuqr.app`: a linha órfã do
seed é adotada e o restaurante passa a ser seu. Em banco de produção, lembre que essa conta é dona
do cardápio que a página inicial divulga — quem a criar troca o WhatsApp dele.

## Arquitetura

```
Navegador do cliente          Servidor (Next.js)              Banco (SQLite/libSQL)
─────────────────────         ──────────────────              ─────────────────────
/r/[slug]  ────────────────►  Server Component  ───────────►  businesses, categories,
  carrinho no localStorage    (HTML já com o cardápio)        items, option_groups…
        │
        └── WhatsApp ◄─────── mensagem montada no navegador
```

- **Sem back-end de pedidos.** O pedido vai do navegador direto para o WhatsApp do restaurante.
  A plataforma não guarda pedido nem dado de consumidor.
- **Banco relacional** com chaves estrangeiras e `ON DELETE CASCADE`: apagar uma categoria leva
  itens e complementos junto, sem lixo no banco.
- **Server Actions** para toda escrita, com validação [zod](https://zod.dev) e verificação de dono
  antes de qualquer alteração.
- **ISR com invalidação sob demanda:** o cardápio é servido estático (`revalidate = 300`) e cada
  gravação no painel chama `revalidatePath`, então a alteração aparece na hora.

### Banco de dados

O cliente é o `@libsql/client`, que fala o mesmo protocolo em dois cenários:

```env
# desenvolvimento — arquivo local
DATABASE_URL=file:./data/menuqr.db

# produção — libSQL/Turso gerenciado
DATABASE_URL=libsql://seu-banco.turso.io
DATABASE_AUTH_TOKEN=...
```

Nenhuma linha de código muda entre os dois. O schema (`src/server/db/schema.ts`) é aplicado
automaticamente na primeira consulta, de forma idempotente.

## Multi-tenant na prática

- Cada negócio tem `slug` único e endereço próprio em `/r/[slug]`; a lista de slugs reservados
  impede que um restaurante ocupe rotas da plataforma (`/painel`, `/entrar`…).
- **Carrinho isolado por restaurante:** a chave do `localStorage` inclui o id do negócio, então
  pedidos de lojas diferentes nunca se misturam (há teste automatizado para isso).
- **Marca do cliente:** cor e logo do lojista viram variáveis CSS na página. A cor do texto sobre a
  cor da marca é calculada por contraste, então botões continuam legíveis mesmo com cores claras.
- **Rascunho x publicado:** enquanto não publica, `/r/[slug]` responde 404 e só o dono vê o
  cardápio, pela prévia dentro do painel.

## Segurança

- **Senha e sessão são do [Clerk](https://clerk.com)**: o projeto não guarda senha, hash de senha
  nem token de sessão. Um vazamento do banco não entrega o acesso de ninguém.
- Toda ação de escrita passa por `assertOwnership`, que confirma que o negócio pertence a quem está
  logado — o id do negócio vindo do formulário nunca é confiável sozinho.
- O mesmo vale para os ids de **item e categoria**: `saveItemAction` confere os dois contra o negócio
  e `replaceItemOptions` recusa item de outro lojista. Imagem e logo só aceitam emoji ou URL `http(s)`.
- `src/proxy.ts` (`clerkMiddleware`) manda quem abre o painel deslogado para o login **com o
  destino** (`?proximo=`). É conveniência, não segurança: quem barra o acesso é `requireUser`, no
  layout do painel, e cada página e ação confere de novo. Por isso a comparação de caminho é feita
  à mão — o próprio Clerk desaconselha decidir acesso por rota no middleware.
- O middleware roda **só onde alguém pergunta quem está logado** (`/painel`, `/entrar`,
  `/criar-conta`, `/api`, `/__clerk`). O cardápio público fica de fora: é o caminho mais quente do
  site e não tem conta para resolver.
- Limite de tentativas de login é do Clerk. O que sobrou em `rate_limits` (banco, então vale entre
  instâncias serverless) é o envio de fotos, por negócio.
- Entrada validada com zod em todas as Server Actions; cor da marca só aceita `#rrggbb`.
- Cabeçalhos de segurança em `next.config.ts`: CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`.
- `/painel` fora do sitemap e bloqueado no `robots.txt`.
- O cabeçalho da landing troca “Entrar” por “Ir para o painel” com o `useAuth()` do Clerk. Não
  autoriza nada: se a sessão tiver caído, o botão cai no login.
- A **CSP** em `next.config.ts` libera o Clerk a partir da própria chave pública — o endereço da
  API dele é lido de `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, então trocar de instância (teste ↔
  produção) não pede mudança na política. Sem chave, nada disso entra e a política fica como era.

## SEO

Cada cardápio publicado é uma página otimizada, não um app fechado:

- Título, descrição e canonical próprios por restaurante e por prato, gerados a partir do banco.
- Open Graph e Twitter Card com **imagem 1200×630 gerada por restaurante**, na cor da marca.
- Dados estruturados schema.org: `Restaurant` (NAP, `geo` opcional, horários, formas de pagamento,
  área atendida, `OrderAction`), `Menu`/`MenuSection`/`MenuItem` com preço e disponibilidade,
  `BreadcrumbList`. A landing traz `Organization`, `WebSite`, `SoftwareApplication` e `FAQPage`.
- Sitemap dinâmico: entram os cardápios publicados e cada página de item, com `lastModified` real.
- O cardápio inteiro vai no HTML servido — o Google não precisa executar JavaScript para ler pratos
  e preços.

> Não marcamos `AggregateRating` nem `Review`: avaliações escritas pelo próprio negócio violam as
> diretrizes do Google. Use o Google Business Profile para avaliações reais.

## Modo demonstração (sem banco)

Quando **não há `DATABASE_URL` configurada**, a aplicação sobe em *modo demonstração*: conta,
cardápio e publicação acontecem **inteiramente no navegador** (localStorage), sem servidor de dados.
É o que permite testar o produto de ponta a ponta num deploy recém-criado, sem configurar nada.

Nesse modo o Clerk **não é carregado** (nem faria sentido pedir chave para testar sem
infraestrutura): `/entrar` e `/criar-conta` voltam a ser o formulário simulado do navegador.

O que muda:

| | Modo demonstração | Modo normal (com `DATABASE_URL`) |
| --- | --- | --- |
| Conta e sessão | localStorage do navegador | Clerk (o painel do MenuQR não guarda senha) |
| Cardápio | localStorage | banco libSQL/SQLite |
| Quem enxerga o cardápio publicado | qualquer pessoa, se receber o link completo (que carrega o cardápio) | qualquer pessoa com o link |
| SEO da página do restaurante | renderizada no cliente | HTML completo no servidor |
| Segurança | **nenhuma** — é uma simulação | login pelo Clerk e checagem de dono a cada escrita |

Sinais visíveis: uma faixa “Modo demonstração” aparece no painel e nos cardápios, e
`GET /api/status` responde `database: "sem-configuracao"`.

`/r/sabor-e-brasa` continua funcionando como vitrine: o cardápio de exemplo vem embutido no
próprio bundle.

### Compartilhar sem banco: o cardápio dentro do link

Sem banco não existe onde o servidor guardar o cardápio de cada lojista — então quem guarda é o
link. Ao publicar, o painel monta um endereço assim:

```
https://seusite.com/r/max-burguer#c=1VhNbyS3Ef0rBQYw…
```

Depois do `#` vai o cardápio inteiro: JSON enxuto (sem ids, posições e campos vazios, que são
reconstruídos na abertura), comprimido com DEFLATE e escrito em base64url — ver
`src/lib/share-link.ts`. Quem abre em outro aparelho recebe o cardápio junto com a página, e ele
fica guardado no `localStorage` (em `shared`, separado do negócio de quem está no navegador) para
as próximas visitas.

O fragmento foi escolhido de propósito no lugar de `?c=`: ele **não é enviado ao servidor**, então
a rota continua sendo gerada estaticamente, o pacote não aparece em log nenhum e o link não esbarra
no limite de tamanho que proxies e CDNs impõem à linha de requisição.

Os limites, que são reais:

- **O link fica longo** (o cardápio de exemplo dá ~2,4 mil caracteres).
- **QR code cabe até ~2.900 caracteres.** Passando disso o painel avisa e deixa de oferecer o QR —
  o link continua funcionando.
- **Editou o cardápio? Compartilhe o link de novo.** O link antigo continua mostrando a versão que
  estava no ar quando foi gerado.
- **Sem prévia rica no WhatsApp:** como o servidor não vê o fragmento, o card mostra o nome
  derivado do endereço (`/r/max-burguer` → “Max Burguer”), não a descrição do restaurante.

Nada disso existe no modo normal: com `DATABASE_URL` configurada o link volta a ser curto, sempre
atualizado e com prévia completa.

Para forçar um dos modos, use `NEXT_PUBLIC_DEMO_MODE=1` (demonstração) ou `0` (normal, exige banco).

> **Não use o modo demonstração com clientes reais.** Não há autenticação de verdade: qualquer
> pessoa no mesmo navegador vê e altera tudo, e os dados somem se o cliente limpar o site.

## Publicação

### Vercel (passo a passo)

1. **Framework Preset = Next.js.** O `vercel.json` na raiz já força isso. Se o projeto foi criado
   quando o repositório ainda era um site estático, o preset pode ter ficado como *Other* — nesse
   caso a Vercel publica os arquivos crus, não acha `index.html` e **todas as rotas dão 404**.
   Confira em *Settings → General → Framework Preset* e deixe *Root Directory* vazio.
2. **Banco de dados.** Sem `DATABASE_URL`, o deploy sobe em [modo demonstração](#modo-demonstração-sem-banco)
   e já dá para testar tudo. Para valer de verdade — cardápio acessível por qualquer pessoa,
   autenticação real e SEO no servidor — configure um banco. Funções serverless têm disco somente
   leitura e efêmero, então o SQLite em arquivo não serve: crie um banco libSQL gratuito no
   [Turso](https://turso.tech), **na região AWS US East (Virginia)**, e configure em
   *Settings → Environment Variables*:

   ```env
   DATABASE_URL=libsql://seu-banco.turso.io
   DATABASE_AUTH_TOKEN=...
   NEXT_PUBLIC_SITE_URL=https://seudominio.com.br
   # login do painel — sem as duas, o deploy fica em modo demonstração
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   # telas do Clerk nas rotas em português
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/entrar
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/criar-conta
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/painel
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/painel/comecar
   ```

   As chaves saem do [dashboard do Clerk](https://dashboard.clerk.com) → *API keys*. Em produção
   use as `pk_live_`/`sk_live_` da instância de produção, que é separada da de desenvolvimento.

3. **Crie as tabelas** (e, se quiser, o restaurante de demonstração) apontando o seed para o banco
   remoto, da sua máquina:

   ```bash
   DATABASE_URL=libsql://seu-banco.turso.io DATABASE_AUTH_TOKEN=... npm run db:seed
   ```

   O schema também é criado sozinho na primeira consulta; o seed serve para já ter conteúdo.

   A região importa: o Turso não tem São Paulo, e o `vercel.json` roda as funções em `iad1`
   (Virginia) para ficarem ao lado do banco. Uma página do painel faz várias consultas; com a
   função em São Paulo e o banco na Virginia, cada uma pagaria ~120 ms de ida e volta. Assim o
   visitante paga essa distância uma vez só, e o cardápio público sai do cache. Se o banco for
   para outra região, troque `regions` para a região da Vercel mais próxima dele.
4. **Redeploy** depois de definir as variáveis — `NEXT_PUBLIC_SITE_URL` é embutida no build.

### Outros ambientes

```bash
NEXT_PUBLIC_SITE_URL=https://seudominio.com.br npm run build
npm start
```

Em VPS (Docker, systemd, Railway com volume) o SQLite em `data/` já resolve — faça backup do
arquivo.

### Diagnóstico

`GET /api/status` responde se a aplicação está no ar e se o banco responde, sem expor credenciais:

```json
{ "ok": true, "app": "MenuQR", "database": "ok", "environment": "vercel" }
```

`database` pode vir como `sem-configuracao` (sem `DATABASE_URL` — a aplicação está em modo
demonstração) ou `indisponivel` (credencial errada ou banco fora do ar). Se **a landing** der 404, o problema não é
a aplicação: ela é uma página estática e sobe até sem banco — verifique o preset e o deploy na
Vercel.

Depois de publicar: cadastre o domínio no Google Search Console, envie `/sitemap.xml` e valide uma
página de cardápio no [teste de resultados ricos](https://search.google.com/test/rich-results).

## Estrutura de pastas

```
src/
  app/
    (plataforma)/          landing, login e cadastro (Clerk) e páginas legais
    painel/                painel do lojista (autenticado, noindex)
    r/[slug]/              cardápio público + páginas de prato + OG por restaurante
    sitemap.ts robots.ts   SEO gerado a partir do banco
  components/
    platform/              cabeçalho, rodapé e formulários da plataforma
    painel/                formulários e listas do painel
    store/                 cardápio, carrinho e checkout do restaurante
  lib/                     tipos, formatação, horários, cores, SEO, mensagem do WhatsApp
  server/
    db/                    cliente libSQL e schema
    repositories/          consultas de usuários, negócios e cardápio
    auth/                  usuário logado (Clerk → banco) e guardas de acesso
    actions/               Server Actions (cadastro, negócio, cardápio)
scripts/seed.mjs           restaurante de demonstração
```

## O que já está pronto e o que não está

**Pronto**

- Cadastro, login e sessão pelo Clerk (incluindo recuperação de senha e confirmação de e-mail),
  onboarding do negócio e tela de conta com exclusão que apaga os dois lados
- Upload de fotos dos pratos e da logo, guardadas no próprio banco
- CRUD de categorias e itens, com reordenação de categorias e esgotar/reativar item
- Editor de complementos (escolha única/múltipla, obrigatório, limite, preço por opção)
- Publicar/despublicar, prévia, link e QR code gerado no servidor
- Cardápio público com busca, páginas de prato, carrinho por restaurante e checkout no WhatsApp
- Sacola reconferida contra o cardápio, total que só fecha com o frete conhecido, aviso de loja
  fechada no topo e saída para bairro fora da área
- Entrega por bairro, pedido mínimo, frete grátis, retirada, troco e chave Pix
- Landing page, páginas legais, SEO e cabeçalhos de segurança

**Ainda não**

- Domínio próprio por restaurante
- Mais de um negócio por conta e múltiplos usuários por negócio
- Histórico de pedidos dentro da plataforma — hoje o pedido vive só no WhatsApp
- Plano pago: a página de planos mostra o Profissional como “Em breve”; não há cobrança nem
  limite de itens
- Reordenação de itens dentro da categoria e mais de um turno por dia no horário
