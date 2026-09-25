# Mapa de migração — loja, item, sacola

> **Executado e superado em 2026-09-24.** Este mapa guiou a migração de 2026-09-22 para a anatomia do iFood e foi cumprido — `cart-drawer.tsx` e `opening-badge.tsx` já saíram. Em 2026-09-24 as telas do cliente foram refeitas na estrutura de app de delivery (referência: capturas do app da Glovo; decisões D25–D31 no `SKILL.md`), e boa parte do que vem abaixo deixou de descrever o código:
>
> - não existe `store-app-bar.tsx`: o `StoreHeader` virou botões flutuantes sobre a capa ("‹" + pílula com busca, compartilhar e sacola) e uma barra branca compacta que entra quando a identidade sai da tela;
> - o cabeçalho da loja é o `StoreIdentity`, na folha branca sob a `StoreCover`; o status é `store-status.tsx` + `use-opening-status.ts`;
> - as abas grudam em `top-(--top-inset)`; `--app-bar-height` e `--sticky-offset` sumiram, e o `rootMargin` do scroll-spy é medido;
> - o quick-add é um círculo branco sobre a foto que vira `Stepper size="sm" variant="floating"`, não um "+" solto numa coluna;
> - o prato volta pelo `useBackToMenu` (`router.back()` ou `router.replace`), não por `router.push(basePath)`; o toast tem a ação "Ver sacola";
> - a sacola é drawer de 440px no desktop, cada passo é uma camada no histórico (`nav-layers.ts`), e o bairro continua um `SelectField` (o `ListRow` + sheet de `RadioRow`s do ponto 13.6 não entrou);
> - a prévia usa a casca real (`StoreFrame embedded`) montada em `src/app/painel/previa/layout.tsx`, e não as composições manuais da seção 2;
> - não existem `use-scroll-spy.ts` nem `menu-search.tsx` (seção 6): o scroll-spy e os resultados da busca continuam no `MenuBrowser`, o campo mora na barra do topo (`StoreHeader`) e a busca também é uma camada no histórico (`openSearch`/`closeSearch`; o `setSearchOpen` da seção 3 não existe, e o `setStep` virou `goToStep`, que empilha ou desempilha camadas);
> - a página do prato (seção 10) perdeu a nota de pedido mínimo e entrega grátis — os dois ficam na identidade da loja, e o mínimo também no aviso da sacola — e ganhou `ItemClosedNote` ("Fechado agora · o pedido fica para quando abrir", só depois de hidratar); sem os relacionados, `item-detail.tsx` não importa mais o `ItemCard`, que serve o `MenuBrowser` e as vitrines da landing (`hero-demo`, `step-panel`);
> - a `DishImage` (seção 8) não é client nem devolve `null`: sem imagem, quem chama não a renderiza (testa `image.trim()`); o fade mora em `fade-image.tsx` (`FadeImage`, a mesma da capa), e as três fontes continuam as mesmas;
> - os grupos de opção são `<section role="group" aria-labelledby>` com título `h2`, não `<fieldset>`/`<legend>` (seção 11), e as linhas de opção moram em `option-row.tsx`;
> - a `CartBar` decide por `useStoreRoute()` (`view !== 'item'`) e, com a sacola aberta, continua montada, `invisible` e `inert` (seção 12);
> - a pasta `cart/` ganhou `cart-panel.tsx` (topo, passo e confirmação de limpar; a `cart-sheet.tsx` é só o `BottomSheet`), `delivery-quote-field.tsx` (o CEP da entrega por distância) e `order-mode-control.tsx` (seção 13);
> - o rodapé (seção 14) ficou só com o NAP — nome, `<address>`, WhatsApp e Instagram — e o atalho "Horários, entrega e contato" (`AboutButton`), sem `<h2>`: horários e entrega moram no `StoreAboutSheet`, o mesmo que o chevron "Sobre a loja" abre, e os horários continuam no JSON-LD;
> - a rota pública não tem `loading.tsx` (seção 17): `StoreSkeleton` e `ItemSkeleton` moram em `ui/skeleton.tsx` e só o demo os usa; entraram `not-found.tsx` (prato que não existe: `ItemMissing`) e `error.tsx` (`StoreMessage` + `reportError`).
>
> Para a anatomia atual, leia `screens-cliente.md`; para as premissas P1–P16, a especificação por tela e as fases do refactor, o plano em `~/.claude/plans/quero-que-analize-com-drifting-robin.md` (fora do repositório). Quando o plano e o código divergem, vale o código.
>
> Continua valendo daqui: a seção 1 (não tocar), as regras do checkout na seção 13 (ids e `autoComplete` dos campos, `validate()`, `form="checkout-form"`, totais, avisos), as fontes aceitas pela `DishImage`, o `resolveUrl` e o `navigator.share` do `share-button.tsx` e o relógio só depois da hidratação.

