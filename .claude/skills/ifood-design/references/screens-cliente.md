# Telas do cliente — loja, item, sacola, finalizar, enviado

Anatomia de app de delivery aplicada ao fluxo do Menu Online. **Desde 2026-09-24 a referência de estrutura e interação é o app da Glovo** (capturas analisadas no plano aprovado nesse dia, `~/.claude/plans/quero-que-analize-com-drifting-robin.md`, decisões P1–P16), com o fluxo de entrega trocado pela mensagem no WhatsApp. Isso substitui a anatomia do iFood que este arquivo descrevia até então (foto de 88px, divisor fino, "+" solto numa coluna, faixa cinza sticky nos grupos, sacola em dialog centrado no desktop). A pele continua a do WhatsApp (D17, `whatsapp-familiarity.md`); os primitivos estão em `components.md` e os textos em `copy.md`.

**O código é a fonte de verdade.** Classes e medidas abaixo foram lidas de `src/components/store/**`, `src/components/ui/**` e `src/app/globals.css` em 2026-09-24. Se divergirem daqui, vale o código — e este arquivo deve ser corrigido.

Decisões do dono em 2026-09-24:

- a cor continua o verde do WhatsApp (`primary`; `brand` só no CTA final) — nada do teal da Glovo;
- Figtree (`font-display`) nos títulos grandes da loja; Inter no resto;
- **pílula em todo botão das telas do cliente**, com a borda grafite dos botões verdes (D22); o painel continua com o raio por papel;
- capa real (`business_covers`) e View Transitions entraram nesta entrega;
- "Pedir de novo" e "Você também pode gostar" ficaram para depois;
- o painel não mudou: os primitivos só ganharam props novas, com o default igual ao de antes.

## Sumário

1. Loja / cardápio
2. Busca no cardápio
3. Linha de item e os 4 estados da ação
4. Página do item
5. Sacola
6. Finalizar pedido
7. Pedido enviado
8. Estados
9. Desktop (`lg:`)
10. Navegação: camadas no histórico e o item como rota
11. Prévia do painel e vitrines da landing

## Escala e regras de todas as telas

| Papel                                                                                  | Classe                                                              | px      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- |
| Nome da loja, título do item                                                           | `font-display text-h4 font-bold text-gray-900` (loja: `lg:text-h3`) | 28 (32) |
| Seção do cardápio, grupo de opções, "Sua sacola", "Pedido enviado!", estado vazio hero | `font-display text-h5 font-bold text-gray-900`                      | 24      |
| Seções do Finalizar, título de sheet                                                   | `font-display text-h6 font-bold text-gray-900`                      | 20      |
| Preço do item, totais das barras e do resumo                                           | `text-h6 font-bold tabular-nums`                                    | 20      |
| Nome de item na lista e na sacola                                                      | `text-subtitle font-semibold text-gray-700`                         | 18      |
| Corpo, opção, InfoCell, rótulo do CTA                                                  | `text-body1`                                                        | 16      |
| Descrição, helper, resumo do Finalizar                                                 | `text-body2 text-gray-600`                                          | 14      |
| Selo "Obrigatório", contador, legenda, hint "Indisponível" do segmented                | `text-caption`                                                      | 12      |
| Tag de item (`Tag` sm), selo "Indisponível" sobre a foto                               | `text-[10px] font-bold`                                             | 10      |

- Título `gray-900`, corpo `gray-700`, secundário `gray-600`. Verde só no CTA, no badge, no controle marcado, no check do grupo escolhido, no círculo do "Pedido enviado!", em "Grátis", em "Aberto até …", no `Tag promo` e no texto verde de botões e links — `Button variant="text"` ("Horários, entrega e contato", o "Cancelar" do "Limpar sacola?", o "Trocar" do CEP) e, com `text-primary` direto, o "Cancelar" da busca e o link do WhatsApp no "Sobre a loja".
- Botão de ação é pílula (`Button size="cta" pill`: 48 de altura, rótulo 16); botão de ícone é círculo (`IconButton`, `lg` = 44); foto de lista `rounded-lg` (16); miniatura e campo `rounded-md` (12); folha da loja `rounded-t-xl` (24).
- Sem divisor fino nas listas de item e de opção: a separação é o `py-4`. Divisor só onde o chrome encontra o conteúdo (barra compacta, tabs, rodapé), entre as seções do "Sobre a loja" e sobre os botões do "Limpar sacola?" (o `footer` do `BottomSheet` tem `border-t`).
- Alvo de toque ≥ 44: círculos de 32 levam `hit-44`; o segmented leva `hit-y-44`.
- Movimento em CSS puro, ≤ 300 ms, com `prefers-reduced-motion` (regra global); JS que rola ou vibra consulta `prefersReducedMotion()`.

## 1. Loja / cardápio — `/r/[slug]`

A casca (`StoreFrame`) vive no **layout** da rota: topo, `main`, rodapé, `CartBar`, sacola, "Sobre a loja" e o `ToastProvider` sobrevivem à troca entre cardápio e item. O miolo é o `StoreMenu`, o mesmo no cardápio do banco, no demo e na prévia. De cima para baixo:

1. **Capa** (`StoreCover`): `h-60 lg:h-80 w-full`, de borda a borda, sem raio, `[overflow-anchor:none]`. É a foto enviada na aba Identidade (campo "Capa do cardápio", tabela `business_covers`), com `priority` e `sizes="100vw"` — é o LCP. Sem foto, `cover-fallback`: o papel de parede `chat-bg` com o rabisco, **parado**. Nada de texto sobre a capa: o nome fica na folha branca, legível com qualquer foto (P8).
2. **Botões flutuantes** (`StoreHeader`, `layout="floating"`): `header[data-store-top-bar]` `pointer-events-none fixed inset-x-0 top-0 z-50 pt-safe`, linha `h-14 max-w-page px-2 md:px-4 lg:px-6`.
   - Esquerda: "‹" `IconButton size="lg"` `raised` (círculo branco com `shadow-medium`, `focus-ring-photo`), aria "Voltar". Só aparece com `history.length > 1` (no HTML servido nasce invisível); não existe na prévia nem na página do item.
   - Direita: **pílula branca** `rounded-full bg-white p-0.5 shadow-medium` com três círculos de 40 — `Search` ("Buscar no cardápio"), `ShareButton` de ícone ("Compartilhar {loja}": abre a folha nativa do sistema; sem ela, o sheet "Compartilhar" com "✕" à esquerda) e `ShoppingBag` ("Abrir sacola com N itens" / "Abrir sacola vazia") com o `CountBadge` verde.
