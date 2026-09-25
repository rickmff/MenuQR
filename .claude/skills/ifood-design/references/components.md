# Primitivos e componentes — `src/components/ui/` e `src/components/store/`

## Sumário
1. Convenções
2. O que vem em `assets/ui/`
3. Primitivos de `ui/` (assinatura, receita, onde é usado)
4. Componentes da loja (`store/`)
5. Ícones: emoji → Lucide
6. Acessibilidade
7. Limites conhecidos

## 1. Convenções

Seguem os padrões de engenharia que o iFood descreve para o IFDS:

- **Props dizem o papel, não o estilo**: `variant="primary"`, `loading`, `tone="warning"`. Nunca `color="red"` nem `fontSize`.
- **Todo valor visual vem de token** (classe do tema). Nada de hex, px solto ou `style={{}}` para cor. A única exceção de `style` é de layout: o `SegmentedControl sliding` passa `--segments`/`--segment` para uma classe literal.
- **Composição no lugar de configuração** quando o conteúdo varia: `BottomSheet` recebe `children` e `footer`, não vinte props.
- Um arquivo por componente, sem barrel (`index.ts`): importe direto de `@/components/ui/button`.
- `'use client'` só onde há estado, efeito ou handler. Sem a diretiva em `ui/`: `Button`, `IconButton`, `AddButton`, `Tag`, `Card`, `Avatar`, `Container`, `EmptyState`, `Banner`, `Skeleton`, `InfoCell`, `StickyBottomBar`, `TextField`/`SelectField`/`TextArea`, `WhatsAppGlyph` e os ícones de `button-icons.tsx`. Na loja, a lista está na seção 4.
- Todos aceitam `className` e repassam atributos nativos. Junte classes com `cn()` de `@/lib/cn`.
- Mapas de variante são `Record<Variant, string>` com strings literais completas — o Tailwind não enxerga classe montada por template.
- **Variante nova substitui, nunca acrescenta** (regra de 2026-09-24). O `cn()` só junta strings (`filter(Boolean).join(' ')`), sem `tailwind-merge`: duas classes do mesmo papel — raio, borda, padding, altura, `position` — brigam pela ordem do CSS gerado, e não pela ordem no `className`. Por isso cada variante é uma entrada de `Record` que traz a parte inteira do base: `Avatar` `SHAPES` (raio + borda), `Banner` `RADIUS` (raio + padding), `Stepper` `SIZES`/`FRAMES`/`INK`, `IconButton` `SIZES` (era ternário), `Tabs` `TAB_SIZES`/`TONES`, `StickyBottomBar` `POSITIONS`/`TONES`, `SegmentedControl` `SIZES`, `ImageUpload` `SHAPES`, `Button` `SIZES` (ganhou `cta`) e `DishImage` `SURFACES`. Quando a variante troca o desenho inteiro, ela vira um ramo, e não classes somadas: o `soft` do `fieldClass`, o `hero` do `EmptyState`, o `sliding` do `SegmentedControl` (pílula única no lugar do fundo de cada opção) e o `closeSide="start"` do `BottomSheet` (outro cabeçalho). `Skeleton shape="bare"` não põe altura nem raio, para quem chama pôr. O que depende do chamador sai do componente (a altura em `fieldClass`; a posição do `IconButton` com `hit` ou `badge`, que já é `relative`).
- **Default igual ao de antes** (2026-09-24). Toda prop nova tem como padrão o desenho que já existia, e o painel não mudou quando a loja ganhou variantes: `Button size="md"`, `IconButton size="md"`, `Stepper variant="outlined" size="md"`, `SegmentedControl size="md" indicator="fill"`, campos `appearance="outlined"`, `Banner radius="sm"`, `EmptyState variant="default"`, `Avatar shape="circle" size={48}`, `BottomSheet desktop="dialog" closeSide="end" scroll="wrapper"`, `ConfirmDialog appearance="panel"`, `Tabs tone="primary" size="md"`, `Skeleton shape="rect"`, `Stepper orientation="horizontal"`, `Tag tone="neutral"`, `ImageUpload shape="square"`, `DishImage surface="gray" fade={false}` e o toast sem ação em 3s. Mexeu num primitivo, confira `/painel/cardapio` e `/painel/negocio`.
- **Pílula nas telas do cliente, raio por papel no painel** (D28, 2026-09-24): loja, prato, sacola, finalizar e enviado usam `Button pill` (CTAs em `size="cta"`) e botão de ícone em círculo; o painel continua `rounded-sm`.
- Nomes: a auditoria procura as palavras inteiras `btn`, `surface` e `eyebrow`. Não as use em identificadores novos (por isso `tone="white"` e não `"surface"`). Exceção que escapou em 2026-09-24: a prop `surface` do `DishImage` — a auditoria acusa `classe-legada` na própria prop (três linhas de `dish-image.tsx`) e no `surface="white"` de `item-detail.tsx`; renomear é pendência.
- O projeto compila com `strict` e `noUncheckedIndexedAccess`, e o ESLint do Next 16 traz as regras do React Compiler: nada de `ref.current` no render, nada de `setState` síncrono em efeito, nada de `Date.now()`/`Math.random()` no render.

## 2. O que vem em `assets/ui/`

Copie para `src/components/ui/` na fase 2. São os primitivos mais difíceis de acertar duas vezes do mesmo jeito; já passaram no `tsc` e no lint deste repositório.

| Arquivo | Conteúdo |
|---|---|
| `button.tsx` | `Button` e `buttonClass()` |
| `icon-button.tsx` | `IconButton` com badge de contagem |
| `stepper.tsx` | `Stepper` com lixeira no mínimo |
| `tabs.tsx` | `Tabs` roláveis com indicador deslizante |
| `bottom-sheet.tsx` | `BottomSheet` sobre `<dialog>` nativo |
| `toast.tsx` | `ToastProvider` e `useToast()` |
| `skeleton.tsx` | `Skeleton`, `ItemRowSkeleton`, `StoreSkeleton` |

**Os sete arquivos estão atrás dos de `src/components/ui/`** (conferido em 2026-09-24). Faltam neles, entre outros: `Button` `brand`/`dark`/`ghost`, `after`, `ref` e `size="cta"`; `IconButton size="lg"` e `hit`; `Stepper` `variant` (`outlined`/`plain`/`soft`/`floating`), `lg` e `orientation`; `Tabs` `tone`/`size`/`listClassName` e o teclado; `BottomSheet` `drawer`/`closeSide`/`scroll` e o fechamento nativo; a duração de 5s do toast com ação (a `action` já existe lá) e a posição por `--bottom-bar-height`; `Skeleton shape="bare"`, `ItemSkeleton` e a geometria nova do `StoreSkeleton`. Neste repositório a fonte é o `src`; para começar outro projeto, copie de lá.

Os demais primitivos são pequenos: escreva a partir do inventário.

## 3. Primitivos de `ui/`

### Ações

**`Button`** — `{ variant?: 'primary' | 'secondary' | 'tertiary' | 'text' | 'brand' | 'dark' | 'ghost'; size?: 'sm' | 'md' | 'lg' | 'cta'; loading?; fullWidth?; pill?; leading?; trailing?; after?; href?; target?; rel?; ref? } & ButtonHTMLAttributes`
- **Do app** — primary: verde chapado, texto branco, **borda grafite**. secondary: branco com **borda e texto grafite** (D22 — era verde; a borda grafite dá 17,46:1 e cumpre sozinha o mínimo de 3:1 da WCAG para o limite de um controle). tertiary: `gray-100`. text: só o texto verde.
- **Do site institucional** (landing e auth, 2026-09-23 — D19): `brand` é o verde vivo `#25d366` com rótulo e **borda** GRAFITE (8,8:1; branco sobre ele dá 1,98:1 e é proibido) e é o único botão verde da landing; `dark` é grafite chapado, para a mesma ação repetida fora da dobra principal (o botão do header); `ghost` é o `text` em grafite, para link que não deve puxar cor. No app, `brand` aparece num lugar só — o CTA final do Finalizar, "Fazer pedido pelo WhatsApp" (D10, D21) —, e `dark` e `ghost` nunca.
- Alturas: `sm` 40 (`h-10 px-4 text-body2`), `md` 48 (`h-12 px-5 text-body2`), `lg` 56 (`h-14 px-6 text-body1`) e **`cta` 48 com rótulo de 16** (`h-12 px-6 text-body1`, 2026-09-24): o CTA das telas do cliente, como nos apps de delivery. `font-semibold`. Raio 8 no painel; `pill` na landing e em todo botão das telas do cliente (D28). Desabilitado `bg-gray-200 text-gray-400` no `primary` e no `brand` (o `secondary` fica branco, o `tertiary` `gray-100`, os dois com texto `gray-400`).
- **Borda grafite nos dois botões verdes** (2026-09-23, decisão do dono): `primary` e `brand` levam `border border-gray-900`, o mesmo contorno do `secondary` — o desenho do botão é o contorno, e a variante só troca o preenchimento. Quem desabilita mantém a `border` (em `gray-300`), senão o botão encolhe 2px. Sobre o bloco `gray-900` do CTA final a borda não aparece, porque é a cor do próprio fundo.
- **`pill` desabilitado anima a volta** (2026-09-24): ganha `transition-colors duration-200 ease-standard`. A transição que vale é a do estado de chegada: o cinza → verde do CTA do prato (o último obrigatório escolhido) anima pelo `press` do botão ativo (150ms), e esta classe faz o verde → cinza animar também — sem ela o botão desabilitado, que perde o `press`, trocaria seco.
- `trailing` alinha o conteúdo à direita: é o preço em "Adicionar    R$ 29,90".
- **`after` cola o ícone ao rótulo** (D22) e é a prop do padrão do WhatsApp: lá nenhum botão vem sem ícone, e o ícone está sempre à direita, nunca à esquerda. Não confunda com `trailing`, que manda o conteúdo para a outra ponta.
- `loading` troca o `leading` por spinner, desabilita e marca `aria-busy`.
- `aria-disabled` pinta o estado desativado, tira o `press` e ignora o clique, mas o evento sobe: é assim que o toque no CTA cinza do prato leva ao grupo que falta.
- `ref` (prop, React 19) vale só no ramo `<button>`: a sacola vazia foca "Ver cardápio" por ele.
- Onde, nas telas do cliente: `cta pill` em "Ver sacola" e "Continuar" (`BottomBar`), "Adicionar 1 por R$ 29,90" e a barra "Indisponível" do prato (`fullWidth`), "Ver cardápio", "Tentar novamente" (erro da loja), "Calcular", "Prefiro retirar no local", "Abrir o WhatsApp novamente", "Voltar ao cardápio" e nos dois botões do `ConfirmDialog appearance="store"`; `brand cta pill fullWidth` no envio; `tertiary sm pill` em "Adicionar mais itens"; `text sm pill` em "Horários, entrega e contato" e "Trocar" (CEP); `secondary sm pill` em "Limpar busca"; `secondary md pill` em "Copiar", no menu alternativo do `ShareButton`.
- Substitui `.btn*` (121 usos), os botões ad-hoc de `cart-drawer.tsx` e `item-order-panel.tsx`, e o visual dos cinco `SubmitButton` (eles mantêm o `useFormStatus` e renderizam `<Button type="submit" loading={pending}>`) e do `PendingButton` de `category-manager.tsx`. Conferido em 2026-09-24: sobram três `SubmitButton` — `publish-toggle` e `onboarding-form` já renderizam `<Button type="submit" loading>`, o de `auth-form` ainda é `<button className="btn btn-primary">` —, e `category-manager.tsx` não existe mais.