Arquivo a arquivo: o que **manter** verbatim (lógica, hooks, a11y, dados), o que **substituir** (apresentação) e o que muda de **estrutura**.

**Os números de linha referem-se ao commit `87aa474`** ("Fecha os vazamentos do checkout"). O código continuou evoluindo depois dele, então trate a linha como pista e o nome do símbolo como verdade: localize com `grep -n` antes de editar, e use `git show 87aa474:<caminho>` se precisar ver o trecho exatamente como foi mapeado.

Regra geral: quem decide *o que* acontece continua igual; só muda *como aparece*. Migre cada arquivo por inteiro numa edição e rode `node .claude/skills/ifood-design/scripts/audit-legacy.mjs <arquivo>` em seguida.

## Sumário
1. Não tocar
2. `store-frame.tsx`
3. `store-provider.tsx`
4. `store-header.tsx` → app bar + cabeçalho
5. `store-menu.tsx`
6. `menu-browser.tsx`
7. `item-card.tsx`
8. `dish-image.tsx`
9. `opening-badge.tsx` → hook + status
10. `item-detail.tsx`
11. `item-order-panel.tsx`
12. `cart-bar.tsx`
13. `cart-drawer.tsx` → pasta `cart/`
14. `store-footer.tsx`
15. `share-button.tsx`
16. `breadcrumbs.tsx`
17. Rotas de `src/app/r/[slug]`

## 0. Estado (2026-09-22) — histórico

Migrados no padrão da captura do app real: `item-detail.tsx` (+ `item-hero.tsx` novo, com a app bar que aparece ao rolar), `item-order-panel.tsx` (+ `option-group.tsx` novo), `item-card.tsx`, `store-header.tsx`, `cart-bar.tsx`, `dish-image.tsx` (prop `emojiSize`; sem emoji de fallback — quem chama decide não renderizar), `breadcrumbs.tsx`, o gatilho do `share-button.tsx` e as cores do `opening-badge.tsx`. `store-frame.tsx` e `preview-frame.tsx` ganharam `ToastProvider` e `HideOnItem` (cabeçalho e rodapé da loja somem na página do item). Faltam: `menu-browser.tsx` (busca/tabs), `store-menu.tsx`, `store-footer.tsx`, `share-button.tsx` (o sheet), `cart-drawer.tsx` (fase 4).

## 1. Não tocar

`src/lib/cart-store.ts` (chaves `menuqr.cart.<businessId>`, `menuqr.customer`, `menuqr.demo.v1`, `signatureOf`, formato de `CartLine`), `src/lib/whatsapp.ts` (a mensagem é regra de negócio, emojis inclusos), `src/lib/hours.ts`, `src/lib/seo.ts`, `src/lib/share-link.ts`, `src/components/store/use-share-url.ts`, server actions, repositórios, schema e `src/lib/types.ts`. A URL do WhatsApp gerada para as mesmas entradas tem que sair byte a byte igual antes e depois.

## 2. `store-frame.tsx`

- **Manter**: `StoreProvider` envolvendo tudo, `<main id="conteudo">`, o slot `notice`, a ordem de composição e o comentário que explica por que banco e demo usam a mesma casca.
- **Substituir**: apagar `brandStyle()` (linhas 14-21), o `style` da raiz (linha 43) e o import de `@/lib/colors`. Raiz `bg-white`. Entram `<StoreAppBar />` antes do `main`, `<ToastProvider>` por dentro do provider e `<CartSheet />` no lugar de `<CartDrawer />`. O `notice` vira um `Banner tone="info"` fino entre a app bar e o conteúdo.
- **Estrutura**: nova prop `embedded?: boolean` — sem `min-h-dvh`, app bar `static`, sem barra da sacola, moldura `rounded-lg border border-gray-200 overflow-hidden`. Com ela, troque as duas composições manuais da prévia (`src/app/painel/previa/page.tsx` linhas 50-60 e `src/components/demo/demo-pages.tsx` linhas 350-360) por `<StoreFrame business={…} menu={…} embedded><StoreMenu … floatingCart={false} /></StoreFrame>`. Isso elimina os dois últimos importadores de `brandStyle` e a divergência do terceiro caminho de renderização.