3. **Barra compacta**: quando a identidade passa por baixo do topo, entra uma camada branca **atrás** dos botões (`absolute inset-0 border-b border-gray-200 bg-white`, `opacity-0 -translate-y-1` → `opacity-100 translate-y-0`, 150 ms) e o nome no centro (`text-body1 font-semibold text-gray-900 truncate`, `aria-hidden` enquanto invisível). O "‹" troca `raised` por `plain` e a pílula perde fundo e sombra. Nada muda de altura: o header é `fixed` nos dois estados, e o scroll anchoring do Chrome não tem o que corrigir.
   - Quem decide é o `StoreIdentity`: sentinela `div[data-store-hero-end].h-px` no fim da identidade e um `IntersectionObserver` com `rootMargin` = `-{altura medida do [data-store-top-bar]}px` (o `rootMargin` não aceita `env()`), `root` = a moldura na prévia. Só conta como "saiu" quando a sentinela passa por cima — o mesmo instante em que as tabs grudam.
4. **Folha branca**: `relative -mt-6 rounded-t-xl bg-white lg:rounded-none` (sobe 24px sobre a capa); miolo `mx-auto max-w-page px-4 md:px-6 lg:px-8`. O `h1` é `sr-only` ("Cardápio do {loja}"); o nome grande é `p`.
5. **Identidade** (`StoreIdentity`, client), linha `flex items-start gap-3`:
   - logo `Avatar shape="square" size={64}` — `size-16 rounded-lg border-[3px] border-white shadow-low bg-gray-100`, `-mt-8 lg:-mt-10` (metade sobre a capa); emoji em `text-h3`, sem logo as iniciais;
   - coluna `pt-2`: nome `font-display text-h4 font-bold leading-tight text-gray-900 truncate lg:text-h3`; abaixo o **`StoreStatus`** (`mt-1`, `aria-live="polite"`): ponto `size-2 rounded-full` (`bg-positive` / `bg-gray-400`) + `text-body1 font-semibold` — aberto, **"Aberto até 23:00"** em `text-positive`; fechado, o `describeNextOpening` ("Abre hoje às 18:00", "Abre amanhã às …") em `text-gray-700`. Pedido mínimo numa **linha própria** `text-body2 text-gray-600` ("Pedido mínimo R$ 25,00", só com entrega ligada) — ao lado do status ela quebrava. Antes de hidratar, `Skeleton` `h-4 w-40`: o status depende do relógio e a página é ISR. Recalcula a cada minuto, no fuso da loja;
   - à direita, `mt-3`: chevron `IconButton variant="tonal" size="sm" hit` (32, alvo 44) com `ChevronRight`, aria "Sobre a loja" → `openAbout()`.
6. **Entrega | Retirada**: `SegmentedControl size="lg" indicator="sliding"`, `mx-auto mt-5 w-full max-w-72 lg:mx-0`. Trilho `rounded-full bg-gray-100 p-1`; opção `h-11 px-5 text-body1 font-semibold` (ativa `gray-900`, inativa `gray-700`); pílula branca `shadow-low` que desliza em 200 ms. Sempre com as duas opções: a desligada vem `aria-disabled`, `text-gray-400`, com o hint "Indisponível" em `text-caption` embaixo, e as setas pulam por ela. Valor = `customer.mode` (o mesmo da sacola). Some só se nenhum modo estiver ligado.
7. **InfoCells** (`InfoCell`): `mt-6 grid grid-cols-2 gap-4 lg:flex lg:gap-10`. Célula = círculo `size-8 bg-gray-100` com ícone de 16, valor `text-body1 font-semibold text-gray-900` (`text-positive` quando "Grátis"), legenda `text-body2 text-gray-600`.
   - Entrega: `Clock` · prazo da zona mais barata · "Tempo de entrega" (some sem prazo, e sempre na cobrança por km); `Bike` · taxa da zona mais barata · "Entrega a partir de" (mais de uma zona, ou taxa base do km) ou "Taxa de entrega" (uma zona) — ou "Grátis", ou "A combinar" sem zonas. O "a partir de" vai para a legenda: no valor ele não cabia ao lado do tempo.
   - Retirada: `Clock` · `pickup.eta` · "Tempo de preparo"; `Store` · rua · "Retirar em".
   - Célula sem dado não renderiza; sobrando uma, ela vira `col-span-2`.
8. **Tag promo** (só em Entrega, com `freeAbove > 0`): `Tag tone="promo" size="md"` `mt-5`, com `BadgePercent` — "Entrega grátis acima de R$ 90,00". No demo, a faixa `notice` (`DemoBanner compact` = `Banner tone="info" radius="md"`) vem logo abaixo, `mt-5`. Depois dela, a sentinela.
9. **Tabs de categoria** (`Tabs tone="ink" size="lg"`): invólucro `sticky top-(--top-inset) z-30 -mx-4 mt-6 md:-mx-6 lg:-mx-8`, lista `px-1 md:px-3 lg:px-5` (a primeira aba começa na margem de 16). `nav aria-label="Categorias"` com `border-b border-gray-200 bg-white`; aba `min-h-11 px-3 py-3 text-body1 font-semibold`, ativa `gray-900`, inativa `gray-600`; traço `h-[3px] rounded-full bg-gray-900` que desliza (`transform` e `width`, 200 ms), com a ativa sempre centrada. Só texto. Uma parada de Tab (roving tabindex), ←/→/Home/End; a ativa leva `aria-current`.
   - Scroll-spy por `IntersectionObserver` com `rootMargin` medido (barra + tabs, refeito em `resize`). Tocar numa aba rola até a seção (`scrollIntoView`) e trava o spy por 700 ms (0 com menos movimento). As âncoras param abaixo das duas barras por `[id] { scroll-margin-top: calc(var(--top-inset) + var(--tabs-height)) }`.
10. **Seções**: `section#cat-{slug}.pt-8`; `h2` `font-display text-h5 font-bold text-gray-900` (só o nome: categoria não tem ícone); descrição `mt-1 max-w-2xl text-body2 text-gray-600`; `ul.mt-2` sem divisores, `lg:grid lg:grid-cols-2 lg:gap-x-10`. Os dois primeiros itens da primeira seção levam `priority`.
11. **Rodapé** (`StoreFooter`, some na página do item): `mt-12 border-t border-gray-200 bg-white`, miolo `py-8`. Só o NAP — nome em `text-body1 font-semibold`, `<address>` e WhatsApp/Instagram em `text-body2 text-gray-600` — e o `AboutButton` (`Button variant="text" size="sm" pill` com `NavIcon`, "Horários, entrega e contato"), que abre o mesmo sheet do chevron. Créditos `text-caption` sob um `border-t`: "© ano loja" e "Cardápio digital por Menu Online · crie o seu". Horários e entrega vivem no sheet; o JSON-LD continua levando os horários.
12. **Barra da sacola** (`CartBar` → `BottomBar`): com `itemCount > 0` e fora da página do item. `fixed inset-x-0 bottom-0 z-40`, `bg-white px-4 pt-3 pb-safe-4 shadow-up`, miolo `max-w-page flex justify-between`: subtotal em `text-h6 font-bold tabular-nums` à esquerda; `Button size="cta" pill` (primary) **"Ver sacola"** com `NavIcon`, `min-w-32`, à direita.
    - Sobe com `animate-slide-up` (250 ms) e desce com `animate-sheet-out` (200 ms, desmontagem adiada); quem recarrega com a sacola cheia não vê a entrada.
    - Com a sacola aberta fica `invisible` + `inert`, mas montada: o foco volta para ela quando a sacola fecha.
    - Deixa um espaçador `h-[calc(var(--bottom-bar-height)+var(--safe-bottom))]` no fim da página, para não cobrir o rodapé.