**Ícones de botão** (`ui/button-icons.tsx`) — o desenho diz o que acontece, então são dois:
- **`NavIcon`** (chevron): navega dentro do Menu Online. É o "Log In >" deles. Na loja: "Ver sacola ›", "Continuar ›", "Ver cardápio ›", "Voltar ao cardápio ›" (Enviado) e "Horários, entrega e contato ›".
- **`ExternalIcon`** (seta diagonal): abre em aba nova. É o "Help Center ↗" deles.
- Quem abre o WhatsApp usa o **`WhatsAppGlyph`**: ali o destino é a marca, e o glifo diz mais que uma seta.
- Botão de ação local — Salvar, Copiar, Excluir, Cancelar — **não** leva ícone de navegação; se levar ícone, é o do que ele faz.

**`AddButton`** (`ui/add-button.tsx`) — `Omit<ButtonProps, 'variant' | 'size' | 'leading' | 'trailing' | 'after' | 'pill' | 'fullWidth'>`
- O único desenho que "acrescentar" tem no painel (D23): `Button variant="secondary" size="sm"` com `Plus` de 16px no `leading`. Hoje serve para grupo e opção ("Adicionar grupo", "Adicionar opção", em `item-form`) e bairro (`business-form`); item e categoria entram pelos formulários "Novo item" e "Nova categoria" do `menu-editor` (conferido em 2026-09-24).
- As props de aparência ficam de fora de propósito: quem escreve a próxima lista do painel não decide nada, só onde o botão fica.
- Onde ele fica: **dentro de um card**, num rodapé `border-t border-gray-200 p-4` depois das linhas; **numa lista solta** (fieldset, bloco do formulário), logo depois dela, com o respiro do bloco.
- O rótulo começa com o verbo — "Adicionar opção", nunca "Opção" nem "Nova opção".
- Substitui a linha fantasma verde do fim do card de categoria e o botão tracejado de "Nova categoria" (`menu-editor.tsx`), os dois botões dos complementos (`item-form.tsx`) e o "Adicionar bairro" (`business-form.tsx`).

**`IconButton`** — `{ label; icon; variant?: 'plain' | 'raised' | 'tonal'; size?: 'sm' | 'md' | 'lg'; badge?: number; hit?: boolean; href? }`
- Círculo: `sm` 32 (`size-8`), `md` 40 (`size-10`, padrão), **`lg` 44** (`size-11`, 2026-09-24): o chrome da loja — voltar, busca, sacola. O tamanho virou `Record` (era ternário).
- `raised` é o círculo branco com `shadow-medium`, que flutua sobre capa e foto; `tonal` é o fundo `gray-100`; `plain`, sem fundo.
- **`hit`** (2026-09-24): alvo de 44 sem crescer o desenho (utility `hit-44`, pseudo-elemento com `inset: -6px`). Como o `badge`, deixa o botão `relative`: para posicioná-lo com `absolute`, embrulhe-o num elemento posicionado — sem `tailwind-merge`, duas classes de `position` brigariam.
- `badge` continua na API, mas ninguém mais o usa (2026-09-24): a loja usa o `CountBadge` (seção 4), que não pula na carga da página.
- `label` vira `aria-label`; o ícone é `aria-hidden`. Sobre foto ou capa, some `className="focus-ring-photo"`: o contorno verde do foco some no fundo colorido.
- Onde: "‹" da loja e do prato (`raised lg`, vira `plain` quando a barra compacta entra), "‹" e "✕" da sacola (`raised lg`), "‹" do `StoreMessage` (`plain lg`, na barra branca do celular), "Fechar busca" (`plain lg`), busca e sacola na pílula do topo (`plain md`), "Limpar sacola" (`tonal md`), chevron "Sobre a loja" (`tonal sm hit`); no painel, os de sempre.
- O "+" da linha do cardápio **não** usa este componente: é um `<button>` de 32px em `item-card.tsx`, com o `CountBadge` (seção 4).
- Substitui o botão do carrinho do header, o "fechar" da sacola e o menu do `site-header`; no painel, os "remover" dos complementos (`item-form`) e o "⋯" do `Menu`. O compartilhar (`ShareButton`) e o "x" do `BottomSheet` desenham o mesmo círculo à mão, sem este componente (conferido em 2026-09-24).

**`Tooltip`** — `{ label: string; placement?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end'; children: ReactElement }`
- Bolha escura (`bg-gray-800 text-caption text-white rounded-sm shadow-high`, `max-w-64`), sem seta, igual ao toast. Abre no hover, no foco e no toque; fecha no Esc, ao sair e ao tocar fora — o clique só abre.
- Clona o filho para injetar `aria-describedby`. Com a bolha fechada o texto continua no DOM como `sr-only`.
- **O gatilho bloqueado usa `aria-disabled="true"`, nunca `disabled`**: botão desabilitado de verdade não recebe foco nem hover, e o motivo nunca apareceria. O `Button` já entende `aria-disabled` — pinta o estado desativado, tira o `press` e ignora o clique.
- É onde mora o motivo de uma ação indisponível (o bloqueio de publicar, em `publish-toggle.tsx`), em vez de um parágrafo embaixo do botão.

### Rótulos e indicadores

**Contador** — não há `Badge` solto em `ui/`. Na loja o contador é o `CountBadge` (`store/count-badge.tsx`, seção 4): círculo de 18px `bg-primary text-[11px] font-bold text-white`, `aria-hidden`, com `animate-badge-pop` só depois da carga.

**`Tag`** — `{ tone?: 'neutral' | 'ink' | 'promo' | 'positive' | 'warning' | 'error' | 'dark'; size?: 'sm' | 'md' }` (`ui/tag.tsx`)
- `rounded-xs font-bold`; `sm` = `px-1.5 py-0.5 text-[10px]` (padrão), `md` = `px-2 py-1 text-caption`.
- neutral `bg-gray-100 text-gray-600`; **ink** (2026-09-24) `bg-gray-100 text-gray-700`, o neutro das telas do cliente (o `gray-600` sobre `gray-100` dá 4,14:1; o `gray-700` passa de 4,5:1); promo `bg-primary-tint text-primary-pressed`; positive `bg-success-bg text-success`; warning `bg-warning-bg text-gray-700`; error `bg-error-bg text-error-pressed`; dark `bg-gray-800 text-white uppercase tracking-wide` (o OBRIGATÓRIO do iFood, única caixa alta do sistema — hoje só no passo obrigatório do `SetupWidget`; o selo do grupo de opções da loja é outro, seção 4).
- Onde, na loja: a primeira tag do item e o "Indisponível" sem foto (`ink`), "Entrega grátis acima de R$ 90,00" (`promo md`, com `BadgePercent`). No painel: "Prévia", "No ar", "Rascunho", "Esgotado", status de pagamento.
- Substitui as tags `flame` de item, "Indisponível", "Esgotado", "Prévia" e "Mais completo".

**`InfoCell`** (2026-09-24, `ui/info-cell.tsx`) — `{ icon; value: ReactNode; label: string; tone?: 'neutral' | 'positive'; className? }`
- `flex items-center gap-3`: ícone num círculo `size-8 rounded-full bg-gray-100 text-gray-700` (o ícone vem sem tamanho; a célula põe `size-4`), valor `text-body1 font-semibold text-gray-900` (`text-positive` com `tone="positive"`, o "Grátis"), legenda `text-body2 text-gray-600`, os dois `truncate`.
- Onde: `StoreIdentity`, duas lado a lado (`grid grid-cols-2 gap-4`, `lg:flex lg:gap-10`). Entrega: `Clock` com o prazo da zona mais barata · "Tempo de entrega"; `Bike` com a taxa · "Taxa de entrega" ou "Entrega a partir de". Retirada: `Clock` · "Tempo de preparo"; `Store` com a rua · "Retirar em". Célula sem dado não aparece, e a que sobra ganha `col-span-2`.

**`Avatar`** — `{ logo?: string; name: string; size?: 40 | 48 | 56 | 64; shape?: 'circle' | 'square' }` (`ui/avatar.tsx`)
- `logo` é o que o lojista cadastrou: URL (`isImageUrl`: `http(s)://` ou `/`) vira `<img>`; emoji fica centralizado; vazio mostra as iniciais das duas primeiras palavras (`text-body2`). Fundo `bg-gray-100 font-semibold text-gray-700`. Decorativo (`aria-hidden`): o nome vai sempre em texto ao lado. Sem cor de marca.
- `SHAPES`: circle `rounded-full border border-gray-200` (padrão); **square** (2026-09-24) `rounded-lg border-[3px] border-white shadow-low`, o logo da loja metade sobre a capa.
- Tamanhos 40/48/56 e **64** (2026-09-24, `size-16 text-h3`: o emoji cresce junto).
- Onde: `StoreIdentity` (`square 64`, `-mt-8 lg:-mt-10`). O painel não usa hoje.

**`Logo`** (`src/components/platform/logo.tsx`): marca + nome do Menu Online em SVG inline, `{ size?: 'sm' | 'md'; withName?: boolean }`. Substitui o glifo usado antes em `site-header`, `site-footer`, `painel/layout` e `demo-shell`.

### Estrutura

**`Container`** — `{ size?: 'page' | 'narrow'; as?: 'div' | 'section' | 'main' | 'ul' | 'ol' | 'nav' }`: `mx-auto w-full px-4 md:px-6 lg:px-8` com `max-w-page` (1200px) ou `max-w-narrow` (640px). O `w-full` é obrigatório (ver armadilha do `mx-auto` no SKILL.md). Substitui `.container-page` (34 usos). A loja escreve as mesmas classes à mão no `StoreMenu` e no `StoreFooter`.

**`Card`** — `{ padding?: 'none' | 'sm' | 'md' | 'lg'; interactive?: boolean; highlight?: boolean; as?: 'div' | 'section' | 'li' | 'article' }`: branco, `border border-gray-200 rounded-md`; `highlight` troca a borda por `border-2 border-gray-900` (plano em destaque) — é prop e não `className` porque, sem `tailwind-merge`, duas classes de borda brigariam; `interactive` acrescenta `shadow-low hover:shadow-medium press`. Substitui `.surface` e `.surface-hover`. Na prévia, é o cartão "Prévia" com "Voltar ao painel" acima da moldura.