## 3. `store-provider.tsx`

- **Manter tudo**: o contexto, o `useSyncExternalStore`, a trava de rolagem (linhas 67-75), `openCart`/`closeCart`/`setStep`, o tipo `CheckoutStep`.
- **Único acréscimo**: `searchOpen` e `setSearchOpen` (o gatilho fica na app bar; o campo, no `MenuBrowser`).
- A trava de rolagem já vive aqui: passe `lockScroll={false}` para o `BottomSheet` da sacola. Nunca os dois.

## 4. `store-header.tsx` → `store-app-bar.tsx` + `store-header.tsx`

- **`store-app-bar.tsx`** (client, renderizado pelo frame): `useStore()` para `itemCount` e `openCart`; `useShareUrl(business, menu)` e o texto de compartilhar das linhas 41-45 (os links do demo carregam o cardápio inteiro no hash — ver `use-share-url.ts` linhas 17-24); o texto `sr-only` "Abrir sacola com N itens" (linhas 50-52) vira o `label` do `IconButton`. Estado `compact` vindo de um `IntersectionObserver` sobre uma sentinela que o cabeçalho renderiza; o ref é lido dentro do efeito. Em rotas `/item/`, no `lg`, entra um `IconButton` de voltar (`Link` para `/r/${slug}`).
- **`store-header.tsx`** (server-safe, renderizado pelo `StoreMenu`): o cabeçalho descrito em `screens-cliente.md` seção 1. A zona mais barata sai de `zones.reduce` por `fee`.
- O teste "logo é imagem" (regex da linha 15) muda para `isImageUrl()` em `src/lib/media.ts`, reaproveitado por `dish-image`, `item-card` e `category-manager.tsx` (linha 159).
- Some: `backdrop-blur`, o botão escuro com subtotal, o tile quadrado com a cor da marca.

## 5. `store-menu.tsx`

- **Manter**: o `<h1>` `sr-only` (linha 26 — um `h1` por página), `toCardCategory`, a lógica de `floatingCart` para o respiro inferior.
- **Substituir**: `container-page` por `Container size="store"`; renderizar `<StoreHeader business={business} />` acima do `MenuBrowser`; estado vazio com `EmptyState`.

## 6. `menu-browser.tsx`

- **Manter verbatim**: `normalize()` (linhas 8-13); o efeito de `?busca=` com o `eslint-disable-next-line react-hooks/set-state-in-effect` (linhas 34-40); o memo `results` (linhas 44-58); o scroll-spy com a guarda `isScrollingTo` (linhas 61-81); `goToCategory` com a trava de 700ms (linhas 89-98); os ids `cat-${slug}` (usados por `item-detail.tsx` linha 76 e pelo `scroll-margin` global); `aria-live="polite"` nos resultados; `priority={index === 0 && itemIndex < 2}`.
- **Substituir**: o bloco sticky (linhas 103-154) — agora só as `Tabs` ficam sticky em `top-(--app-bar-height)`, e a `SearchBar` aparece no lugar delas quando `searchOpen`. O auto-centro das tabs (linhas 84-87) passa a ser responsabilidade do primitivo `Tabs`. Cabeçalho de seção (linhas 176-187) sem a contagem de itens (linhas 181-183); o emoji da categoria continua no título, fora das tabs. `scroll-mt-40` (linha 175) vira `scroll-mt-(--sticky-offset)`.
- **Atenção à tríade de offsets**: `[id] { scroll-margin-top }` no CSS, o `scroll-mt` da seção e o `rootMargin: '-180px 0px -65% 0px'` do observer (linha 76) precisam mudar juntos para 56 + 48 + 8px. Meça o elemento sticky dentro do efeito em vez de fixar o número.
- **Estrutura**: extrair `use-scroll-spy.ts` (observer + `goToCategory`) e `menu-search.tsx`; o `MenuBrowser` fica como orquestrador, por volta de 110 linhas.

## 7. `item-card.tsx`