**Sheet "Sobre a loja"** (`StoreAboutSheet`, montado uma vez na casca): `BottomSheet title="Sobre a loja" closeSide="start"` — alça arrastável, "✕" à esquerda do título (`font-display text-h6`), altura do conteúdo até 90dvh. Conteúdo `divide-y px-4`: tagline e descrição; depois seções com ícone em círculo `size-8 bg-gray-100` — Endereço (`MapPin`), Horário de funcionamento (`Clock`, sete linhas, **hoje** em `font-semibold text-gray-900`), Contato (`MessageCircle`; WhatsApp como link verde, Instagram com `AtSign` — o Lucide não tem ícones de marca), Entrega (`Bike`: zonas com taxa e prazo, "Grátis acima de" em `text-positive`, a regra do km, o raio) e Retirada no local (`Store`). O conteúdo só monta com o sheet aberto: lê o relógio sem afetar o ISR.

## 2. Busca no cardápio

- A lupa da pílula abre a busca **no mesmo toque**: `flushSync(() => openSearch())` e `focus()` no `#busca-cardapio` — no iOS o teclado só abre dentro do gesto, e `autoFocus` num campo recém-montado não garante. A busca é uma **camada no histórico** (`search`, §10).
- A barra do topo fica branca e troca o miolo: "‹" `IconButton lg` ("Fechar busca") + `SearchBar` — campo `h-11 rounded-xl bg-gray-100 pl-4` (no foco `bg-white shadow-medium`), `Search size-5 text-gray-400`, `input type="search" text-body1` com `enterKeyHint="search"`, label `sr-only` "Buscar no cardápio", "✕" de 44 "Limpar busca" quando há texto e **"Cancelar"** em texto verde (`text-body1 font-semibold text-primary`, 44 de altura) fora do campo. Enter só fecha o teclado (a lista já filtra); Esc no campo cancela.
- Capa e identidade saem da frente (`SearchAware` → `hidden`; continuam no HTML) e tabs e seções dão lugar a `section.animate-fade-in pt-[calc(var(--top-inset)+2.5rem)]`. Abrir leva a rolagem ao topo; fechar devolve ao ponto em que a pessoa estava.
- Sem termo: "Busque por prato, ingrediente ou categoria." Com termo: `h2` `text-body2 text-gray-600` "N resultados para “q”" e a lista de `ItemCard` (duas colunas no `lg`, como as seções). Filtra nome, descrição, nome da categoria e tags, sem acento nem caixa (`normalize()`), sobre `useDeferredValue(search)`.
- O leitor de tela ouve a contagem num `p role="status"` escrito por **timer de 500 ms** depois da última tecla — `useDeferredValue` não é debounce e falaria a cada tecla.
- Sem resultado: `EmptyState` com `SearchX` — "Nenhum item encontrado para “q”" — e `Button variant="secondary" size="sm" pill` "Limpar busca".
- Fechar (Cancelar, "‹", Esc, voltar do sistema) zera o termo. Abrir um prato pelos resultados **não** zera: a camada volta com o voltar, e o termo está lá.
- `?busca=termo` abre a loja já em modo busca.

## 3. Linha de item e os 4 estados da ação

`ItemCard` (`memo`; lê a sacola por `useCartSelector`, então tocar "+" repinta só a linha, a barra e o badge).

```
<li class="relative">
  <Link class="press -mx-4 flex gap-4 px-4 py-4 active:bg-gray-50 lg:rounded-md lg:hover:bg-gray-50">
    <div class="min-w-0 flex-1 self-center">               ← sem foto: + pr-12
      <h3 class="line-clamp-2 text-subtitle font-semibold text-gray-700">
      <p class="mt-1 line-clamp-1 text-body2 text-gray-600">       ← descrição, uma linha
      <p class="mt-2 flex flex-wrap items-center gap-2">
        <span class="text-body1 font-bold tabular-nums text-gray-900">R$ 29,90
        <Tag tone="ink">Mais vendido</Tag>                          ← só a primeira tag
    </div>
    <DishImage class="size-24 rounded-lg" sizes="96px" fade/>     ← 96×96; emoji em 2.5rem
  </Link>
  <div class="absolute right-2 top-18">{ação}</div>               ← irmã do Link, nunca dentro
</li>
```

- Foto à **direita**, `self-start`, com fade ao carregar (sem fade quando `priority`). Emoji vira ilustração sobre `gray-100`. Sem imagem, a coluna some e a linha é só texto.
- A ação é **irmã** do `Link` (interativo aninhado navegaria) e fica sobre o canto de baixo da foto: `top-18` = 16 do respiro + 96 da foto − 32 − 8, ancorada pelo topo para a linha poder crescer com o texto sem a ação cair. Sem foto: `right-0 top-1/2 -translate-y-1/2`.
- Nada na linha se move quando a ação muda (zero layout shift): a pílula cresce para a esquerda por cima da foto.

| Estado           | Quando                                                      | Ação                                                                                                                                                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quick-add**    | disponível e sem grupo obrigatório                          | `button` círculo `size-8 rounded-full` com `Plus size-5` e `hit-44` — sobre foto `bg-white text-gray-900 shadow-medium hover:shadow-high`; sem foto `bg-gray-100`. Aria "Adicionar {nome} à sacola". Toque → `addItem(id, 1, {}, '')`, **sem toast**: a pílula, o badge e a barra que sobe já são o feedback  |
| **Na sacola**    | existe a linha "rápida" do item (sem opções nem observação) | `Stepper size="sm" variant="floating"` — pílula branca `shadow-medium`, glifos grafite, **88×32** (32 + 24 + 32), `min=1`; no 1 o "−" vira lixeira e remove. Revelada da direita para a esquerda por `animate-pill-reveal` (`clip-path`, 200 ms), menos na carga da página. `role="group"` "{nome} na sacola" |
| **Obrigatório**  | tem grupo obrigatório                                       | o mesmo círculo, como `Link` para a página do prato. Aria "Escolher as opções de {nome}"                                                                                                                                                                                                                      |
| **Indisponível** | `available = false`                                         | sem ação. Linha `opacity-60`, foto `grayscale` com o selo "Indisponível" (`absolute left-2 top-2 rounded-xs bg-gray-800/85 px-1.5 py-0.5 text-[10px] font-bold text-white`; sem foto, `Tag tone="ink"` à direita). O `Link` continua navegável: a página explica                                              |