**`StickyBottomBar`** (2026-09-24, `ui/sticky-bottom-bar.tsx`) — `{ children; tone?: 'white' | 'gradient'; position?: 'fixed' | 'sticky' | 'static'; className?; innerClassName? }`
- `POSITIONS`: `fixed` = `fixed inset-x-0 bottom-0 z-40` (padrão), `sticky` = `sticky bottom-0 z-40`, `static` = nada (o rodapé que já é o fim de uma coluna, como na sacola).
- `TONES`: `white` = `bg-white px-4 pt-3 pb-safe-4 shadow-up` (padrão; sombra para cima, sem `border-t`); `gradient` = `pointer-events-none bg-linear-to-t from-white via-white/95 via-45% to-transparent px-4 pt-12 pb-safe-4`, e o miolo volta a `pointer-events-auto` — o CTA flutua sobre o conteúdo que desbota.
- Miolo `mx-auto w-full` + `innerClassName` (largura máxima, alinhamento).
- Onde: `BottomBar` (`white`), CTA do prato e barra "Indisponível" (`gradient`, `className="lg:sticky"`: no desktop gruda no pé do painel que rola). O rodapé do Finalizar escreve as mesmas classes de `white` à mão.

**`Banner`** — `{ tone?: 'info' | 'warning' | 'error' | 'success' | 'promo' | 'neutral'; icon?; title?; children?; onDismiss?; role?: 'status' | 'alert'; radius?: 'sm' | 'md' }`
- `flex gap-3 text-body2 text-gray-700`, fundo `*-bg` (promo `bg-primary-tint`, neutral `bg-gray-50`, o padrão), ícone na cor cheia do tom (exceções: `warning` em `gray-700`, `neutral` em `gray-600`). `onDismiss` acrescenta o "x" de 32px ("Dispensar aviso").
- `RADIUS`: `sm` = `rounded-sm p-3` (padrão, painel); **`md`** = `rounded-md p-4` (2026-09-24): os avisos das telas do cliente, com canto e respiro de cartão.
- Onde `md`: `ClosedNotice` e `ReviewNotice` da sacola, pedido mínimo, aviso do Finalizar (`role="alert"`), prato indisponível, `DemoBanner compact` (a faixa do demo sob a identidade).
- Substitui `ClosedNotice`, `ReviewNotice`, `demo-banner`, os alertas dos formulários e o aviso do `item-order-panel`.

**`EmptyState`** — `{ icon; title; description?; action?; variant?: 'default' | 'hero' }`
- Centrado, `px-6 py-12`, entra com `animate-fade-in`.
- `default`: ícone Lucide `text-gray-400` (quem chama passa `size-12`), título `mt-4 text-subtitle font-semibold text-gray-700`, texto `mt-1 text-body2 text-gray-600`, ação `mt-6`.
- **`hero`** (2026-09-24): o vazio é a tela inteira. Ícone num círculo `size-24 rounded-full bg-gray-100 text-gray-600` (quem chama passa `size-10`), título `mt-6 font-display text-h5 font-bold text-gray-900`, texto `mt-2 text-body1`, ação `mt-8`.
- Onde: `hero` na sacola vazia e no `StoreMessage` (item não encontrado, erro da loja); `default` na busca sem resultado, no cardápio vazio (`UtensilsCrossed`), no painel e no demo.
- Substitui a sacola vazia, busca sem resultado, cardápio vazio, `not-found` e `error`.

**`Skeleton`** — `{ shape?: 'text' | 'rect' | 'circle' | 'bare' }` (utility `skeleton`)
- `text` = `h-4 rounded-xs`; `rect` = `rounded-sm` (padrão); `circle` = `rounded-full`; **`bare`** (2026-09-24) = sem altura nem raio, quem chama põe os dois.
- Composições no mesmo arquivo: `ItemRowSkeleton` (texto + `size-24 rounded-lg`, a linha do cardápio), `StoreSkeleton` (refeito em 2026-09-24: capa `h-60 lg:h-80`, folha `-mt-6 rounded-t-xl`, logo `size-16 rounded-lg -mt-8`, nome, status, pílula `h-12 w-48 rounded-full`, duas células, três abas, quatro linhas) e **`ItemSkeleton`** (novo: foto `h-72`, título, texto, preço, dois grupos com três linhas e círculo de 24, barra `h-12 rounded-full` no pé). Os dois com `role="status"` e texto `sr-only`.
- Onde: `DemoStoreLayout` (`demo-store.tsx`), `ItemSkeleton` no prato e `StoreSkeleton` no cardápio, antes de ler o cardápio do navegador; `StoreStatus` antes de hidratar (`bare h-4 w-40 rounded-xs`, o traço no lugar do "Aberto até"). As rotas `/r/[slug]` não têm `loading.tsx`, embora o comentário do `StoreSkeleton` fale nele (conferido em 2026-09-24).

### Formulário

**`TextField` / `SelectField` / `TextArea`** — `{ id; label; hint?; error?; required?; appearance?: 'outlined' | 'soft'; className? } & InputHTMLAttributes` (`ui/text-field.tsx`)
- Rótulo `mb-1.5 text-body2 font-medium text-gray-700` acima do campo; obrigatório leva asterisco `aria-hidden` + `sr-only` "(obrigatório)".
- Dica `mt-1 text-caption text-gray-600`; erro `mt-1 text-caption font-medium text-error` com `role="alert"`; o campo leva `aria-invalid` e `aria-describedby`.
- **`fieldClass(invalid, extra?, appearance = 'outlined')`** monta o campo; os três componentes e quem desenha campo próprio (CEP, observação do prato, link do compartilhar) passam por ela.
  - `outlined` (padrão, painel): `rounded-sm border bg-white px-4 text-body1`, `border-gray-300 focus:border-primary`, erro `border-error`. Sem anel de foco difuso.
  - **`soft`** (2026-09-24), um ramo à parte: `rounded-md border`, e `border-transparent bg-gray-50 focus:border-primary focus:bg-white` (erro: `border-error bg-white`), com `focus-visible:ring-2 focus-visible:ring-primary/40` — o formulário de checkout dos apps de delivery.
- A altura não mora no `fieldClass`: `TextField` e `SelectField` põem `h-12` nas duas aparências (`FIELD_HEIGHT`), o `TextArea` usa `min-h-24 resize-none py-3`, e quem chama `fieldClass` direto passa a altura em `extra`.
- **`SelectField`**: mesmo invólucro sobre `<select>` com `ChevronDown` à direita.
- Onde `soft`: todos os campos do Finalizar, o CEP (`DeliveryQuoteField`), a observação do prato e o link do menu de compartilhar.
- Substitui `Field` (4 cópias), `inputClass` (5 cópias) e `.field-input*`. Ainda sobram `Field`/`inputClass` locais em `business-form`, `onboarding-form`, `account-forms` e `auth-form` (conferido em 2026-09-24). Mantenha `id`, `name`, `autoComplete` e `inputMode` exatamente como estão.

**`PhoneInput`** (`ui/phone-input.tsx`) — `{ id; name; defaultValue?; invalid?; required? }`: seletor de país com busca (combobox + `aria-activedescendant`, 245 países) e o número com a máscara do país; o formulário recebe um valor só, em E.164. Onde: WhatsApp do lojista no `onboarding-form` e no `business-form`.

**Linhas de opção** — não há `RadioRow`/`CheckboxRow` em `ui/`: moram em `store/option-row.tsx` (seção 4), com o controle de 24px à direita.

**`SegmentedControl`** — `{ options: { value; label; icon?; disabled?; hint? }[]; value; onChange; label; size?: 'md' | 'lg'; indicator?: 'fill' | 'sliding'; className? }`
- `role="radiogroup"` com `aria-label`; cada opção é `role="radio"` com roving tabindex; as setas trocam a opção e levam o foco junto, **pulando as `disabled`**. Trilho `flex rounded-full bg-gray-100 p-1`.
- `size`: `md` = `h-10 text-body2` (padrão); **`lg`** = `h-11 px-5 text-body1` (2026-09-24), com espaço para a segunda linha do `hint`.
- `indicator="fill"` (padrão, painel): cada opção pinta o próprio fundo — ativa `bg-white text-gray-700 shadow-low`, inativa `text-gray-600`.
- **`indicator="sliding"`** (2026-09-24): uma pílula branca só (`absolute inset-y-1 left-1 rounded-full bg-white shadow-low`), com largura `calc((100%-0.5rem)/var(--segments))` e `translate-x-[calc(var(--segment)*100%)]`, desliza em 200ms (`ease-standard`) até a ativa; botões `relative z-10 hit-y-44`, ativo `text-gray-900`, inativo `text-gray-700` (o `gray-600` sobre `gray-100` dá 4,14:1).
- Opção **`disabled`** (2026-09-24): `aria-disabled`, `text-gray-400 cursor-not-allowed`, sem clique. **`hint`**: segunda linha `text-caption font-normal` ("Indisponível").
- Onde: `StoreIdentity` (`lg sliding`; a opção desligada vem `disabled` com `hint="Indisponível"`), `OrderModeControl` na sacola e no Finalizar (`md sliding`, com `Bike`/`Store`), `business-form` (`md fill`). Substitui o `ModeButton` de Entrega/Retirada.

**`Stepper`** — `{ value; min?: number (1); max?: number (99); onChange; onRemove?; size?: 'sm' | 'md' | 'lg'; variant?: 'outlined' | 'plain' | 'soft' | 'floating'; orientation?: 'horizontal' | 'vertical'; label; disabled?; className? }`
- `SIZES` (botão · ícone · número): `sm` `size-8` · `size-4` · `min-w-6 text-body2`; `md` `size-10` · `size-5` · `min-w-8 text-body1` (padrão); **`lg`** `size-14` · `size-6` · `min-w-10 text-subtitle` (2026-09-24, o stepper grande do prato).
- `FRAMES`: `outlined` `rounded-sm border border-gray-300 bg-white` (padrão); `plain` nada; **`soft`** `rounded-full bg-gray-100`; **`floating`** `rounded-full bg-white shadow-medium` (2026-09-24); **`glass`** `glass rounded-full` (2026-09-25, a pílula sobre a foto do cardápio; o vidro é o `@utility glass` do `globals.css`, com anel interno em vez de borda para ficar em 88×32). `INK`: `outlined`/`plain` pintam os glifos de `text-primary`; `soft`/`floating`/`glass`, de `text-gray-900`, como na referência.
- Nas pílulas (`soft`/`floating`) cada botão é um círculo que escurece no toque (`rounded-full active:bg-black/5`), e no `sm` ganha `hit-44` — o número de 24 no meio separa os dois alvos.
- Número `font-semibold tabular-nums text-gray-700` com `aria-live="polite"`; troca com `animate-fade-in` (`key={value}`). Com `onRemove`, no mínimo o "−" vira lixeira e remove (sacola e cardápio); sem ele, o "−" desabilita (prato). `disabled` = `opacity-60`.
- `orientation="vertical"` empilha "+ / número / −" numa coluna da largura de um botão, com o aumentar em cima. Continua na API; ninguém usa hoje.
- Onde: prato `lg soft` (`min=1`, centrado antes do CTA); linha da sacola `sm soft` com `onRemove`; adicional com quantidade `sm soft` (`StepperRow`, `min=0`); pílula do cardápio `sm glass` sobre a foto e `sm floating` sem foto, com `onRemove` (`QuickPill`). O painel não usa mais.