- **Feito** (revisto em 2026-09-22). O "+" saiu de cima da foto e virou um glifo solto numa coluna própria na borda direita, como na página de item do app — ver `screens-cliente.md` seção 3. Ficou o feedback "✓ por 1,4s" (o stepper inline é evolução opcional). Item sem imagem vira linha só de texto e a coluna do "+" continua no mesmo lugar.
- **Manter**: o `<li>`; o `Link` cobrindo a linha (linhas 28 e 40-44); `aria-disabled={!item.available}`; `priority`; `DishImage` com `alt={item.imageAlt || item.name}` e `sizes="96px"`; `formatPrice`; a decisão `canQuickAdd = item.available && !item.hasRequiredOptions` (linha 29); o botão de quick-add como irmão do `Link`, fora dele; a coluna de ação em `w-11` com o stepper em pé, sem a qual a foto escorrega quando o "+" vira stepper; o rótulo "Adicionar {nome} à sacola" no `aria-label`.
- **Substituir**: o visual, conforme `screens-cliente.md` seção 3. O feedback "✓ por 1,4s" (linhas 24-36) evolui para o `Stepper` inline: a quantidade vem da linha da sacola que o próprio quick-add cria — `addItem(item.id, 1, {}, '')` gera a assinatura `itemId||`, então a linha é `cart.find((line) => line.itemId === item.id && Object.keys(line.selections).length === 0 && line.notes.trim() === '')`. Novos toques caem na mesma linha (o store junta assinaturas iguais); `onChange` chama `setQuantity(line.uid, n)` e `onRemove` chama `setQuantity(line.uid, 0)`. Linhas do mesmo item com opções ou observação não contam aqui. Tags `flame` viram `Tag`. "+ opções" (linha 72) vira o helper "personalizável".
- Continua `'use client'` (usa `useStore`). Importadores: `menu-browser.tsx` e `item-detail.tsx`.

## 8. `dish-image.tsx`

- **Manter**: a regra das três fontes — caminho local → `next/image` com `fill`, `sizes` e `priority`; `http(s)` → `<img>` com `loading`, `decoding`, `referrerPolicy` e o `eslint-disable` de `no-img-element` (o `next.config.ts` tem `remotePatterns: []`); qualquer outra coisa → emoji.
- **Substituir**: fundo `bg-gray-100`; emoji centralizado em `text-3xl` (a prop `emojiClassName` some); fade da imagem no `onLoad` (`transition-opacity duration-200`). Valor vazio: devolve `null` para a linha virar só texto — quem chama não precisa mais decidir.
- Vira `'use client'` por causa do `onLoad`; é folha, então não contamina os pais.

## 9. `opening-badge.tsx` → `use-opening-status.ts` + `opening-status.tsx`

O arquivo está **sem importadores** desde que o bloco de apresentação saiu do topo do cardápio, mas o padrão dele é obrigatório: páginas da loja são ISR (`revalidate = 300`), então o relógio nunca pode ser lido no servidor nem no primeiro render do cliente.

- **Manter**: o efeito pós-hidratação com intervalo de 60s (linhas 15-23), agora como `useOpeningStatus(hours): OpeningStatus | null`, devolvendo `null` no primeiro render.
- **Novo** `opening-status.tsx`: monta "Aberto • Fecha às 23:00" ou "Fechado • Abre às 18:00" com `status.closesAt`, `nextTime`, `daysAhead`, `nextDay` e `DAY_NAMES`. `describeNextOpening` (`hours.ts` linhas 76-82) fica intocado — é usado no aviso do WhatsApp. `null` renderiza `Skeleton`.
- Consumidores: cabeçalho da loja, página do item (desabilitar "Adicionar" quando fechado e `!acceptOrdersWhenClosed`), quick-add, sacola. Apague o arquivo antigo na fase 7.

## 10. `item-detail.tsx` (server component)

- **Manter**: `Breadcrumbs` (linhas 31-37) — visível em `lg`, `sr-only` no celular; o `<h1>` com o nome (linha 80); `DishImage priority`; os fatos (linhas 50-71) como uma linha compacta; a nota de pedido mínimo e entrega grátis (linhas 103-110); `<ItemOrderPanel item={item} />`.
- **Remover**: o bloco de relacionados (linhas 26 e 114-125).
- **Substituir**: layout de `screens-cliente.md` seção 4; `sizes="(max-width: 1024px) 100vw, 640px"`.
- Cuidado com a fronteira server/client: primitivo com `'use client'` pode ser importado aqui, mas o `npm run build` é quem confirma.

## 11. `item-order-panel.tsx`