- O círculo leva o `CountBadge` (verde, 18px, `text-[11px]`, `-right-1.5 -top-1.5`) com as unidades do item já na sacola, somando todas as linhas, e o aria ganha "(N na sacola)". O badge pula (`animate-badge-pop`, 250 ms) a cada mudança, nunca na carga.
- O clique na linha e no "+" obrigatório grava a rolagem na entrada do cardápio e o marcador de origem (§10), e leva o tipo de transição `nav-forward` (fora da prévia).
- Saíram: o helper "personalizável", a coluna fixa do "+" solto e o "✓ por 1,4s".

## 4. Página do item — `/r/[slug]/item/[item]`

`ItemDetail` dentro de `StoreScreen`. No celular o topo da loja fica `hidden lg:block` e rodapé e `CartBar` somem: a foto ocupa o topo e o CTA, o pé.

1. **"‹" flutuante** (`ItemHero`): `IconButton size="lg"` com `ChevronLeft`, aria **"Voltar ao cardápio"**, `fixed left-2 top-[calc(var(--safe-top)+0.375rem)] z-50 focus-ring-photo` — no centro da faixa de 56 do topo, o mesmo lugar sobre a foto e sobre a barra compacta; `raised` sobre a foto, `plain` com a barra. Clique = `useBackToMenu().back` (§10). É o único "voltar" da tela: "‹" é de rota (navega de volta); "✕" é só de overlay.
2. **Barra compacta com o nome** (só celular, `lg:hidden`): `fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white pt-safe`, linha `h-14 px-16` com o título `text-body1 font-semibold text-gray-900 truncate`. Entra com fade e 4px (150 ms) quando a foto sai (sentinela + `IntersectionObserver`), `aria-hidden` + `inert` enquanto invisível. Sem foto ela já nasce visível, e um espaçador `h-16 lg:h-4` fica no lugar da foto.
3. **Foto**: `DishImage` `aspect-4/3 w-full`, de borda a borda, `priority` (sem fade), fundo branco (`surface="white"`); emoji em `text-[5rem] sm:text-[7rem]`. Sem lupa. **O chip da loja saiu**: identidade, tempo e taxa vivem no topo da loja (D16).
4. **Título** (`px-4 pt-6`): `h1` `font-display text-h4 font-bold text-gray-900`; descrição `mt-2 text-body1 text-gray-600`; **preço `mt-3 text-h6 font-bold tabular-nums`**; fatos `mt-2 text-body2 text-gray-600` ("Serve 1 pessoa • 720 kcal • Contém: glúten", quando houver); com a loja fechada, depois de hidratar, o `ItemClosedNote` "Fechado agora · o pedido fica para quando abrir". As migalhas são `sr-only` no celular (alimentam o BreadcrumbList do JSON-LD). Saíram a linha de frete grátis e a faixa `border-t-8`.
5. **Grupo** (`OptionGroup`): `section#grupo-{id} role="group"`, `px-4 pt-8`, **sem faixa sticky**: `h2` `font-display text-h5 font-bold text-gray-900` + helper `mt-1 text-body2 text-gray-600`. À direita, obrigatório pendente → selo em pílula `rounded-full bg-gray-100 px-2.5 py-1 text-caption font-semibold text-gray-700` "Obrigatório"; com escolha feita (obrigatório ou não) → `CircleCheck size-6 text-positive animate-badge-pop`. Um `sr-only aria-live` diz "Escolha feita" / "Obrigatório". `scroll-mt-[calc(var(--safe-top)+4.5rem)] lg:scroll-mt-6`: ao rolar até o grupo, o título para abaixo do "‹".
   - Helpers: escolha única "Escolha 1 opção"; múltipla obrigatória "Escolha de 1 a N" ("Escolha pelo menos 1" sem máximo); múltipla opcional "Escolha até N opções" ("Escolha até 1 opção"; "Escolha quantas quiser" sem máximo); no máximo, "Máximo de N escolhidos".
   - Grupo obrigatório **não vem pré-selecionado**: a escolha é da pessoa, e o CTA só libera com ela.
6. **Linhas de opção** (`option-row.tsx`): `-mx-4 flex min-h-14 items-center gap-4 px-4 py-4`, **sem divisor**; nome `text-body1 text-gray-700` e, embaixo, o preço `mt-0.5 text-body2 text-gray-600` "+ R$ 3,00"; controle de **24px à direita**.
   - `RadioRow` (tipo `single`): `<label>` com o input `sr-only`; círculo `size-6 rounded-full border-2 border-gray-400` → `border-primary bg-primary` com ponto branco `size-2.5` (`animate-check-in`, 150 ms).
   - `CheckboxRow` (tipo `remove`, tirar ingrediente, sem preço): quadrado `size-6 rounded-[6px] border-2` → `bg-primary` com `Check size-4` branco de traço 3.
   - `StepperRow` (tipo `multi`, adicionais com quantidade): "+" em círculo `size-8 bg-gray-100` (`hit-44`, aria "Adicionar {opção}") que vira `Stepper size="sm" variant="soft"` (pílula cinza, `animate-pill-reveal`) na primeira unidade; tocar na linha também soma uma.
   - A linha inteira é o alvo, com `active:bg-gray-50` e `lg:hover:bg-gray-50`; no rádio e na caixa ela é o `<label>` (com `press` e o contorno de foco na linha, `has-[:focus-visible]:outline-2`), no adicional é um botão por baixo do texto, fora do Tab. Grupo no máximo: as opções em zero apagam (`opacity-40`, sem ação) e o "+" das pílulas abertas fecha (`max` = a contagem atual).