**`SearchBar`** (2026-09-24, `ui/search-bar.tsx`) — `{ id; value; onChange; onClear; onCancel?; placeholder?: string ('Buscar no cardápio'); className? }`
- `<label class="sr-only">` com o placeholder; pílula `h-11 rounded-xl bg-gray-100 pl-4` com `Search size-5 text-gray-400`, que vira `bg-white shadow-medium` com o foco dentro; `input type="search" text-body1`, `enterKeyHint="search"`, `autoComplete="off"`, sem o "x" nativo.
- "x" "Limpar busca" de 44px só com texto; "Cancelar" (`h-11 rounded-full px-2 text-body1 font-semibold text-primary`) só com `onCancel`.
- Enter faz `blur` (fecha o teclado; a lista já filtra enquanto digita); Esc chama `onCancel`.
- Sem `autoFocus`: quem abre foca pelo `id` dentro do toque (`flushSync` + `focus()`), ou o teclado do iOS não abre.
- Onde: `StoreHeader` com a busca aberta (`id="busca-cardapio"`, exportado como `SEARCH_INPUT_ID`), depois do "‹" "Fechar busca".

**`Switch`** — `{ checked; onChange; label; disabled? }` (`ui/switch.tsx`): `role="switch"`, trilho `h-6 w-11 rounded-full bg-gray-300` → `bg-positive`, bolinha branca com `translate-x` em 150ms. Para o dia aberto/fechado dos horários (`business-form`) e o disponível/esgotado de cada linha do cardápio (`menu-editor`); o publicar é um `Button` (conferido em 2026-09-24).

**`Menu`** — `{ label; items: { label; icon?; onSelect; disabled?; destructive? }[] }` (`ui/menu.tsx`, sobre `@radix-ui/react-dropdown-menu`): o "⋯" (`IconButton` com `MoreHorizontal`) abre uma lista curta ancorada, `rounded-sm border border-gray-200 bg-white p-1.5 shadow-high`, itens de 40px com ícone; os `destructive` ficam em `text-error` depois de um divisor. Foco, setas, Esc e clique fora vêm do Radix. Usado nas opções da categoria.

**`ImageUpload`** — `{ label; labelledBy?; value; preview?; busy?; disabled?; invalid?; shape?: 'square' | 'circle' | 'wide'; noun?: 'foto' | 'imagem'; describedBy?; onFile; onRemove; onReject? }` (`ui/image-upload.tsx`)
- A imagem ocupa o quadro e, centralizados sobre ela, os `IconButton raised` de trocar (`Pencil`) e remover (`Trash2`), sempre visíveis; vazio, o quadro inteiro abre o seletor (`ImagePlus`); aceita soltar arquivo (fica `primary-tint` com `Upload`) e colar. Sem botão ao lado (decisão do dono, 2026-09-23). O envio fica com quem chama.
- `SHAPES`: `square` `size-32 rounded-md` (foto do prato), `circle` `size-32 rounded-full` (logo), **`wide`** `aspect-[2/1] w-full max-w-sm rounded-md` (2026-09-24, a capa).
- Sem rótulo próprio: com `labelledBy` ele aponta para um rótulo visível de quem chama; sem, `label` vira `aria-label`.
- **`ImageField`** (`painel/image-field.tsx`) é quem chama: reduz a imagem no navegador, envia para `/api/imagens` (servida depois em `/img/<id>`) e guarda o valor num `<input type="hidden">`. `kind?: 'foto' | 'logo' | 'capa'` escolhe `shape` e `noun` (`KINDS`): foto → `square`/foto, logo → `circle`/imagem, **capa** → `wide`/foto (2026-09-24, D30). `showLabel` mostra o rótulo acima do quadro. Na aba Identidade: "Capa do cardápio" (`id="cover"`, `kind="capa"`, `showLabel`), com a legenda "Aparece no topo do cardápio, atrás da logo…".

### Navegação e sobreposição

**`Tabs`** (portada de `assets/ui/tabs.tsx` para `ui/tabs.tsx` em 2026-09-24) — `{ items: { id; label; href? }[]; activeId; onSelect?; label; tone?: 'primary' | 'ink'; size?: 'md' | 'lg'; className?; listClassName? }`
- `<nav aria-label>` com `border-b border-gray-200 bg-white` e uma `ul` rolável sem barra; texto puro `font-semibold`, inativa `text-gray-600`.
- `TONES`: `primary` = ativa `text-primary`, traço `h-0.5 bg-primary` (padrão); **`ink`** = ativa `text-gray-900`, traço `h-[3px] rounded-full bg-gray-900` (2026-09-24, as abas de categoria dos apps de delivery).
- `TAB_SIZES`: `md` = `px-4 py-3.5 text-body2`; **`lg`** = `min-h-11 px-3 py-3 text-body1`.
- O traço é um `li` absoluto posicionado direto no DOM (`width` + `translateX`, 200ms), recalculado por `ResizeObserver`, sem estado; a ativa rola para o centro da lista (só a lista, nunca a página; `scrollBehavior()` respeita reduced-motion).
- Com `href`, `Link` com `aria-current="page"`; sem, `button` com `aria-current="true"`, roving tabindex (uma parada de Tab) e ←/→/Home/End.
- `listClassName` alinha a primeira aba à margem: no cardápio o contêiner é `-mx-4 md:-mx-6 lg:-mx-8` e a lista `px-1 md:px-3 lg:px-5`.
- Onde: `MenuBrowser` (`tone="ink" size="lg" label="Categorias"`, contêiner `sticky top-(--top-inset) z-30`) e a vitrine do hero da landing (`tone="ink" size="lg" label="Categorias"`, lista `px-1`, sem `onSelect`). O `DashboardNav` do painel é outro componente.

**`BottomSheet`** — `{ open; onClose; title?; labelledBy?; ariaLabel?; children; footer?; snap?: 'auto' | 'full'; enterFrom?: 'bottom' | 'right'; desktop?: 'dialog' | 'sheet' | 'drawer'; closeSide?: 'start' | 'end'; scroll?: 'wrapper' | 'child'; lockScroll?; className? }`
- `<dialog>` nativo com `showModal()`: foco preso, Esc, top layer e fundo inerte vêm do navegador.
- `snap="auto"`: até 90dvh, `rounded-t-lg`, alça arrastável. `snap="full"`: `h-dvh`; com `enterFrom="right"`, entra e sai pela direita, como página.
- `desktop`: `dialog` (padrão) vira dialog centrado `lg:max-w-md lg:max-h-[85dvh] lg:rounded-lg lg:shadow-highest`, com `pop-in/out`; `sheet` continua sheet; **`drawer`** (2026-09-24) encosta à direita na altura toda — `lg:h-dvh lg:w-[27.5rem]` (440) `lg:max-w-full lg:shadow-highest`, sem cantos —, e a entrada pela direita vem do `enterFrom="right"`. A alça some no `lg` do dialog e do drawer.
- **`closeSide`** (2026-09-24): `end` (padrão) põe o título `text-subtitle font-bold text-gray-700` à esquerda e o "x" ("Fechar", 40px) à direita; `start` põe o mesmo botão antes do título, que vira `font-display text-h6 font-bold text-gray-900`. As telas do cliente fecham à esquerda.
- **`scroll`** (2026-09-24): `wrapper` (padrão) — rola o invólucro do conteúdo (`overflow-y-auto overscroll-contain`); `child` — o invólucro fica `overflow-hidden` e quem rola é o filho (uma coluna `flex min-h-0 flex-1 flex-col` com cabeçalho, área rolável e rodapé próprios: a sacola). Evita dois roláveis aninhados.
- **Fechamento nativo** (2026-09-24, sem prop): o voltar do Android sem ativação do usuário manda um `cancel` que não dá para cancelar, e o `<dialog>` fecha sozinho. O `close` que não veio do próprio componente chama `onClose` uma vez só (o par `cancel` + `close` não repete) e, se o dono do estado continua com `open` verdadeiro — a sacola voltou do Finalizar para a Sacola —, o `<dialog>` volta ao top layer.
- Sai animado (desmontagem adiada, 200ms), fecha por Esc, scrim e arrasto, devolve o foco ao gatilho.
- Ao abrir, o foco vai para o painel (não para o botão fechar, que acenderia o anel de foco). Para focar um campo, marque-o com `data-autofocus`.
- `footer`: `border-t border-gray-200 bg-white px-4 pt-4 pb-safe-4 lg:pb-4`.
- `lockScroll={false}` quando o `StoreProvider` já trava o `body`. Nunca os dois.
- Onde: `CartSheet` (`snap="full" enterFrom="right" desktop="drawer" scroll="child" lockScroll={false}`, `labelledBy`), `StoreAboutSheet` (`title="Sobre a loja" closeSide="start"`), `ShareButton` (`closeSide` repassado; `start` na pílula da loja), `ConfirmDialog`, menu do `site-header`, `demo-account`.

**`ConfirmDialog`** — `{ open; onClose; title; description?; confirmLabel; cancelLabel?: string ('Cancelar'); onConfirm; lockScroll?; appearance?: 'panel' | 'store' }`
- Um `BottomSheet` com dois botões `flex-1` no `footer`: `text` para cancelar à esquerda, `primary` para confirmar à direita (D24); confirmar chama `onConfirm` e depois `onClose`. Não há prop `destructive`.
- **`appearance="store"`** (2026-09-24): `closeSide="start"` e botões `size="cta" pill`. `panel` (padrão): `size="md"`, fechar à direita.
- Onde: "Limpar sacola?" (`store`, `lockScroll={false}`); no painel, "Excluir “…”?" da categoria (`menu-editor`) e do item (`item-form`) e "Cancelar a renovação?" (`cancel-subscription-button`).

**`Toast`** — `useToast()` devolve `toast('Link copiado')` ou `toast({ message, tone?: 'neutral' | 'success' | 'error', action?: { label; onClick }, duration? })`
- Faixa `rounded-sm bg-gray-800 px-4 py-3 text-body2 text-white shadow-high` (`max-w-md`), uma por vez (a nova substitui). A região `role="status" aria-live="polite"` fica sempre montada.
- Posição `fixed … bottom-[calc(var(--bottom-bar-height)+0.5rem+var(--safe-bottom))] z-80`: acima da barra da sacola e da área segura.
- Ícone: `success` `CheckCircle2 text-positive`; `error` `CircleAlert text-error`.
- **Com `action`**: botão `font-semibold text-primary-tint` à direita, que executa e dispensa. Desde 2026-09-24 o toast com ação dura **5s** (sem ação, 3s), para dar tempo de alcançar o botão (WCAG 2.2.1), e a loja passou a usá-lo.
- Onde: "Adicionado à sacola · Ver sacola" do prato (junto com `tapHaptic()`); painel. Na prévia o `ToastProvider` mora dentro da moldura (seção 4).
- Substitui o "✓" de 1,4s do quick-add, os "Copiado!" e os parágrafos de sucesso do painel.

### Receitas sem arquivo

Não existem em `src/` (conferido em 2026-09-24). A receita fica para quando forem necessários; hoje cada tela resolve com classes.