- **Manter**: `addItem(item.id, quantity, selections, notes)` (linha 51); `toggleMulti` com o limite (linhas 29-38); `handleAdd` e sua mensagem (linhas 40-53) como rede de segurança; `unitPrice` via `calculateUnitPrice` (linha 27); `<fieldset>`/`<legend>` por grupo; `name={`${item.id}-${group.id}`}` (linha 100); `disabled={isMulti && limitReached && !checked}` (linha 103); o id `notes-${item.id}`; o limite 1..99 (linhas 150 e 161); o ramo de item indisponível (linhas 55-64), agora em `Banner tone="neutral"`.
- **Mudar**: o estado inicial (linhas 16-25) deixa de pré-selecionar a primeira opção de grupo obrigatório — sobra só `multi: []`. Depois de `addItem`, `router.push(basePath)` + `toast('Adicionado à sacola')` no lugar de `openCart('cart')` (linha 52).
- **Substituir**: visual de `screens-cliente.md` seção 4; o stepper duplicado (linhas 147-167) pelo primitivo; a barra fixa por `StickyBottomBar`.
- **Estrutura**: extrair `option-group.tsx`; o painel fica com o estado e os handlers.

## 12. `cart-bar.tsx`

- **Manter**: a guarda `itemCount === 0 || isOpen || pathname.includes('/item/')` (linha 16) e `openCart('cart')`.
- **Substituir**: a pílula flutuante na cor da marca pela `CartBar` de `components.md`.

## 13. `cart-drawer.tsx` (765 linhas) → `src/components/store/cart/`

| Arquivo novo | Conteúdo | Tamanho |
|---|---|---|
| `cart-sheet.tsx` | casca: `BottomSheet`, app bar, troca de passo | ~80 |
| `use-checkout.ts` | estado e regras do checkout | ~130 |
| `bag-step.tsx` | passo `cart` | ~150 |
| `checkout-step.tsx` | passo `checkout` | ~250 |
| `done-step.tsx` | passo `done` | ~50 |
| `cart-line.tsx` | linha de item | ~60 |
| `cart-notices.tsx` | avisos em `Banner` | ~70 |

Pontos que pegam:

1. **Relógio**. O `if (!isOpen) return null` (linha 65) vem antes de `getOpeningStatus(business.hours)` (linha 73). Ler o relógio ali só é seguro porque a gaveta nunca renderiza no servidor. Preserve o invariante: o sheet é client-only e desmontado quando fechado; calcule `opening` uma vez na casca e passe para os passos (ou use `useOpeningStatus`, tratando `null` como "não bloqueia").
2. **Para `use-checkout.ts`**, sem reescrever: `errors` e `warning`; `goToStep` (linhas 58-63, limpa os dois); `belowMinimum` (67-68); `outOfArea` (70); `closedForOrders` (76); `validate()` (78-94, mensagens verbatim); `submitOrder()` (96-135); `set` (137). Desde 2026-09-24 o `goToStep` vem do `StoreProvider` (o passo é derivado do histórico) e a limpeza de `errors`/`warning` é um ajuste de estado durante o render, porque o passo também muda pelo voltar do sistema.
3. **Ordem de `submitOrder`** (como está no código em 2026-09-24): reconferir o horário na hora do clique → `buildOrderMessage` → `whatsappUrl` → `setLastOrderUrl` → `clearCart()` → `goToStep('done')` → `window.open(url, '_blank')` (e `location.assign(url)` se o pop-up for bloqueado). Tudo é gravado **antes** de abrir o link, porque o desvio navega a própria aba e há navegador embutido que carrega o `window.open` nela mesma. Não reordene.
4. **Ids e atributos dos campos** ficam idênticos: `cart-name`, `cart-phone`, `cart-zone`, `cart-other-district`, `cart-street`, `cart-number`, `cart-complement`, `cart-reference`, `cart-notes`, `cart-postal-code` (o CEP da entrega por distância) e o `checkout-form` do formulário; os `autoComplete`; o `inputMode`; `maskPhone`/`onlyDigits` no telefone (linhas 365-366). É o que mantém o preenchimento automático do navegador. Não existe forma de pagamento no produto: `cart-payment` e `cart-change` saíram em 2026-09-22 (commit `4fc568b`) — o pagamento é combinado entre cliente e restaurante na conversa.
5. **Formulário**: o `<form onSubmit>` (linhas 309-315) envolve os campos, mas o botão mora no rodapé (linhas 584-596). Dê `id="checkout-form"` ao form e `form="checkout-form"` ao botão, para Enter e clique seguirem o mesmo caminho.
6. **Bairro**: o `<select>` (linhas 375-390) viraria `ListRow` + `BottomSheet` de `RadioRow`s, incluindo a opção `OUT_OF_AREA_ZONE` — não entrou: continua `SelectField` (`appearance="soft"` desde 2026-09-24); o bloco de fora de área (linhas 393-424) continua, com "Prefiro retirar no local". O pagamento não passa pelo sistema: é combinado entre cliente e restaurante na conversa, e não existe campo para ele no checkout.
7. **Totais**: os ternários das linhas 546-575 ("a combinar", "a calcular", "Grátis", "+ entrega") mantêm a lógica; "Grátis" em `text-positive`.
8. **Avisos**: `ClosedNotice` e `ReviewNotice` (linhas 645-705) viram `Banner` com o mesmo texto e os mesmos laços sobre `review.soldOut`, `removed` e `repriced`.
9. **Cabeçalho** (linhas 154-176): `AppBar` com `titleId` de `useId`, mantendo o `aria-labelledby` (linhas 44, 151, 165). Títulos: "Sacola", "Finalizar pedido", "Pedido enviado". O "Esvaziar carrinho" do rodapé (linhas 295-301) vira "Limpar" no topo, com confirmação. Em 2026-09-24 o topo virou o "‹" flutuante (`IconButton raised lg`) com o título do passo ao centro, e o "Limpar" virou a lixeira `tonal` "Limpar sacola" ao lado do título "Sua sacola", com `ConfirmDialog appearance="store"`.
10. **Linhas** (203-259): `CartLine` com `describeSelections`, a observação, `Stepper` com `onRemove={() => setQuantity(uid, 0)}` — o store já remove na quantidade zero (`cart-store.ts` linhas 226-232).
11. **Casca**: o efeito de Esc e foco (linhas 47-56) e o scrim com clique (linhas 140-153) somem: o `BottomSheet` faz isso e ainda devolve o foco ao ícone da sacola.
12. **Entrega × retirada**: `ModeButton` (linhas 320-338 e 707-721) vira `SegmentedControl`. Observação opcional, por ser mudança de comportamento: `emptyCustomer.mode` é `'delivery'` (`cart-store.ts` linha 8) mesmo quando o negócio só tem retirada.

