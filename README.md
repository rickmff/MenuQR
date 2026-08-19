# Cardápio digital com delivery e pedido pelo WhatsApp

Site institucional e cardápio online de restaurante, feito em **Next.js 16 (App Router)** com
foco em SEO técnico, acessibilidade e performance. O cliente monta o pedido no site, informa
endereço e telefone, e a **finalização acontece no WhatsApp do restaurante** — com a mensagem
do pedido já pronta.

Não há back-end, banco de dados nem cadastro: todas as páginas são geradas estaticamente no
build, o que deixa o site rápido, barato de hospedar e fácil de rastrear pelo Google.

---

## Índice

- [Como funciona o pedido](#como-funciona-o-pedido)
- [O que está implementado](#o-que-está-implementado)
- [Rodando o projeto](#rodando-o-projeto)
- [Configuração do restaurante](#configuração-do-restaurante)
- [SEO: o que já vem pronto](#seo-o-que-já-vem-pronto)
- [Checklist depois de publicar](#checklist-depois-de-publicar)
- [Publicação](#publicação)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Decisões técnicas](#decisões-técnicas)

---

## Como funciona o pedido

1. O cliente navega pelo cardápio (páginas próprias por categoria e por prato).
2. Escolhe complementos — ponto da carne, adicionais, tamanho — e a quantidade.
3. Abre o carrinho e informa **nome, WhatsApp, endereço e forma de pagamento**.
4. Ao tocar em **“Enviar pedido pelo WhatsApp”**, abrimos a conversa com o restaurante
   com o pedido escrito. O cliente só aperta enviar.

A mensagem que chega para o restaurante:

```
*NOVO PEDIDO — Sabor & Brasa*
Pedido #1908-1931 · 19/08/2026 às 19:31

*🧾 Itens*
1x Costela BBQ — R$ 38,90

*💰 Valores*
Subtotal: R$ 38,90
Entrega: R$ 5,00
*Total: R$ 43,90*

*👤 Cliente*
Nome: Maria Souza
WhatsApp: (11) 98765-4321

*🛵 Entrega*
Endereço: Rua das Acácias, 250 — Apto 12
Bairro: Centro
Previsão: 30-45 min

*💳 Pagamento*
Dinheiro
Troco para R$ 100,00 (levar R$ 56,10)
```

## O que está implementado

**Loja**

- Cardápio por categorias, com busca por nome, descrição, categoria e etiquetas.
- Página própria para cada prato, com foto, descrição, calorias, alérgenos e restrições.
- Complementos com escolha única (obrigatória) e múltipla escolha com limite.
- Carrinho persistente no navegador e **sincronizado entre abas**.
- Entrega com taxa e prazo por bairro, pedido mínimo e frete grátis automático.
- Retirada no local como alternativa à entrega.
- Formas de pagamento configuráveis, cálculo de troco e envio da chave Pix.
- Horário de funcionamento com aviso de aberto/fechado — inclusive faixas que
  passam da meia-noite — e opção de aceitar pedidos agendados fora do horário.

**Institucional**

- Home comercial, `sobre`, `entrega`, `contato`, `perguntas-frequentes`,
  `política de privacidade` (LGPD) e `termos de uso`.
- Página 404 personalizada e barreira de erro com opção de recarregar.

## Rodando o projeto

Requisitos: Node.js 20.9 ou superior.

```bash
npm install
cp .env.example .env.local   # ajuste a URL do site
npm run dev                  # http://localhost:3000
```

Scripts disponíveis:

| Comando             | O que faz                                        |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Ambiente de desenvolvimento                      |
| `npm run build`     | Build de produção (gera todas as páginas)        |
| `npm start`         | Servidor de produção                             |
| `npm run lint`      | ESLint com as regras do Next e do React          |
| `npm run typecheck` | Checagem de tipos do TypeScript                  |

## Configuração do restaurante

Tudo o que muda de restaurante para restaurante está em dois arquivos:

### 1. `src/lib/restaurant.ts` — dados da empresa

O campo mais importante é o **WhatsApp que recebe os pedidos**:

```ts
whatsapp: '5511987654321',  // 55 (país) + DDD + número, apenas dígitos
```

Também ficam aqui: nome e razão social, endereço completo com coordenadas
(usadas no schema.org e no link do mapa), horário de funcionamento, bairros
atendidos com taxa e prazo, pedido mínimo, frete grátis, formas de pagamento,
chave Pix e redes sociais.

### 2. `src/lib/menu.ts` — o cardápio

```ts
{
  id: 'brasa-classic',
  slug: 'brasa-classic',              // vira a URL /cardapio/hamburgueres/brasa-classic
  name: 'Brasa Classic',
  description: 'Pão brioche, 160 g de blend bovino…',
  price: 29.9,
  image: '🍔',                         // emoji ou caminho de uma foto em /public
  imageAlt: 'Hambúrguer com queijo prato, alface e tomate',
  tags: ['Mais vendido'],
  available: true,                     // false esgota o item, mantendo a página no ar
  calories: 720,
  allergens: ['Glúten', 'Leite', 'Ovo'],
  suitableForDiet: ['VegetarianDiet'],
  options: [
    {
      id: 'ponto', name: 'Ponto da carne', type: 'single', required: true,
      choices: [{ id: 'mal', name: 'Mal passada', price: 0 }],
    },
    {
      id: 'adicionais', name: 'Adicionais', type: 'multi', max: 4,
      choices: [{ id: 'bacon', name: 'Bacon crocante', price: 5 }],
    },
  ],
}
```

**Fotos dos pratos:** os emojis são só um ponto de partida. Coloque as fotos em
`public/` (por exemplo `public/pratos/brasa-classic.jpg`) e troque o campo
`image` por `/pratos/brasa-classic.jpg`. O componente já usa `next/image`, com
formatos AVIF/WebP e `alt` obrigatório. Fotos reais melhoram conversão e a
aparência do site nos resultados de busca.

Alterou o cardápio? Rode `npm run build` e publique — as páginas novas entram
no sitemap automaticamente.

### 3. Variáveis de ambiente

```env
NEXT_PUBLIC_SITE_URL=https://www.seurestaurante.com.br
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=  # opcional, do Search Console
```

`NEXT_PUBLIC_SITE_URL` é a base de canonical, sitemap, robots e Open Graph:
defina antes do build de produção, sem barra no final.

## SEO: o que já vem pronto

**Indexação e rastreamento**

- Todas as páginas são estáticas e o conteúdo do cardápio vem no HTML — o Google
  não depende de JavaScript para ler os pratos e preços.
- `sitemap.xml` gerado a partir dos dados, com prioridade e frequência por tipo de página.
- `robots.txt` com o sitemap declarado e bloqueio de URLs de busca e parâmetros de campanha.
- URL canônica em todas as páginas e redirecionamentos 308 de URLs antigas (`/menu`, `/delivery`).
- Página 404 real, marcada como `noindex`.

**Metadados**

- Títulos únicos (33–65 caracteres) e descrições únicas (até ~155 caracteres) por página.
- Open Graph e Twitter Card em todas as rotas, com imagem 1200×630 gerada no build
  (`src/app/opengraph-image.tsx`).
- `lang="pt-BR"`, `metadataBase`, `theme-color` e `manifest.webmanifest` (PWA instalável).

**Dados estruturados (schema.org / JSON-LD)**

| Tipo | Onde |
| --- | --- |
| `Organization`, `Restaurant`, `WebSite` + `SearchAction` | todas as páginas |
| `Menu` com `MenuSection` e `MenuItem` (preço, disponibilidade, dieta, calorias) | `/cardapio` |
| `MenuSection` | páginas de categoria |
| `MenuItem` com `Offer` | páginas de prato |
| `BreadcrumbList` | todas as páginas internas |
| `FAQPage` | home e perguntas frequentes |

O `Restaurant` traz NAP completo, `geo`, `openingHoursSpecification`,
`servesCuisine`, `paymentAccepted`, `areaServed` e uma `OrderAction` — a base do
resultado rico de negócio local.

> **Sobre avaliações:** não incluímos `AggregateRating` nem `Review` fictícios de
> propósito. Marcar avaliações que a própria empresa escreve viola as diretrizes
> do Google e pode gerar penalização manual. Use as avaliações reais do Google
> Business Profile.

**Acessibilidade e experiência (fatores de ranqueamento)**

- Estrutura semântica com um `<h1>` por página, landmarks e `skip link`.
- Contraste verificado em AA (WCAG 2.2) em todos os pares de cor do tema.
- Formulários com `label`, `aria-describedby`, mensagens de erro em `role="alert"`
  e foco visível em todos os elementos interativos.
- Diálogo do carrinho com `role="dialog"`, `aria-modal`, fechamento por `Esc` e foco gerenciado.
- Respeito a `prefers-reduced-motion`.

**Performance**

- Fontes servidas pelo próprio domínio via `next/font` (sem requisição ao Google Fonts),
  com `display: swap` — evita CLS.
- Imagens otimizadas por `next/image` (AVIF/WebP), com `priority` só no que aparece primeiro.
- Componentes de cliente recebem apenas os campos que usam, reduzindo o payload enviado ao navegador.
- Cabeçalhos de segurança (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`) configurados em `next.config.ts`.

## Checklist depois de publicar

1. **Domínio e HTTPS** — publique com certificado válido e escolha uma versão canônica
   (com ou sem `www`), redirecionando a outra.
2. **`NEXT_PUBLIC_SITE_URL`** — configure a URL real no ambiente de produção e faça um novo build.
3. **Google Search Console** — cadastre a propriedade, valide (pode usar
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`) e envie `https://seusite.com.br/sitemap.xml`.
4. **Google Business Profile** — cadastre o restaurante com **exatamente** o mesmo
   nome, endereço e telefone do site. É o que mais pesa no SEO local.
5. **Teste de Resultados Ricos** — valide a home, uma categoria e um prato em
   <https://search.google.com/test/rich-results>.
6. **PageSpeed Insights** — rode em <https://pagespeed.web.dev> e confira os Core Web Vitals.
7. **Fotos reais** dos pratos e da fachada, com `alt` descritivo.
8. **Revise os textos legais** — política de privacidade e termos de uso trazem a
   estrutura correta, mas precisam ser conferidos por quem responde pela empresa.
9. **Bebida alcoólica** — se o cardápio tiver bebidas alcoólicas, mantenha o aviso
   de venda proibida para menores de 18 anos.

## Publicação

O projeto roda em qualquer hospedagem que suporte Next.js:

```bash
npm run build
npm start
```

- **Vercel:** conecte o repositório, defina `NEXT_PUBLIC_SITE_URL` nas variáveis de
  ambiente e o deploy é automático a cada push.
- **Outro servidor Node:** `npm run build && npm start` atrás de um proxy reverso
  (Nginx/Caddy) com HTTPS.
- **Docker / Cloud Run / Amplify:** funciona sem ajustes, desde que o Node seja 20.9+.

## Estrutura de pastas

```
src/
  app/
    layout.tsx                          metadados globais, fontes, JSON-LD do negócio
    page.tsx                            home comercial
    cardapio/page.tsx                   cardápio completo com busca
    cardapio/[categoria]/page.tsx       página por categoria (estática)
    cardapio/[categoria]/[item]/        página por prato (estática)
    sobre|entrega|contato|…             páginas institucionais e legais
    sitemap.ts robots.ts manifest.ts    arquivos de SEO gerados
    opengraph-image.tsx                 imagem de compartilhamento
    error.tsx not-found.tsx             tratamento de erro e 404
  components/                           header, footer, carrinho, cartões, JSON-LD
  lib/
    restaurant.ts                       dados da empresa
    menu.ts                             cardápio
    cart-store.ts                       carrinho (localStorage + sincronia entre abas)
    whatsapp.ts                         montagem da mensagem do pedido
    seo.ts                              metadados e schema.org
    hours.ts format.ts                  horários, moeda e telefone
```

## Decisões técnicas

- **Estático por padrão.** Nenhuma página usa renderização dinâmica; o build gera
  HTML para todas as rotas, o que dá o melhor TTFB possível e facilita o rastreamento.
- **Aberto/fechado no cliente.** O status de funcionamento depende do horário de
  quem acessa, então é calculado após a hidratação — assim o HTML em cache nunca
  mostra “aberto” fora de hora.
- **Carrinho em store externo.** `useSyncExternalStore` com snapshot de servidor
  vazio: sem divergência de hidratação, com persistência em `localStorage` e
  sincronia entre abas.
- **Sem rastreadores de terceiros.** Nada de cookies de publicidade ou analytics
  externo por padrão — menos JavaScript, menos aviso de consentimento e menos
  exposição de dados. Se precisar de analytics, prefira uma solução sem cookies.