- **`Chip`** — `{ selected?; leading?; onClick? }`: pílula de 32px `border border-gray-300 text-body2`; selecionado `border-gray-800 bg-gray-800 text-white`. Para filtros e sugestões.
- **`Price`** — `{ value: number; original?: number; size?: 'sm' | 'md' | 'lg'; from?: boolean }`: usa `formatPrice`; com `original`, o valor novo fica `text-positive` e o antigo riscado em `text-caption text-gray-400`; `from` prefixa "a partir de". O modelo de dados ainda não tem promoção.
- **`Divider`** — `{ thick?: boolean; inset?: boolean }`: `h-px bg-gray-200`, ou `h-2 bg-gray-50` (o separador grosso do iFood). As listas das telas do cliente (itens do cardápio, opções do prato, linhas da sacola) saíram dos divisores em 2026-09-24 e separam por respiro; o que sobrou de linha é o `divide-y` das seções do "Sobre a loja", os dois `border-t` do `StoreFooter` e o `border-b` das barras (a compacta do topo, a do prato e as `Tabs`).
- **`ListRow`** — `{ leading?; title; description?; trailing?; href?; onClick?; divider?: boolean }`: `flex min-h-14 items-center gap-3 px-4 py-3`, título `text-body1 text-gray-700`, descrição `text-body2 text-gray-600`; com `href` ou `onClick`, `press` e `ChevronRight`.
- **`AppBar`** — `{ leading?; title?; trailing?; sticky?; bordered? }`: 56px, branco, título centralizado e truncado. Na loja o papel é do `StoreHeader`, do `ItemHero` e do cabeçalho do `CartPanel`.

## 4. Componentes da loja (`store/`)

Refeitos em 2026-09-24 na estrutura de app de delivery (D25–D31); a anatomia tela a tela está em `screens-cliente.md`. Aqui ficam arquivo, props e quem usa. Todos em `src/components/store/`; sem `'use client'`: `store-frame`, `store-menu`, `store-cover`, `store-screen`, `store-footer`, `item-detail`, `dish-image`, `option-group` (importado por cliente), `cart/cart-notices`, `store-unavailable` e os módulos `nav-layers.ts`/`nav-marker.ts` (sem React).

### Casca, estado e navegação

| Componente | Arquivo | Props principais | Onde é usado |
|---|---|---|---|
| `StoreFrame` | `store-frame.tsx` | `business`, `menu`, `notice?`, `embedded?`, `basePath?`, `children` | `app/r/[slug]/layout.tsx`, `DemoStoreLayout` (`notice={<DemoBanner compact />}`), `PreviewFrame` (`embedded basePath="/painel/previa"`) |
| `EmbeddedShell` | `store-shell.tsx` | `children` | só o `StoreFrame embedded` |
| `StoreProvider`, `useStore()` | `store-provider.tsx` | `business`, `menu`, `basePath?` (`/r/<slug>`), `embedded?`, `history?` (`true`), `notice?` | `StoreFrame`; vitrines da landing (`hero-demo`, `step-panel`) com `history={false}` |
| `useCartSelector`, `useCartStore`, `useMountAnimation` | `store-provider.tsx` | `select(cart)` (devolva primitivo) · — · — | `ItemCard` (os três); `useMountAnimation` também em `CountBadge` e `CartBar` |
| `nav-layers` | `nav-layers.ts` | tipo `Layer`; `readLayers`, `readLayersOnServer`, `subscribeLayers`, `emitLayers`, `pushLayer`, `replaceLayer`, `popLayers(n)`, `patchHistoryState` | `StoreProvider`, `CartSheet` (`popLayers(1)`), `nav-marker` (`patchHistoryState`) |
| `nav-marker` | `nav-marker.ts` | `rememberMenuPosition(slug, href, from, scrollY)`, `adoptNavMarker(slug)`, `currentNavOrigin()`, `savedMenuScroll()` | `ItemCard`, `CartLineRow`, `useBackToMenu`, `MenuBrowser` |
| `useBackToMenu()` | `use-back-to-menu.ts` | → `{ back, origin }` | `ItemHero`, `ItemOrderPanel`, `StoreMessage` |
| `useStoreRoute()` | `use-store-route.ts` | → `{ view: 'menu' \| 'item', pathname, basePath, embedded }` | `StoreHeader`, `CartBar`, `HideOnItem` |
| `ScrollRootContext`, `useScrollRoot()`, `readScrollTop`, `writeScrollTop` | `scroll-root.tsx` | — | `EmbeddedShell` (provê); `StoreIdentity`, `ItemHero`, `MenuBrowser`, `ItemCard`, `CartLineRow` |
| `StoreScreen` | `store-screen.tsx` | `children`; exporta `NAV_FORWARD`, `NAV_BACK` | `StoreMenu`, `ItemDetail` |
| `HideOnItem` | `hide-on-item.tsx` | `children` | `StoreFrame` (tira o rodapé no prato) |
| `useSearchParam(name)` | `use-search-param.ts` | → `string` (`''` no servidor e antes de hidratar) | `ItemOrderPanel` (`?editar=`) |
| `useShareUrl(business, menu)` | `use-share-url.ts` | → `{ url, tooBigForQr }` | `StoreHeader` (compartilhar), `demo-pages` |
| `StoreUnavailable` | `store-unavailable.tsx` | `business` | `app/r/[slug]/layout.tsx` (assinatura vencida: a página inteira é o aviso, sem casca) |

- **`StoreFrame`** monta, uma vez e no LAYOUT, `StoreProvider` + `ToastProvider` e em volta do `main` o `StoreHeader`, o `StoreFooter` (via `HideOnItem`), a `CartBar`, a `CartSheet` e o `StoreAboutSheet`: a casca sobrevive à troca entre cardápio e prato. Público: `flex min-h-dvh flex-col bg-white`, `main id="conteudo"`. Embutido: sem o `id` (o `#conteudo` é o do painel) e tudo dentro do `EmbeddedShell`, com o `ToastProvider` dentro da moldura.
- **`EmbeddedShell`** é a moldura da prévia: `relative h-(--screen-height) transform-gpu overflow-hidden rounded-md border border-gray-200 bg-white`, redeclarando `--safe-top:0px`, `--safe-bottom:0px`, `--screen-height:min(80dvh,56rem)` e `--top-inset:var(--top-bar-height)`; dentro, o scroller `h-full overflow-y-auto overscroll-contain`, entregue pelo `ScrollRootContext`. O `transform` faz dela o bloco de contenção dos `fixed` da loja — barra do topo, barra da sacola, CTA do prato e toast ficam presos à moldura. Os sheets (`<dialog>`) continuam no top layer e cobrem o painel.
- **`StoreProvider`** expõe pelo `useStore()`: os dados (`business`, `menu`, `basePath`, `embedded`, `notice`), a sacola (`cart`, `customer`, `itemCount`, `subtotal`, `deliveryFee`, `total`, `deliveryFeeKnown`, `review`, `hydrated`), o que é derivado das camadas (`isOpen`, `step`, `searchOpen`), `lastOrderUrl` (`sessionStorage['menuqr.lastOrder.<businessId>']`), `search`, `aboutOpen`, `compactHeader` (nasce `true` na prévia) e as ações `addItem`, `updateLine`, `setQuantity`, `removeLine`, `clearCart`, `updateCustomer`, `dismissReview`, `openCart(step?)`, `closeCart()`, `goToStep(step)`, `openCartAfterNav()`, `setLastOrderUrl`, `openSearch`/`closeSearch`/`setSearch`, `openAbout`/`closeAbout`, `setCompactHeader`. `useCartSelector` lê um pedaço da sacola (só a linha que mudou renderiza); `useCartStore` dá o store estável para as ações; `useMountAnimation` diz se quem monta agora anima — nada pula na carga da página. Comportamentos que moram nele: `history={false}` troca a assinatura das camadas por uma vazia e deixa `openCart`, `closeCart`, `goToStep`, `openSearch` e `closeSearch` sem efeito (as vitrines da landing não mexem no histórico da página); a busca é apagada quando a camada `search` sai, mas não quando a pessoa abriu um prato pelos resultados (a camada volta com o voltar, e o termo tem de estar lá); do Enviado, o voltar do sistema cairia na Sacola já vazia, e ele volta mais uma; `openCartAfterNav` faz `router.replace(basePath)` e empurra `cart` quando o pathname chega ao cardápio; com a sacola aberta, trava a rolagem do `body` (por isso a `CartSheet` e o "Limpar sacola?" passam `lockScroll={false}`; o "Sobre a loja" e o compartilhar, que abrem com a sacola fechada, travam sozinhos).
- **`nav-layers`** (D26): cada camada (`'search' | 'cart' | 'checkout' | 'done'`) é uma entrada do histórico em `history.state.mq`, sem URL. `pushLayer` é idempotente (não repete o topo: o modo estrito roda efeitos duas vezes); `replaceLayer` troca o topo (Finalizar → Enviado); `popLayers(n)` = `history.go(-n)`, e quem avisa a interface é o `popstate`. As chaves próprias (`mq`, `mqScrollY`, `mqFrom`) sobrevivem quando o Next regrava a mesma entrada. Nunca empurre camada no mesmo tique de um `router.push/replace`: use `openCartAfterNav`.
- **`nav-marker` + `useBackToMenu`** (D27): o `onClick` do link que abre o prato grava `sessionStorage['menuqr.nav']` (`{ slug, from: 'menu' | 'cart', to }`) e a rolagem na entrada do cardápio (`mqScrollY`); o prato adota a origem em `history.state.mqFrom`. `back()`: com origem e `history.length > 1`, `router.back()` (a loja volta na mesma rolagem, ou com a sacola reaberta); senão `router.replace(basePath, { transitionTypes: ['nav-back'] })`.
- **`StoreScreen`** (D31): `<ViewTransition enter exit default="none">` com `nav-forward` (`vt-push-in`/`vt-push-out`: o prato entra da direita) e `nav-back` (`vt-pop-in`/`vt-pop-out`). Envolve o conteúdo de cada página, nunca o layout. `default="none"`: a busca (`useDeferredValue`) e o `router.refresh()` também são transições e não podem animar. `router.back()` e o voltar do navegador trocam seco. Em `globals.css`, as regras `::view-transition-old/new(.vt-*)` ficam dentro de `prefers-reduced-motion: no-preference` (os keyframes `vt-*` ficam fora), e o bloco `reduce` zera a duração dos pseudo-elementos.

### Cardápio