## 14. `store-footer.tsx`

- **Manter**: todos os dados e a semântica — `<address>`, `tel:` via `toE164`, `mailto:`, a lista de `getWeeklyHours`, as zonas com `freeAbove`, a linha de retirada, os links de crédito da plataforma, os `<h2>`. O NAP visível é parte do SEO local.
- **Substituir**: o card de três colunas pela seção "Informações da loja" sobre `bg-gray-50`, em blocos "Endereço", "Horário de funcionamento" e "Entrega".

## 15. `share-button.tsx`

- **Manter**: `resolveUrl` preservando o hash (linhas 78-87 — no demo é ele que carrega o cardápio); `navigator.share` com o tratamento de `AbortError` (89-104); `copy` com o fallback de seleção (106-115); os `href` de `TARGETS` (14-37); a prop `variant: 'icon' | 'button'` (o painel usa `"button"`); o input `#share-url` somente leitura que seleciona ao focar.
- **Substituir**: o gatilho por `IconButton`/`Button variant="secondary"`; o diálogo com portal (linhas 64-72 e 137-208) por `BottomSheet title="Compartilhar"`; os emojis dos alvos por ícones (`MessageCircle`, `Send`, `Mail` e um SVG próprio para o Facebook — o Lucide 1.x não tem marcas); "Copiado!" por troca de ícone `Copy` → `Check` no botão (o toast ficaria atrás do dialog).

## 16. `breadcrumbs.tsx`

- **Manter**: `nav aria-label`, `aria-current="page"`, os `Link`s. Também é usado em termos e privacidade.
- **Substituir**: `text-caption text-gray-600`, separador `ChevronRight` de 12px, último item `text-gray-700 font-medium`.

## 17. Rotas de `src/app/r/[slug]`

- `layout.tsx`, `page.tsx`, `item/[item]/page.tsx`: sem mudança se `StoreFrame`, `StoreMenu` e `ItemDetail` mantiverem os nomes das props (mantêm). `JsonLd` e metadata intocados.
- Novo `loading.tsx` com `StoreSkeleton`; o `StoreLoading` do demo (`demo-store.tsx` linhas 15-17) usa o mesmo.
- `manifest.webmanifest/route.ts`: `background_color` para `#ffffff` (linha 36); `theme_color` continua a cor da marca.
- `opengraph-image.tsx`: o logo (linha 42) mostra o emoji quando for emoji, senão as iniciais com `readableTextColor`; o fundo na cor da marca continua.