7. **Observação** (`px-4 pt-8`): label `text-subtitle font-semibold text-gray-900` "Alguma observação?" (sem ícone) e contador `text-caption tabular-nums` "0/140" na mesma linha (`text-error` no limite; o leitor de tela só ouve ao atingir o limite); `textarea` com `fieldClass(false, 'mt-3 min-h-24 resize-none py-3', 'soft')`, placeholder "Ex: tirar a cebola, maionese à parte etc.".
8. **Quantidade**: `Stepper size="lg" variant="soft"` centrado (`mt-8 flex justify-center`), **152×56**, `min=1`. Saiu da barra de baixo.
9. **CTA sobre degradê**: `StickyBottomBar tone="gradient"` — `fixed inset-x-0 bottom-0 z-40 px-4 pt-12 pb-safe-4 pointer-events-none bg-linear-to-t from-white via-white/95 via-45% to-transparent` (só o botão recebe toque) — com `Button size="cta" pill fullWidth` de rótulo único **"Adicionar 1 por R$ 29,90"** (edição: "Atualizar 2 por R$ 59,80"), `tabular-nums`. O conteúdo tem `pb-32`, para o fim não ficar sob o degradê.
   - Faltando obrigatório: `aria-disabled` — cinza (`gray-200` com borda `gray-300`), continua mostrando o preço e troca de cor com transição (200 ms para o cinza, os 150 ms do `press` de volta ao verde). O toque no cinza sobe até o `div` de fora, que **rola até o grupo que falta**, foca a primeira opção e anuncia "Escolha uma opção em “{grupo}” para continuar.".
10. **"Adicionar"**: `addItem` → vibração curta (`tapHaptic()`: `navigator.vibrate(10)`, nunca com menos movimento; o iOS ignora) → toast **"Adicionado à sacola"** com a ação **"Ver sacola"** (5 s; sem ação seriam 3) → volta ao cardápio **na mesma rolagem** (`useBackToMenu().back`), onde a barra da sacola sobe. O toast mora na casca e sobrevive à troca de rota: faixa `max-w-md rounded-sm bg-gray-800 px-4 py-3 text-body2 text-white`, ação em `font-semibold text-primary-tint`, `fixed z-80` a `0.5rem` acima de `--bottom-bar-height`.
11. **Editar** (`?editar=<uid>`, vindo de uma linha da sacola): o prato abre com quantidade, escolhas e observação da linha (copiadas quando a sacola hidrata) e o verbo vira "Atualizar". Ao atualizar, volta para a sacola: `router.back()` quando veio dela nesta visita (a entrada anterior é a camada `cart`, que reabre sozinha), senão `openCartAfterNav()`.
12. **Indisponível**: `Banner tone="neutral" radius="md"` "Item indisponível no momento" / "Este prato saiu temporariamente do cardápio. Confira as outras opções." e a mesma barra de degradê com `Button pill fullWidth aria-disabled` "Indisponível". Sem grupos, sem quantidade.
13. **Entrada**: com View Transitions, a tela desliza (§10); sem suporte, o `article` entra com `animate-fade-in` (150 ms, só opacidade: ele contém elementos `fixed`, e `transform` num ancestral os prenderia).
14. Não há "Também em {categoria}"; "Você também pode gostar" ficou para depois.

## 5. Sacola — passo `cart`

`CartSheet` = `BottomSheet snap="full" enterFrom="right" desktop="drawer" scroll="child" lockScroll={false}`: no celular, **página em tela cheia que entra pela direita** (300 ms; sai em 200); no desktop, drawer de 440 (§9). Scrim `bg-scrim` com fade. O `StoreProvider` trava a rolagem do fundo; o `<dialog>` nativo prende o foco e o devolve ao gatilho. `onClose` (Esc, scrim, fechamento nativo) volta **um** passo.

- **Header** (`CartPanel`, o mesmo nos três passos): `shrink-0 bg-white pt-safe`, linha `h-16 px-4`, **sem `border-b`**: "‹" `IconButton raised lg` à esquerda ("Fechar sacola"), título do passo centrado em `text-body1 font-semibold` ("Sacola", "Finalizar pedido", "Pedido enviado") e um espaçador `size-11` à direita. Os passos trocam com fade de 150 ms (`key={step} animate-fade-in`), sem deslizar.
- Área rolável `min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8`:
  - **Título** (`px-4 pt-2 flex justify-between`): `h3` `font-display text-h5 font-bold` **"Sua sacola"** e a lixeira `IconButton variant="tonal"` (40) `Trash2` "Limpar sacola" → `ConfirmDialog appearance="store"` ("Limpar sacola?" / "Todos os itens saem da sacola."; "✕" à esquerda; no pé, "Cancelar" em texto e "Limpar" em verde, os dois em pílula `cta`, confirmar à direita).
  - **Contagem**: `mt-1 px-4 text-body1 text-gray-600` "3 itens de " + o nome da loja num botão sublinhado `font-semibold text-gray-900` que fecha a sacola.
  - **Avisos** (`mt-4 space-y-3 px-4`, `Banner radius="md"`): loja fechada (`warning`, `Clock`, "Fechado agora" / "Abre hoje às 18:00. O restaurante confirma o horário na conversa." — sem prometer agendamento); cardápio mudou (`info`, dispensável, listando o que esgotou, saiu, mudou de opções ou de preço).
  - **Linhas** (`CartLineRow`, `ul.mt-6.space-y-6.px-4`, **sem divisor**): miniatura `DishImage size-14 rounded-md` (56, só com imagem); texto `pr-24` com nome `text-subtitle font-semibold text-gray-700`, escolhas `mt-1 text-body2 text-gray-600` (uma linha por grupo: "Adicionais: 2x Bacon"), "Obs.: …" e o **preço `mt-2 text-body1 font-bold`**; `Stepper size="sm" variant="soft"` (88×32, lixeira no 1) em `absolute right-1 top-1`.
    - **Sem "Editar"**: tocar na linha abre o prato preenchido (`?editar=<uid>`) — link esticado por `after:absolute after:inset-0`, com "Editar" em `sr-only`, e o stepper por cima dele; a linha escurece só quando é o link que está apertado (`has-[a:active]:bg-gray-50`).
    - Remover recolhe a linha (`grid-rows` 1fr → 0fr, 200 ms) e só depois tira do store, para a lista não pular.
  - **"Adicionar mais itens"** (`mt-6 px-4 flex justify-end`): `Button variant="tertiary" size="sm" pill` → fecha a sacola.
  - Bloco `mt-8 space-y-6 px-4`: `OrderModeControl` (Entrega | Retirada com `Bike`/`Store`, `indicator="sliding"`, só com os dois modos ligados — é ali que a escolha muda taxa, total, CEP e mínimo); resumo `dl.space-y-2.text-body1` com Subtotal e Taxa de entrega (só em entrega; "Grátis" em `font-semibold text-positive`, "a calcular", "a combinar") e **Total `text-h6 font-bold`** ("R$ 58,00 + entrega" enquanto a taxa não é conhecida); `DeliveryQuoteField` (CEP em campo `soft` + "Calcular" em pílula) quando a loja cobra por km; abaixo do mínimo, `Banner warning` "Pedido mínimo para entrega: R$ 25,00." — diz só o valor, sem mandar escolher retirada.