| Componente | Arquivo | Props principais | Onde é usado |
|---|---|---|---|
| `StoreMenu` | `store-menu.tsx` | `business`, `categories`, `basePath?` | `app/r/[slug]/page.tsx`, demo, prévia |
| `StoreCover` | `store-cover.tsx` | `cover?`, `alt`, `className?` | `StoreMenu` |
| `StoreHeader` | `store-header.tsx` | `layout?: 'floating' \| 'bar'`, `forceCompact?` | `StoreFrame` (`floating`); hero da landing (`layout="bar"`) |
| `StoreIdentity` | `store-identity.tsx` | — (lê `useStore()`) | `StoreMenu` |
| `StoreStatus` | `store-status.tsx` | `business`, `className?` | `StoreIdentity` |
| `useOpeningStatus` | `use-opening-status.ts` | `business` → `OpeningStatus \| null` | `StoreStatus`, `ItemClosedNote` |
| `StoreAboutSheet` | `store-about-sheet.tsx` | — (lê `aboutOpen`) | `StoreFrame` (uma vez) |
| `AboutButton` | `about-button.tsx` | — | `StoreFooter` |
| `StoreFooter` | `store-footer.tsx` | `business` | `StoreFrame` |
| `SearchAware` | `search-aware.tsx` | `children` | `StoreMenu` (capa e identidade) |
| `MenuBrowser` | `menu-browser.tsx` | `categories`, `basePath` | `StoreMenu` |
| `ItemCard` | `item-card.tsx` | `item`, `basePath`, `storeSlug?`, `priority?` | `MenuBrowser` (lista e busca), `hero-demo`, `step-panel` |
| `DishImage` | `dish-image.tsx` | `image`, `alt`, `emojiSize?: 'sm' \| 'md' \| 'lg'`, `sizes?`, `priority?`, `surface?: 'gray' \| 'white'`, `fade?` (`false`), `className?` | `ItemCard`, `ItemDetail`, `CartLineRow`; fora da loja, a miniatura do `menu-editor` (painel) e o `step-panel` (landing) |
| `FadeImage` | `fade-image.tsx` | `src`, `alt`, `sizes`, `priority?`, `optimized`, `fade?` (`true`) | `DishImage`, `StoreCover` |
| `CountBadge` | `count-badge.tsx` | `count`, `className?` | `StoreHeader` (sacola), `ItemCard` ("+") |
| `BottomBar` | `bottom-bar.tsx` | `total`, `totalSuffix?`, `label`, `after?`, `onClick?`, `position?`, `className?`, `buttonProps?` | `CartBar`, `BagStep` |
| `CartBar` | `cart-bar.tsx` | — | `StoreFrame`, `hero-demo` |

- **`StoreMenu`**: `StoreScreen` › `h1 sr-only` "Cardápio do {loja}" › `SearchAware(StoreCover)` › folha `relative -mt-6 rounded-t-xl bg-white lg:rounded-none` com o miolo `max-w-page px-4 md:px-6 lg:px-8` › `SearchAware(StoreIdentity)` › `MenuBrowser`, ou `EmptyState` "Este cardápio ainda não tem itens publicados." (`UtensilsCrossed`).
- **`StoreCover`** (D30): `relative h-60 w-full overflow-hidden lg:h-80 [overflow-anchor:none]`; com foto, `FadeImage priority sizes="100vw"` sobre `bg-gray-100`; sem foto, a utility `cover-fallback` (o papel de parede da conversa, parado). Nada de texto sobre a capa.
- **`StoreHeader`** `floating`: `header data-store-top-bar fixed inset-x-0 top-0 z-50 pt-safe pointer-events-none`, linha `h-14` no `max-w-page`. À esquerda o "‹" "Voltar" (`IconButton raised lg`, `focus-ring-photo`; `router.back()`, ou `router.push('/')` sem histórico; só aparece depois de hidratar, se `history.length > 1`; não existe na prévia nem no prato). À direita a pílula `rounded-full p-0.5 bg-white shadow-medium` com "Buscar no cardápio", `ShareButton closeSide="start"` e "Abrir sacola com N itens"/"Abrir sacola vazia" + `CountBadge`. A barra branca é uma camada atrás dos botões que entra com fade e 4px (150ms), sem mudar altura; com ela a pílula fica transparente, o "‹" vira `plain` e o nome (`text-body1 font-semibold text-gray-900`, `aria-hidden` enquanto invisível) aparece. Fica compacta com `compactHeader`, no prato, com a busca aberta, com `forceCompact` (sem uso hoje) ou em `layout="bar"`. Busca aberta: a linha vira "‹" "Fechar busca" + `SearchBar`, aberta no mesmo toque (`flushSync` + `focus()`). No prato: `hidden lg:block`. `layout="bar"`: a barra no fluxo, sem "‹", para a vitrine da landing.
- **`StoreIdentity`**: `Avatar square 64` (`-mt-8 lg:-mt-10`); nome `p.font-display.text-h4.lg:text-h3.font-bold.text-gray-900.truncate` (o `h1` fica `sr-only`) com o `StoreStatus` embaixo; chevron `IconButton tonal sm hit` "Sobre a loja" → `openAbout`; `SegmentedControl lg sliding` (`max-w-72`, centrado no celular e à esquerda no `lg`; some se nenhum modo estiver ligado) → `updateCustomer({ mode })`; `InfoCell`s; `Tag promo md` com `BadgePercent` "Entrega grátis acima de R$ X" (só entrega com `freeAbove`); o `notice` do provider (a faixa do demo); e a sentinela `data-store-hero-end` (`h-px`) com o `IntersectionObserver` — `rootMargin` = altura medida de `[data-store-top-bar]`, `root` = moldura na prévia — que chama `setCompactHeader`, só no callback, e volta a `false` no cleanup.
- **`StoreStatus`**: `p aria-live="polite"` com ponto `size-2` (`bg-positive`/`bg-gray-400`) e `text-body1 font-semibold` — aberto `text-positive` "Aberto até HH:MM" (`status.closesAt`); fechado `text-gray-700` com `describeNextOpening`. Antes de hidratar, `Skeleton bare h-4 w-40`. Segunda linha "Pedido mínimo R$ X" `text-body2 text-gray-600` (entrega com mínimo). `useOpeningStatus` calcula depois da hidratação, a cada minuto, no fuso do restaurante; o mesmo hook alimenta o `ItemClosedNote` ("Fechado agora · o pedido fica para quando abrir", sob o preço do prato).
- **`StoreAboutSheet`**: `BottomSheet title="Sobre a loja" closeSide="start"`; o conteúdo só existe aberto (lê o relógio sem tocar no ISR): tagline e descrição, e seções com ícone num círculo `size-8 bg-gray-100` — Endereço (`MapPin`), Horário de funcionamento (`Clock`, sete linhas, hoje em `font-semibold text-gray-900`), Contato (`MessageCircle`, `AtSign`), Entrega (`Bike`), Retirada no local (`Store`) —, separadas por `divide-y`.
- **`AboutButton`**: `Button text sm pill after={<NavIcon/>}` "Horários, entrega e contato" → `openAbout`; existe porque o `StoreFooter` é server.
- **`StoreFooter`**: `mt-12 border-t`; NAP — nome `text-body1 font-semibold text-gray-900`; `<address>`, WhatsApp e Instagram em `text-body2 text-gray-600` —, o `AboutButton` e os créditos `text-caption`.
- **`SearchAware`**: `hidden` com a busca aberta. Capa e identidade continuam no HTML.
- **`MenuBrowser`**: `Tabs ink lg` num contêiner `sticky top-(--top-inset) z-30`; seções `pt-8` com `h2.font-display.text-h5.font-bold.text-gray-900` e descrição `text-body2`; `ul.mt-2.lg:grid.lg:grid-cols-2.lg:gap-x-10` de `ItemCard` (`priority` nos dois primeiros da primeira seção); scroll-spy com `rootMargin` medido (barra + abas); restaura `mqScrollY` num `useLayoutEffect`. Com a busca aberta, só os resultados (`pt-[calc(var(--top-inset)+2.5rem)]`): "N resultados para “q”", a lista, ou `EmptyState` com "Limpar busca"; filtro por `useDeferredValue` (nome, descrição, categoria e tags, sem acento nem caixa) e anúncio `sr-only` por timer de 500ms. Busca aberta sem termo: "Busque por prato, ingrediente ou categoria.". Abrir a busca leva a lista ao topo e fechar devolve a rolagem de antes; `?busca=termo` na URL abre a busca preenchida; na página pública, `history.scrollRestoration = 'manual'`, porque quem restaura é o efeito, e não o navegador.
- **`ItemCard`** (`memo`): `li.relative` › `Link` (`press -mx-4 flex gap-4 px-4 py-4 active:bg-gray-50 lg:rounded-md lg:hover:bg-gray-50`, `transitionTypes={['nav-forward']}` fora da prévia; com `storeSlug`, o clique grava a posição) com nome `h3.line-clamp-2.text-subtitle.font-semibold.text-gray-700`, descrição `line-clamp-1 text-body2 text-gray-600`, preço `text-body1 font-bold tabular-nums text-gray-900` + a primeira tag (`Tag ink`), e a foto `DishImage size-28 rounded-lg` (`sizes="112px"`, `fade`; era `size-24` até 2026-09-25). A ação é **irmã** do link (interativo dentro de link navegaria), `absolute`: com foto em `right-2 top-22`, sobre o canto de baixo da foto, num círculo `glass text-gray-900 hover:bg-white/85` (até 2026-09-25, branco com sombra); sem foto em `right-0 top-1/2 -translate-y-1/2`, círculo `bg-gray-100`, com o texto em `pr-12`. Quatro estados: quick-add = `<button>` 32 `hit-44` "Adicionar {nome} à sacola" + `CountBadge`; com obrigatório = o mesmo círculo como `Link` "Escolher as opções de {nome}"; na sacola = `QuickPill` (`Stepper sm floating` com `onRemove`, `role="group" aria-label="{nome} na sacola"`, sobre a foto `Stepper sm glass` em `right-14 top-22 translate-x-1/2`, centrada na foto, com `animate-pill-morph` (sai com `animate-pill-morph-out`, e o `animationend` é que chama `setQuantity(uid, 0)`), sem foto `sm floating` com `animate-pill-reveal`; só anima depois da carga); indisponível = sem ação, `opacity-60`, foto `grayscale` com o selo "Indisponível" `bg-gray-800/85` (sem foto, `Tag ink`).
- **`DishImage`**: foto enviada ou do projeto → `FadeImage` otimizada; URL externa → `<img>`; emoji → sobre o fundo (`gray` = `bg-gray-100`, padrão; `white` no prato). Emoji `sm text-h5`, `md text-[2.5rem]`, `lg text-[5rem] sm:text-[7rem]`. Na lista `size-24 rounded-lg`; no prato `aspect-4/3 lg:aspect-[16/10]`, `surface="white"`, `priority`, `emojiSize="lg"`; na sacola `size-14 rounded-md`, `sizes="56px"`; no `menu-editor` do painel `size-10 rounded-sm`, `sizes="40px"`, `emojiSize="sm"`, sem fade. `sizes` padrão: `(max-width: 768px) 96px, 128px`. Sem imagem nenhuma, quem chama não renderiza: a linha fica só de texto.
- **`FadeImage`**: `object-cover`, entra de `opacity-0` a `opacity-100` em 200ms no `onLoad`; com `priority` (capa, foto do prato, primeiros itens) ou `fade={false}` nasce visível; um callback ref marca a imagem que já veio do cache. `optimized` → `next/image fill`; senão `<img loading="lazy" referrerPolicy="no-referrer">` (`eager` com `priority`).
- **`CountBadge`**: `absolute h-[18px] min-w-[18px] rounded-full bg-primary px-1 text-[11px] font-bold text-white`, `aria-hidden` (a contagem já está no `aria-label` do botão), "99+", zero não renderiza. `key={count}` remonta o selo, e o `animate-badge-pop` só roda se `useMountAnimation()`. Quem chama posiciona: `-right-0.5 -top-0.5` na sacola do topo, `-right-1.5 -top-1.5` no "+".
- **`BottomBar`**: `StickyBottomBar white` com miolo `max-w-page flex justify-between gap-4`: o total `text-h6 font-bold tabular-nums text-gray-900` (+ sufixo `text-body2 font-medium text-gray-600`, "+ entrega") e `Button cta pill min-w-32`.
- **`CartBar`**: aparece com `itemCount > 0` fora do prato, `fixed inset-x-0 bottom-0 z-40` com `BottomBar position="static"`: o subtotal e "Ver sacola ›" (`data-cart-cta`); entra com `animate-slide-up` (só depois da carga) e sai com `animate-sheet-out`, desmontando 200ms depois; com a sacola aberta fica `invisible` + `inert`, mas montada, para o foco voltar a ela. Deixa um espaçador `h-[calc(var(--bottom-bar-height)+var(--safe-bottom))]` no fim da página.

