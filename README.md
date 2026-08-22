# MenuQR — plataforma white label de cardápio digital

SaaS multi-tenant onde **cada restaurante cria a própria conta, cadastra o negócio e monta o
cardápio**. O sistema publica uma página de cardápio com a marca do cliente e os pedidos são
finalizados no WhatsApp do estabelecimento.

- **`/`** — landing page que vende o produto (para o dono do restaurante).
- **`/criar-conta`, `/entrar`** — cadastro e login.
- **`/painel`** — painel do lojista: negócio, cardápio, publicação, link e QR code.
- **`/r/[slug]`** — cardápio público do restaurante, com carrinho e checkout no WhatsApp.

Stack: **Next.js 16 (App Router) + TypeScript + Tailwind 4 + SQLite/libSQL**, sem serviço externo
obrigatório. Autenticação, banco e QR code rodam dentro do próprio projeto.

---

## Índice

- [Como funciona](#como-funciona)
- [Modo demonstração (sem banco)](#modo-demonstração-sem-banco)
- [Rodando o projeto](#rodando-o-projeto)
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

1. Cria a conta com nome, e-mail e senha.
2. Cadastra o negócio: nome, endereço do cardápio (`/r/seu-restaurante`) e o WhatsApp que recebe
   os pedidos.
3. Monta o cardápio: categorias, itens, preços e complementos (ponto da carne, tamanho, adicionais
   pagos com limite de escolhas).
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
Pedido #2208-1847 · 22/08/2026 às 18:47

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

> **Importante:** `NEXT_PUBLIC_SITE_URL` é embutida no build. Defina a URL real **antes** de
> `npm run build`, senão o canonical e o sitemap apontam para o domínio padrão.

## Contas e dados de demonstração

O seed cria um restaurante completo para você navegar:

- Cardápio público: **`/r/sabor-e-brasa`** (4 categorias, 9 itens, complementos, 4 bairros)
- Login do painel: **demo@menuqr.app** / **demo1234**

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

- Senhas com **scrypt** (`node:crypto`), salt aleatório por usuário e comparação em tempo constante.
- Sessão em cookie `httpOnly`, `SameSite=Lax`, `Secure` em produção; no banco fica apenas o **hash
  SHA-256** do token.
- Toda ação de escrita passa por `assertOwnership`, que confirma que o negócio pertence a quem está
  logado — o id do negócio vindo do formulário nunca é confiável sozinho.
- Limite de tentativas de login e de cadastro por e-mail, com mensagem única para “e-mail não
  existe” e “senha errada” (não revela quem tem conta).
- Entrada validada com zod em todas as Server Actions; cor da marca só aceita `#rrggbb`.
- Cabeçalhos de segurança em `next.config.ts`: CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`.
- `/painel` fora do sitemap e bloqueado no `robots.txt`.

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

O que muda:

| | Modo demonstração | Modo normal (com `DATABASE_URL`) |
| --- | --- | --- |
| Conta e sessão | localStorage do navegador | banco + cookie `httpOnly` com hash do token |
| Cardápio | localStorage | banco libSQL/SQLite |
| Quem enxerga o cardápio publicado | só o navegador que criou | qualquer pessoa com o link |
| SEO da página do restaurante | renderizada no cliente | HTML completo no servidor |
| Segurança | **nenhuma** — é uma simulação | senha com scrypt, sessão e checagem de dono |

Sinais visíveis: uma faixa “Modo demonstração” aparece no painel e nos cardápios, e
`GET /api/status` responde `database: "sem-configuracao"`.

`/r/sabor-e-brasa` continua funcionando como vitrine: o cardápio de exemplo vem embutido no
próprio bundle.

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
   [Turso](https://turso.tech) e configure em *Settings → Environment Variables*:

   ```env
   DATABASE_URL=libsql://seu-banco.turso.io
   DATABASE_AUTH_TOKEN=...
   NEXT_PUBLIC_SITE_URL=https://seudominio.com.br
   ```

3. **Crie as tabelas** (e, se quiser, o restaurante de demonstração) apontando o seed para o banco
   remoto, da sua máquina:

   ```bash
   DATABASE_URL=libsql://seu-banco.turso.io DATABASE_AUTH_TOKEN=... npm run db:seed
   ```

   O schema também é criado sozinho na primeira consulta; o seed serve para já ter conteúdo.
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
    (plataforma)/          landing, login, cadastro e páginas legais
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
    repositories/          consultas de usuários, sessões, negócios e cardápio
    auth/                  senha, sessão e guardas de acesso
    actions/               Server Actions (cadastro, negócio, cardápio)
scripts/seed.mjs           restaurante de demonstração
```

## O que já está pronto e o que não está

**Pronto**

- Cadastro, login, sessão e onboarding do negócio
- CRUD de categorias e itens, com reordenação de categorias e esgotar/reativar item
- Editor de complementos (escolha única/múltipla, obrigatório, limite, preço por opção)
- Publicar/despublicar, prévia, link e QR code gerado no servidor
- Cardápio público com busca, páginas de prato, carrinho por restaurante e checkout no WhatsApp
- Entrega por bairro, pedido mínimo, frete grátis, retirada, troco e chave Pix
- Landing page, páginas legais, SEO e cabeçalhos de segurança

**Ainda não**

- Upload de imagens (hoje: emoji ou URL de foto já hospedada)
- Domínio próprio por restaurante
- Cobrança dos planos (a página de planos é institucional; não há integração de pagamento)
- Mais de um negócio por conta e múltiplos usuários por negócio
- Histórico de pedidos dentro da plataforma — por definição, o pedido vive no WhatsApp