- **Barra de baixo**: `BottomBar position="static"` (`bg-white px-4 pt-3 pb-safe-4 shadow-up`, sem `border-t`): o total (ou o subtotal + "+ entrega") e a pílula **"Continuar"** com `NavIcon` → `goToStep('checkout')`. Continua ativa abaixo do mínimo: a trava é no envio.
- **Vazia**: `EmptyState variant="hero"` — `ShoppingBag size-10` em círculo `size-24 bg-gray-100`, "Sua sacola está vazia" (`font-display text-h5`), "Escolha os itens do cardápio para começar seu pedido." e `Button variant="secondary" size="cta" pill` "Ver cardápio" com `NavIcon`, que fecha. Ao esvaziar (lixeira ou última linha), o foco vai para esse botão.

## 6. Finalizar pedido — passo `checkout`

- Header: "‹" "Voltar para a sacola" (`goToStep('cart')`) + "Finalizar pedido".
- `form#checkout-form` é a área rolável: `px-4 pb-8 [scroll-padding-bottom:6rem]`.
  - Topo (`space-y-4 pt-2`): aviso de loja fechada e o `OrderModeControl`; com um modo só, um rótulo em pílula `h-12 rounded-full bg-gray-100 text-body1 font-semibold` ("Somente entrega" / "Somente retirada no local").
  - Blocos `mt-8 space-y-4`, título `font-display text-h6 font-bold text-gray-900`, sem as faixas cinza entre eles:
    - **Seus dados**: "Nome completo"; "WhatsApp" com máscara e a dica "Usamos para confirmar o pedido e avisar da entrega.".
    - **Endereço de entrega**: por km, o campo de CEP; sem bairros cadastrados, "Bairro" em texto livre; com bairros, `SelectField` "Selecione o bairro" com "Centro — R$ 5,00 · 30-45 min" e a opção "Meu bairro não está na lista". Fora da área, um cartão `rounded-lg bg-gray-50 p-4` ("Vamos confirmar com o restaurante", "Qual o seu bairro?" e `Button variant="secondary" size="cta" pill fullWidth` "Prefiro retirar no local (20-30 min)"). Depois Rua e Número (`w-28`) lado a lado, Complemento e Ponto de referência.
    - **Retirada no local** (no lugar do endereço): cartão `rounded-lg bg-gray-50 p-4` com `Store`, o endereço da loja e "Fica pronto em …".
    - **Observações**: `TextArea` de duas linhas.
  - **Campos `appearance="soft"`**: `h-12`, `rounded-md` (12), `bg-gray-50 border-transparent`; no foco `bg-white border-primary` (+ anel `ring-primary/40` no foco por teclado); com erro `border-error bg-white`. Rótulo `text-body2 font-medium` com " *" nos obrigatórios. Ids, `name`, `autoComplete`, `inputMode`, placeholders e as mensagens de `validate()` são os de sempre: é o que mantém o preenchimento automático e as regras testadas.
- **Rodapé** (`shrink-0 space-y-3 bg-white px-4 pt-3 pb-safe-4 shadow-up`), de cima para baixo: resumo `dl[data-summary]` em `text-body2` (Subtotal, Taxa, **Total `text-h6 font-bold`**); aviso `Banner warning role="alert"` com fade (ex.: "O pedido mínimo para entrega é R$ 25,00."); **CTA `Button type="submit" form="checkout-form" variant="brand" size="cta" pill fullWidth`** com o `WhatsAppGlyph` — **"Fazer pedido pelo WhatsApp"** (fora da área, "Enviar para confirmar a entrega"); legenda `text-caption` "Abrimos a conversa com o pedido já escrito. É só apertar enviar.". `brand` é o verde vivo com rótulo grafite (8,8:1) e só vira botão aqui, porque é literalmente o botão do WhatsApp (D21).
- **Teclado**: com um campo em foco, o resumo some (`max-lg:[&:has(input:focus,select:focus,textarea:focus)_[data-summary]]:hidden`) e ficam aviso, CTA e legenda. Só abaixo de `lg`, e **só o que fica acima do botão some**: ao tocar no CTA o campo perde o foco e o resumo volta; se algo voltasse abaixo dele, o botão subiria entre o `mousedown` e o `mouseup` e o clique cairia fora.
- Erros inline sob cada campo (`role="alert"`); ao enviar com erro, o primeiro campo inválido rola para o **centro** (fica acima do teclado) e recebe o foco.
- Envio: grava o link do pedido, limpa a sacola e vai para `done` **antes** de abrir o `wa.me` em aba nova; com o pop-up bloqueado (navegador do Instagram/Facebook), a própria aba navega (`location.assign`). Loja fechada na hora do clique → a mensagem sai com "_Pedido enviado com a loja fechada — favor confirmar o horário._".

## 7. Pedido enviado — passo `done`

- Header com **"✕"** (`X`, "Fechar sacola") — o único passo sem "‹" — e o título "Pedido enviado".
- Coluna centrada (`flex-1 items-center justify-center gap-4 px-6 pt-6 pb-safe-4`): círculo `size-20 rounded-full bg-primary-tint text-green-700` com `CircleCheck size-10` e **`animate-check-pop`** (300 ms, 0,5 → 1,1 → 1); `h3` `font-display text-h5 font-bold` "Pedido enviado!"; `text-body1 text-gray-600` "Abrimos o WhatsApp do {loja} com o resumo do seu pedido. **Confirme o envio na conversa** para que a cozinha receba.".
- Ações (`mt-4 w-full max-w-sm flex-col gap-3`): `Button variant="secondary" size="cta" pill fullWidth` **"Abrir o WhatsApp novamente"** com o `WhatsAppGlyph` (aba nova) e `Button variant="tertiary" size="cta" pill fullWidth` "Voltar ao cardápio" com `NavIcon`, que fecha a sacola. Sem rodapé.
- O link vem de `sessionStorage['menuqr.lastOrder.<businessId>']` (P16): quem volta do WhatsApp para a aba (pop-up bloqueado) reencontra "Enviado" com o botão. Sem link, o botão não aparece.

## 8. Estados