### Prato

| Componente | Arquivo | Props principais | Onde é usado |
|---|---|---|---|
| `ItemDetail` | `item-detail.tsx` | `business`, `category`, `item`, `basePath?` | `app/r/[slug]/item/[item]/page.tsx`, demo, prévia |
| `ItemHero` | `item-hero.tsx` | `title`, `hasImage`, `children` (a foto) | `ItemDetail` |
| `ItemClosedNote` | `item-closed-note.tsx` | `business` | `ItemDetail` |
| `OptionGroup`, `optionGroupId(id)` | `option-group.tsx` | `group`, `itemId`, `selected`, `onSelectSingle`, `onAdjust(choiceId, ±1)` | `ItemOrderPanel` |
| `RadioRow`, `CheckboxRow`, `StepperRow` | `option-row.tsx` | ver abaixo | `OptionGroup` |
| `ItemOrderPanel` | `item-order-panel.tsx` | `item` | `ItemDetail` |
| `StoreMessage`, `ItemMissing` | `item-missing.tsx` | `title`, `description?`, `icon?` (`SearchX`), `action?` · — | `app/r/[slug]/not-found.tsx`, `app/r/[slug]/error.tsx`, prévia do item, demo |

- **`ItemDetail`**: `StoreScreen` › fundo `lg:bg-gray-50` › `article` (com `animate-fade-in` só onde não há View Transitions; no `lg`, painel `max-w-narrow rounded-lg border shadow-highest` com altura máxima `calc(var(--screen-height)-var(--top-inset)-5rem)` e o conteúdo rolando por dentro) › `ItemHero` com a `DishImage` › `Breadcrumbs` (`sr-only` no celular, visível no `lg`; alimenta o JSON-LD), título `h1.font-display.text-h4.font-bold.text-gray-900`, descrição `text-body1 text-gray-600`, preço `text-h6 font-bold tabular-nums`, fatos `text-body2` ("Serve …", kcal, "Contém: …"), `ItemClosedNote` › `ItemOrderPanel`.
- **`ItemHero`**: "‹" "Voltar ao cardápio" (`IconButton lg`, `raised` sobre a foto e `plain` sobre a barra; `fixed left-2 top-[calc(var(--safe-top)+0.375rem)] z-50`, `lg:absolute lg:left-4 lg:top-4`, `focus-ring-photo`) → `useBackToMenu().back`. Barra com o nome do prato `fixed inset-x-0 top-0 z-40 pt-safe lg:hidden` (`h-14 px-16 text-body1 font-semibold`), `aria-hidden` + `inert` enquanto invisível, ligada por sentinela + `IntersectionObserver` depois da foto. Sem foto começa compacta e deixa um espaçador `h-16 lg:h-4`.
- **`OptionGroup`**: `section role="group"` `px-4 pt-8`, `scroll-mt-[calc(var(--safe-top)+4.5rem)] lg:scroll-mt-6`; título `h2.font-display.text-h5.font-bold.text-gray-900` solto (sem faixa sticky) + helper `text-body2 text-gray-600`; à direita, pendente → selo `rounded-full bg-gray-100 px-2.5 py-1 text-caption font-semibold text-gray-700` "Obrigatório"; satisfeito (obrigatório ou não) → `CircleCheck size-6 text-positive animate-badge-pop`; `sr-only aria-live` com "Escolha feita"/"Obrigatório". `single` → `RadioRow`; `remove` → `CheckboxRow`; `multi` → `StepperRow`.
- **`option-row.tsx`**: linha sem divisor `-mx-4 flex min-h-14 items-center gap-4 px-4 py-4`, nome `text-body1 text-gray-700`, preço "+ R$ 3,00" `mt-0.5 text-body2 text-gray-600`, controle à direita (24 no rádio e na caixa, 32 no "+"). Nas linhas que são `<label>` (rádio e caixa) o foco pinta a linha inteira (`has-[:focus-visible]:outline-2 … outline-primary`).
  - `RadioRow` `{ choice; name; checked; onSelect }`: `<label>` com `input type="radio" sr-only`; círculo `size-6 border-2 border-gray-400` → `border-primary bg-primary` com ponto branco `size-2.5 animate-check-in`.
  - `CheckboxRow` `{ choice; name; checked; disabled; onToggle }`: quadrado `size-6 rounded-[6px]` → `bg-primary` com `Check size-4 strokeWidth={3}`; sem preço; no máximo, as outras `opacity-40`.
  - `StepperRow` `{ choice; count; blocked; atLimit; onAdjust }`: "+" `size-8 rounded-full bg-gray-100 hit-44` ("Adicionar {opção}") que vira `Stepper sm soft` (`min=0`, `animate-pill-reveal`); a linha inteira soma +1 (um botão `absolute inset-0` fora do Tab); `blocked` = `opacity-40`.
- **`ItemOrderPanel`**: grupos; "Alguma observação?" (`label text-subtitle font-semibold text-gray-900`, contador `text-caption tabular-nums`, `text-error` em 140; `textarea` com `fieldClass(false, 'mt-3 min-h-24 resize-none py-3', 'soft')`); `Stepper lg soft` centrado; CTA `StickyBottomBar tone="gradient"` (`lg:sticky lg:mt-6`) com `Button cta pill fullWidth` "Adicionar N por R$ X" ou, com `?editar=<uid>`, "Atualizar N por R$ X". Faltando obrigatório, `aria-disabled`, e o toque rola até o grupo e foca a primeira opção. Adicionar: `addItem` → `tapHaptic()` (`lib/haptics.ts`: `navigator.vibrate(10)`, nunca com reduced-motion) → toast "Adicionado à sacola" com "Ver sacola" → `back()`. Atualizar: `updateLine` → `back()` se veio da sacola, senão `openCartAfterNav()`. Indisponível: `Banner neutral md` + a barra com "Indisponível" `aria-disabled`. `pb-32` no celular; `lg:contents`, para o sticky andar no painel inteiro.
- **`StoreMessage`**: barra `sticky top-0 z-40 bg-white pt-safe lg:hidden` com o "‹" "Voltar ao cardápio" (`IconButton lg`, `useBackToMenu`) + `EmptyState hero`; ação padrão `Button secondary cta pill` "Ver cardápio" (`href={basePath}`). `ItemMissing` = "Item não encontrado". O `error.tsx` da loja usa o `StoreMessage` com `TriangleAlert`, "Tentar novamente" e `reportError`.

### Sacola, Finalizar e Enviado (`store/cart/`)

| Componente | Arquivo | Props principais | Onde é usado |
|---|---|---|---|
| `CartSheet` | `cart/cart-sheet.tsx` | — | `StoreFrame` |
| `CartPanel` | `cart/cart-panel.tsx` | `titleId` | `CartSheet` |
| `BagStep` | `cart/bag-step.tsx` | `checkout`, `onClear` | `CartPanel` (passo `cart`) |
| `CartLineRow` | `cart/cart-line.tsx` | `line` | `BagStep` |
| `CheckoutStep` | `cart/checkout-step.tsx` | `checkout` | `CartPanel` (passo `checkout`) |
| `DoneStep` | `cart/done-step.tsx` | — | `CartPanel` (passo `done`) |
| `OrderModeControl` | `cart/order-mode-control.tsx` | `value`, `onChange` | `BagStep`, `CheckoutStep` |
| `DeliveryQuoteField` | `cart/delivery-quote-field.tsx` | `error?`, `explainOutOfRange?` (`true`) | `BagStep`, `CheckoutStep` (entrega por km) |
| `ClosedNotice`, `ReviewNotice` | `cart/cart-notices.tsx` | `next` · `review`, `onDismiss` | `BagStep` (os dois); `CheckoutStep` (só o `ClosedNotice`) |
| `useCheckout()` | `cart/use-checkout.ts` | → validação, `submitOrder`, `set`, `opening`… | `CartPanel` (repassa aos passos) |

- **`CartSheet`** (D26): `BottomSheet open={isOpen} onClose={() => popLayers(1)} labelledBy snap="full" enterFrom="right" desktop="drawer" scroll="child" lockScroll={false}`. No celular é uma página inteira que entra pela direita; no `lg`, drawer de 440. Esc, scrim e o fechamento nativo voltam **um** passo.
- **`CartPanel`**: cabeçalho `pt-safe`, linha `h-16 px-4`, sem borda: "‹" `IconButton raised lg` — "Fechar sacola" no `cart` (→ `closeCart`), "Voltar para a sacola" no `checkout` (→ `goToStep('cart')`), `X` "Fechar sacola" no `done` —, o título do passo centrado (`h2 text-body1 font-semibold text-gray-900`: "Sacola", "Finalizar pedido", "Pedido enviado") e um espaçador `size-11`. O passo troca num `div key={step} animate-fade-in`. Abre o `ConfirmDialog appearance="store"` "Limpar sacola?". Só monta com a sacola aberta, e é isso que deixa o `useCheckout` ler o relógio.
- **`BagStep`**: área rolável própria + `BottomBar position="static"` "Continuar ›" (o total, ou o subtotal com "+ entrega"). Dentro: "Sua sacola" `h3.font-display.text-h5.font-bold` + `IconButton tonal` "Limpar sacola"; "N itens de <loja>" (a loja é um `button` sublinhado → `closeCart`); avisos; `ul.space-y-6` de `CartLineRow`; "Adicionar mais itens" `Button tertiary sm pill`, à direita; `OrderModeControl` (só com os dois modos); resumo `dl` com Total `text-h6 font-bold`; `DeliveryQuoteField`; `Banner warning md` do pedido mínimo. Vazia: `EmptyState hero` (`ShoppingBag`) com "Ver cardápio" `secondary cta pill`, que recebe o foco ao esvaziar.
- **`CartLineRow`**: miniatura `DishImage size-14 rounded-md`; nome `text-subtitle font-semibold text-gray-700`, escolhas por grupo e "Obs.:" em `text-body2 text-gray-600`, preço `text-body1 font-bold`; o texto é um `Link` esticado (`after:absolute after:inset-0`) para `?editar=<uid>`, que grava a origem `cart`; `Stepper sm soft` com `onRemove` em `absolute right-1 top-1`, por cima do link; remover recolhe a linha (`grid-rows`, 200ms) antes de sair do store.
- **`CheckoutStep`**: `form#checkout-form` rolável (`[scroll-padding-bottom:6rem]`) com `ClosedNotice`, `OrderModeControl` ou o rótulo-pílula "Somente entrega"/"Somente retirada no local" (`h-12 rounded-full bg-gray-100`), seções `h3.font-display.text-h6.font-bold.text-gray-900` ("Seus dados", "Endereço de entrega" ou "Retirada no local", "Observações") e campos `appearance="soft"` com os ids, `name`, `autoComplete` e mensagens de sempre; o cartão "fora da área" `rounded-lg bg-gray-50 p-4` com "Prefiro retirar no local" `secondary cta pill`. Rodapé `shrink-0 space-y-3 bg-white px-4 pt-3 pb-safe-4 shadow-up`: `dl data-summary`, aviso `Banner warning md role="alert"`, CTA `Button type="submit" form="checkout-form" variant="brand" size="cta" pill fullWidth after={<WhatsAppGlyph/>}` ("Fazer pedido pelo WhatsApp" ou "Enviar para confirmar a entrega") e a legenda `text-caption`. **Com um campo em foco, abaixo de `lg`, o `dl` some** (`max-lg:[&:has(input:focus,select:focus,textarea:focus)_[data-summary]]:hidden`) — e só ele, que fica ACIMA do botão: ao tocar no CTA o campo perde o foco e o resumo volta; se algo voltasse abaixo do botão, ele subiria entre o `mousedown` e o `mouseup` e o clique cairia fora.
- **`DoneStep`**: círculo `size-20 rounded-full bg-primary-tint text-green-700 animate-check-pop` (o círculo inteiro estala) com `CircleCheck size-10`; "Pedido enviado!" `font-display text-h5 font-bold`; texto `text-body1 text-gray-600`; "Abrir o WhatsApp novamente" (`secondary cta pill fullWidth`, `href={lastOrderUrl}`, `WhatsAppGlyph`; só com `lastOrderUrl`, lido do `sessionStorage`) e "Voltar ao cardápio" (`tertiary cta pill fullWidth`, `NavIcon`) → `closeCart`.
- **`OrderModeControl`**: `SegmentedControl md sliding` "Como deseja receber o pedido", com `Bike`/`Store`.
- **`DeliveryQuoteField`**: CEP com `fieldClass(…, 'h-12', 'soft')` + "Calcular" `Button cta pill` (`loading`); calculado, mostra o CEP, o endereço que ele devolveu e a distância, com "Trocar" `Button text sm pill`.
- **`ClosedNotice`** (`warning`, `Clock`, "Fechado agora") e **`ReviewNotice`** (`info`, `Info`, "O cardápio mudou desde a sua última visita", `role="status"`, `onDismiss`), os dois `Banner radius="md"`.
- **`useCheckout`**: `submitOrder` grava `setLastOrderUrl` → `clearCart` → `goToStep('done')` → `window.open` (pop-up bloqueado: `location.assign`), nessa ordem.

### Onde a loja aparece fora de `/r/[slug]`

- **Prévia do painel**: `app/painel/previa/layout.tsx` segura a casca — `PreviewFrame` (o `Card` "Prévia" com "Voltar ao painel" + `StoreFrame embedded basePath="/painel/previa"`), ou `DemoPreviewLayout` no modo demo —, e as páginas desenham só o miolo (`StoreMenu`, `ItemDetail`, `ItemMissing`). O `SetupWidget` some em `/painel/previa*`.
- **Landing**: o `hero-demo` monta `StoreProvider history={false}` com `StoreHeader layout="bar"`, `Tabs ink lg`, `ItemCard` e `CartBar` num palco `inert` `transform-gpu` (a `CartBar`, que é `fixed`, fica presa a ele); o `step-panel` monta o provider com `history={false}` para um `ItemCard`.
- **Compartilhar**: `ShareButton` (`src/components/share-button.tsx`) — `{ url; title; text; variant?: 'icon' | 'button'; closeSide?: 'start' | 'end'; className? }`; na pílula da loja, `icon` (círculo de 40) com `closeSide="start"`.

## 5. Ícones: emoji → Lucide

`lucide-react`, `strokeWidth` padrão (2), 24px em barras e botões, 20px em linhas e campos, 16px dentro de texto. Ícone decorativo leva `aria-hidden="true"`.

| Hoje | Lucide | | Hoje | Lucide |
|---|---|---|---|---|
| carrinho | `ShoppingBag` | | alvos de compartilhar | `MessageCircle` · `Send` · `Mail` · SVG próprio para o Facebook |
| lupa | `Search` | | alerta | `TriangleAlert` |
| compartilhar, "↗" em botão | `Share2` | | festa | `PartyPopper` (sem uso hoje) |
| "↗" em link externo | `ArrowUpRight` (o `ExternalIcon`, D22) | | demo | `FlaskConical` |
| fechar | `X` | | sem imagem | `ImageIcon` |
| voltar | `ChevronLeft` | | checklist feito / pendente | `Check` num círculo desenhado / círculo vazio (`SetupWidget`) |
| moto | `Bike` | | reordenar | `ArrowUp` / `ArrowDown` (itens do `Menu` da categoria) |
| retirada | `Store` | | menu | `Menu` |
| enviar pelo WhatsApp | `WhatsAppGlyph` (SVG próprio) no botão; `MessageCircle` no contato | | sair | `LogOut` |
| pedido enviado | `CircleCheck` | | Pix da assinatura | `QrCode` |
| relógio | `Clock` | | landing | `Check` · `Copy` · `ImagePlus` · `MessageCircle` (`step-panel`); a vitrine usa os da loja |
| mais / menos / lixeira | `Plus` / `Minus` / `Trash2` | | onboarding | `Store` |

Conferido em 2026-09-24: do mapa antigo, `PartyPopper`, `Banknote` · `CreditCard` · `Ticket` · `Wallet` (a loja não tem forma de pagamento), `Smartphone` · `Receipt` · `Link2` e os públicos `Beef` · `Soup` · `Coffee` · `Beer` não aparecem mais no código.

**Na loja** (2026-09-24): o "‹" de toda tela é `ChevronLeft` 24px; os da pílula do topo (`Search`, `Share2`, `ShoppingBag`) têm 20px; como "fechar", o "✕" (`X`) fica só no passo Enviado e no fechar dos sheets (`closeSide="start"` muda o lado, não o ícone) — fora isso, ele só limpa a busca e dispensa o aviso do cardápio que mudou; `ChevronRight` 20px no chevron "Sobre a loja"; `SearchX` na busca vazia e em "Item não encontrado"; `UtensilsCrossed` no cardápio vazio; `BadgePercent` na entrega grátis; `MapPin` · `Clock` · `MessageCircle` · `AtSign` · `Bike` · `Store` nas seções do "Sobre a loja"; `Info` nos avisos da sacola; `Check` e `CircleCheck` nas opções e no grupo satisfeito; `Pencil` no "Trocar" do CEP.

Confira o nome exato no pacote instalado antes de importar: o Lucide renomeia ícones entre versões (o `tsc` acusa). **O Lucide 1.x não tem ícones de marca** (`Facebook`, `Instagram`, `Whatsapp` não existem): para WhatsApp use `MessageCircle` (ou o `WhatsAppGlyph` nos botões que abrem a conversa), para Telegram `Send`, para Instagram `AtSign`; o único logo que o menu de compartilhar precisa (Facebook) vira um SVG inline pequeno em `src/components/ui/brand-icons.tsx`, com `fill="currentColor"` e `aria-hidden`. Pendência conferida em 2026-09-24: esse arquivo não existe, e o menu alternativo do `ShareButton` ainda mostra emoji nos alvos (💬 ✈️ 📘 ✉️). Emoji que vem de **dado** (logo, imagem do prato) continua renderizado, dentro do `Avatar` ou do fundo da `DishImage`.

## 6. Acessibilidade

O código atual é cuidadoso com isso; a refatoração não pode regredir.

- Botão só de ícone tem `aria-label`; ícone é `aria-hidden`. Os contadores (`CountBadge`) são `aria-hidden`: a contagem vai no rótulo do botão ("Abrir sacola com 3 itens", "Adicionar X à sacola (2 na sacola)").
- Controles desenhados (radio, checkbox, switch) mantêm o input nativo por baixo; nas linhas de rádio e de caixa o foco pinta a linha inteira.
- Quantidade, resultados de busca e status de abertura ficam em regiões `aria-live="polite"`. Os resultados da busca são anunciados por um timer de 500ms (o `useDeferredValue` não é debounce); o contador da observação (0/140) só fala ao chegar no limite.
- Sheets: `aria-labelledby` apontando para o título visível, Esc fecha (na sacola, volta um passo), foco volta ao gatilho — a `CartBar` não desmonta com a sacola aberta, fica `invisible` + `inert`, para receber o foco de volta.
- Barra compacta invisível: o nome é `aria-hidden`; a do prato também é `inert`.
- Abas de categoria: `nav aria-label="Categorias"` com `aria-current`, uma parada de Tab (roving tabindex) e ←/→/Home/End.
- Alvo de toque mínimo de 40px; 44px quando o layout permite. Os controles de 32 da loja (o "+", o chevron, os botões do `Stepper sm` nas pílulas) chegam a 44 com `hit-44`; as opções do segmented, com `hit-y-44`; as abas têm `min-h-11`.
- Toast com ação dura 5s.
- Foco sobre foto ou capa usa `focus-ring-photo` (anel grafite com halo branco).
- Contraste: texto `gray-600` sobre branco passa em AA; sobre `gray-100` (tags, segmented), use `gray-700`; `gray-400` só para placeholder e desabilitado; branco sobre `primary` passa para texto de botão (semibold 14px+). Nada de texto sobre a capa.
- Um `h1` por página (no cardápio ele é `sr-only`; no prato, o nome), `h2` por categoria e por grupo de opções.

## 7. Limites conhecidos

- **Toast atrás de dialog**: `<dialog>` modal vive no top layer e cobre o toast. Dentro de sheets, dê o feedback inline (ícone `Copy` → `Check`) ou feche o sheet antes do toast. O "Adicionado à sacola" não sofre disso: o prato é rota, não sheet.
- **Quantidade por opção é repetição de id**: `CartLineSelections` guarda só ids; num grupo `multi`, `['bacon', 'bacon']` é "2x Bacon" e o preço soma cada ocorrência. É o que o `StepperRow` lê e escreve. Grupos `remove` são sim ou não (`CheckboxRow`).
- **`Button` com `href`** não tem estado desabilitado: para ação indisponível, renderize `<Button disabled>` (ou `aria-disabled`) sem `href`.
- **Sheets da prévia cobrem o painel**: dentro do `EmbeddedShell` os `fixed` ficam presos à moldura, mas o `<dialog>` sobe para o top layer da janela.