| Estado                                                 | Comportamento                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loja fechada                                           | Status "Abre hoje às 18:00" com ponto cinza. **Nada trava**: quick-add, CTA e sacola funcionam. O item mostra "Fechado agora · o pedido fica para quando abrir"; sacola e Finalizar, o aviso "Fechado agora"; a mensagem sai marcada. Sem banner na lista (D13)                                                                                                                                                           |
| Status antes de hidratar                               | `Skeleton` `h-4 w-40` no lugar do status. Se a loja abrir ou fechar com a página aberta, o ponto troca com `transition-colors`                                                                                                                                                                                                                                                                                            |
| Modo desligado                                         | A opção fica no segmented, apagada, com "Indisponível"; nenhum modo ligado → sem segmented                                                                                                                                                                                                                                                                                                                                |
| Cardápio vazio                                         | `EmptyState` com `UtensilsCrossed` — "Este cardápio ainda não tem itens publicados." — sob a identidade; sem tabs                                                                                                                                                                                                                                                                                                         |
| Busca sem termo / sem resultado                        | "Busque por prato, ingrediente ou categoria." / `EmptyState` `SearchX` + "Limpar busca" (§2)                                                                                                                                                                                                                                                                                                                              |
| Item indisponível                                      | Lista: §3. Página: `Banner neutral` + CTA "Indisponível" (§4)                                                                                                                                                                                                                                                                                                                                                             |
| Sacola vazia, revisada, abaixo do mínimo, fora da área | §5 e §6; "Continuar" sempre ativo                                                                                                                                                                                                                                                                                                                                                                                         |
| Pop-up bloqueado                                       | A aba navega para o `wa.me`; ao voltar, a sacola reabre em "Enviado" (camadas no histórico) com "Abrir o WhatsApp novamente" (sessionStorage)                                                                                                                                                                                                                                                                             |
| Carregando                                             | A rota é ISR (`revalidate = 300`) e chega pronta: **não há `loading.tsx`** em `/r/[slug]`. O modo demo, enquanto lê o navegador, mostra `StoreSkeleton` (capa `h-60 lg:h-80`, quadrado `size-16 rounded-lg -mt-8`, nome, status, pílula `h-12 w-48`, duas células, três abas, quatro linhas com `size-24 rounded-lg`) ou `ItemSkeleton` (foto `h-72`, título, preço, dois grupos com círculos de 24, pílula `h-12` no pé) |
| Item não encontrado                                    | `not-found.tsx` da rota → `ItemMissing`, dentro da casca: barra `sticky h-14` com o "‹" "Voltar ao cardápio" (só celular) e `EmptyState variant="hero"` `SearchX` "Item não encontrado" / "Este prato não está mais no cardápio. Confira as outras opções." + `Button variant="secondary" size="cta" pill` "Ver cardápio". O demo e a prévia usam o mesmo. Loja inexistente (`notFound()` do layout) cai no 404 global    |
| Erro                                                   | `error.tsx` da rota → a mesma tela (`StoreMessage`) com `TriangleAlert`, "Algo deu errado por aqui" / "Não foi possível carregar esta parte do cardápio. Tente de novo — a sua sacola continua salva." e "Tentar novamente"; relata o erro ao servidor como a barreira da raiz                                                                                                                                            |
| Assinatura vencida                                     | `StoreUnavailable`: a página inteira é o aviso, sem casca — "Cardápio temporariamente indisponível"                                                                                                                                                                                                                                                                                                                       |
| Modo demo                                              | Faixa `Banner info` "Modo demonstração" sob a identidade; a página do item fica sem faixa                                                                                                                                                                                                                                                                                                                                 |

## 9. Desktop (`lg:`)

- **Loja**: capa `h-80`; folha sem raio; logo `-mt-10` e nome `text-h3`; segmented alinhado à esquerda; InfoCells em linha (`flex gap-10`); **lista em duas colunas** (`grid-cols-2 gap-x-10`), cada linha com `rounded-md hover:bg-gray-50`. Barra do topo e `CartBar` com miolo `max-w-page`.
- **Item**: vira um **painel centrado que rola por dentro** — fundo `bg-gray-50`, painel `max-w-narrow` (640) `rounded-lg border border-gray-200 shadow-highest overflow-clip`, `pt-[calc(var(--top-inset)+2.5rem)]`, altura máxima `calc(var(--screen-height) - var(--top-inset) - 5rem)`, conteúdo em `min-h-0 flex-1 overflow-y-auto overscroll-contain`. Foto em 16:10; migalhas visíveis; grupos com `scroll-mt-6`.
  - O "‹" vira `absolute left-4 top-4` no painel. A barra compacta do prato some e fica a **barra da loja** no topo (compacta, sem "‹": nome, busca, compartilhar e a sacola com badge — é por ela que se abre a sacola daqui).
  - **O CTA gruda no pé do painel** (`StickyBottomBar` com `lg:sticky lg:mt-6`; o invólucro das opções é `lg:contents`, para o sticky andar no painel inteiro) e aparece sem rolar.
- **Sacola**: **drawer de 440 px** (`w-[27.5rem]`) encostado à direita, altura toda (`h-dvh`), sem cantos, `shadow-highest`, sobre o scrim; entra e sai pela direita; a mesma composição do celular. No Finalizar o resumo não some com o foco.
- **Sheets da loja** ("Sobre a loja", "Compartilhar", "Limpar sacola?"): dialog centrado `max-w-md rounded-lg` com `pop-in`, sem alça.

## 10. Navegação: camadas no histórico e o item como rota

```
[QR / link] → /r/[slug]                  rota; a casca mora no layout
                ├─ 'search'                camada no histórico, sem URL
                ├─ 'cart'      Sacola      idem
                │    └─ 'checkout'  Finalizar   idem
                │          └─ 'done'  Enviado   SUBSTITUI 'checkout'
                └─ /r/[slug]/item/[item]   rota (?editar=<uid> quando vem da sacola)
```

**Camadas** (`nav-layers.ts`, P5): cada camada é uma entrada no histórico com `history.state.mq` (ex.: `['cart', 'checkout']`), empurrada com `pushState(state, '')` **sem mudar a URL**. `isOpen`, `step` e `searchOpen` são **derivados** desse array por `useSyncExternalStore` — nunca guardados à parte —, então voltar do navegador, gesto do iOS, botão do Android, Esc e "‹" ficam sempre coerentes com a tela.

- Hash (`#sacola`) não serve: no demo o fragmento é `#c=<cardápio inteiro>` e seria sobrescrito.
- `pushLayer` não repete a camada do topo (o modo estrito roda efeitos duas vezes); Finalizar → Enviado é `replaceLayer`.
- `Link` e `router.push` criam entrada nova sem `mq`: abrir um prato fecha a sacola sozinho.
- Nunca empurrar camada no mesmo tique de um `router.push/replace`: o Next grava a entrada dele depois e apaga a nossa. Para abrir a sacola depois de navegar existe `openCartAfterNav()`, que guarda a intenção e empurra `cart` quando o cardápio monta.
- O Next regrava a entrada atual em algumas atualizações; um embrulho do `replaceState` preserva `mq`, `mqScrollY` e `mqFrom` quando a URL é a mesma. Por isso **recarregar com a sacola aberta reabre a sacola** (P16). No servidor não há camada: a loja nasce fechada no HTML.
- `StoreProvider history={false}` desliga tudo isso (vitrines da landing, §11).

| Tela                                             | "‹" da interface                                                                                                                                                                                                              | Voltar do sistema                                                                                                                               | Esc                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Loja                                             | "Voltar" = `router.back()`; só aparece com `history.length > 1` (o `router.push('/')` do outro ramo é só salvaguarda). Não existe na prévia                                                                                   | sai da loja, como um app aberto por link                                                                                                        | —                               |
| Busca                                            | "‹" ("Fechar busca") e "Cancelar" = `closeSearch()` (volta uma entrada se o topo é `search`)                                                                                                                                  | fecha a busca, zera o termo, devolve a rolagem                                                                                                  | no campo, = Cancelar            |
| Item                                             | "Voltar ao cardápio" = `useBackToMenu()`: abriu pela loja ou pela sacola nesta visita → `router.back()`; chegou direto pelo link → `router.replace(basePath)` (a pilha vira `[externo][loja]` e o próximo voltar sai do site) | volta à entrada anterior: o cardápio na mesma rolagem (com a busca, se veio dos resultados) ou **a sacola reaberta**, se veio de uma linha dela | —                               |
| Sacola                                           | "‹" "Fechar sacola" = `closeCart()`                                                                                                                                                                                           | fecha; a loja continua montada por baixo, na mesma posição                                                                                      | volta um passo (o scrim também) |
| Finalizar                                        | "‹" "Voltar para a sacola" = `goToStep('cart')`                                                                                                                                                                               | volta para a Sacola                                                                                                                             | volta um passo — não fecha      |
| Enviado                                          | "✕" e "Voltar ao cardápio" = `closeCart()` (duas entradas)                                                                                                                                                                    | cai em `['cart']` vazia e o provider volta mais uma: cardápio                                                                                   | igual ao voltar                 |
| "Sobre a loja", "Compartilhar", "Limpar sacola?" | "✕" à esquerda (`closeSide="start"`)                                                                                                                                                                                          | sem entrada no histórico (estado React); no Android o close watcher do `<dialog>` fecha só o sheet                                              | fecha só o sheet                |

**Item como rota** (D6, P6):

- No clique que abre o prato (linha do cardápio, "+" obrigatório, linha da sacola), `rememberMenuPosition()` grava `mqScrollY` **na entrada atual** (o cardápio, ou a camada `cart`) e um marcador `sessionStorage['menuqr.nav'] = { slug, from: 'menu' | 'cart', to }`. Ao montar, a página do prato adota o marcador como `history.state.mqFrom` se `to` bate com a URL; marcador de outro clique é descartado. Assim o "‹" sabe se pode fazer `router.back()`, e a informação sobrevive a recarregar e a ir e voltar pelo histórico.
- O `MenuBrowser` devolve a rolagem num `useLayoutEffect` (antes da pintura), e põe `history.scrollRestoration = 'manual'` só na página pública — na prévia quem rola é a moldura.
- Abrir o prato pela sacola não fecha a sacola à mão: a navegação cria uma entrada sem a camada dela, e voltar do prato (ou cancelar a edição) cai na entrada `cart`, que reabre.

**View Transitions** (2026-09-24): `StoreScreen` (`<ViewTransition>` do React) envolve o conteúdo de cada **página** — `StoreMenu` e `ItemDetail`; no layout, que sobrevive à troca, entrada e saída nunca aconteceriam — com `default="none"`, porque a busca (`useDeferredValue`) e o `router.refresh()` também são transições e não podem animar a tela.

- `nav-forward`: os `Link` do `ItemCard` (fora da prévia) — o cardápio some em 120 ms enquanto recua 40px (250 ms) e o prato chega da direita (60px em 280 ms, com fade de 180 ms que começa aos 100 ms — as duas telas quase não se sobrepõem);
- `nav-back`: só o `router.replace` do `useBackToMenu` — o espelho;
- `router.back()` e o voltar do navegador **não animam**: o Next os roda num `popstate`, fora do nosso alcance, e a tela troca seca (no iOS o gesto já traz a animação dele);
- CSS `vt-push-in/out` e `vt-pop-in/out` em `globals.css`, só com `prefers-reduced-motion: no-preference`; com menos movimento a duração zera. Durante a troca, `::view-transition { pointer-events: none }`.

**Offsets** (`globals.css`, `:root`): `--safe-top` / `--safe-bottom` (o `env()` da área segura, como variável para a prévia zerar), `--screen-height: 100dvh`, `--top-bar-height: 3.5rem`, `--top-inset: calc(var(--top-bar-height) + var(--safe-top))` (onde as tabs grudam), `--tabs-height: 3rem`, `--bottom-bar-height: 4.75rem` (`CartBar` e CTA; o toast fica `0.5rem` acima). `--app-bar-height` e `--sticky-offset` não existem mais. z-index: 30 tabs · 40 `CartBar`, CTA do item e barra compacta do prato · 50 topo da loja e "‹" do prato · 80 toast · top layer para sacola e sheets.

## 11. Prévia do painel e vitrines da landing

- **Prévia** (`/painel/previa`): o `layout.tsx` da rota segura a casca real — `PreviewFrame` = `Card` "Prévia" (com "Voltar ao painel") + `StoreFrame embedded basePath="/painel/previa"` — e as páginas desenham só `StoreMenu` / `ItemDetail` (prato apagado → `ItemMissing`). O `EmbeddedShell` é um aparelho: moldura `h-(--screen-height) transform-gpu overflow-hidden rounded-md border` com `--screen-height: min(80dvh,56rem)`, `--safe-top`/`--safe-bottom` em 0 e `--top-inset` = só a barra. O `transform` prende os `fixed` da loja (topo, `CartBar`, CTA, toast) à moldura, e um scroller interno é a raiz de rolagem (`ScrollRootContext`) dos observadores e da restauração. Sem o "‹" da loja (o `Card` já tem "Voltar ao painel"), sem `id="conteudo"` no `main` e sem o `nav-forward` do `ItemCard` (a transição é da página inteira e vazaria da moldura; só o `router.replace` do "‹" de um prato aberto direto pela URL ainda leva `nav-back`). `compactHeader` nasce verdadeiro e o observador da identidade corrige na primeira medida. A sacola e os sheets continuam no top layer e cobrem o painel (aceito). O `SetupWidget` fica oculto na prévia.
- **Landing**: a vitrine do hero monta a loja com `StoreProvider history={false}` (nada mexe no histórico da página) e mostra `StoreHeader layout="bar"` (a barra compacta, no fluxo), as `Tabs` reais e `ItemCard`s, com a `CartBar` presa num `transform-gpu`; o bloco é `inert` e quem age é só o cursor falso. O painel de passos usa o `ItemCard` real num `ul.min-h-32`, com a mesma altura da linha com foto reservada.

## Fora por enquanto

"Pedir de novo" (o último pedido, guardado no aparelho) e "Você também pode gostar": decididos em 2026-09-24 como fase opcional, depois desta entrega.
