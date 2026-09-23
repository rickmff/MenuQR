# Primitivos — `src/components/ui/`

## Sumário
1. Convenções
2. O que já vem pronto em `assets/ui/`
3. Inventário (assinatura, receita, o que substitui)
4. Ícones: emoji → Lucide
5. Acessibilidade
6. Limites conhecidos

## 1. Convenções

Seguem os padrões de engenharia que o iFood descreve para o IFDS:

- **Props dizem o papel, não o estilo**: `variant="primary"`, `loading`, `tone="warning"`. Nunca `color="red"` nem `fontSize`.
- **Todo valor visual vem de token** (classe do tema). Nada de hex, px solto ou `style={{}}` para cor.
- **Composição no lugar de configuração** quando o conteúdo varia: `BottomSheet` recebe `children` e `footer`, não vinte props.
- Um arquivo por componente, sem barrel (`index.ts`): importe direto de `@/components/ui/button`.
- `'use client'` só onde há estado, efeito ou handler. `Button`, `IconButton`, `Skeleton`, `Tag`, `Card`, `Price`, `Avatar`, `Divider`, `Container`, `EmptyState` e `Banner` são server-safe.
- Todos aceitam `className` e repassam atributos nativos. Junte classes com `cn()` de `@/lib/cn`.
- Mapas de variante são `Record<Variant, string>` com strings literais completas — o Tailwind não enxerga classe montada por template.
- Nomes: a auditoria procura as palavras inteiras `btn`, `surface` e `eyebrow`. Não as use em identificadores novos (por isso `tone="white"` e não `"surface"`).
- O projeto compila com `strict` e `noUncheckedIndexedAccess`, e o ESLint do Next 16 traz as regras do React Compiler: nada de `ref.current` no render, nada de `setState` síncrono em efeito, nada de `Date.now()`/`Math.random()` no render.

## 2. O que já vem pronto em `assets/ui/`

Copie para `src/components/ui/` na fase 2. São os primitivos mais difíceis de acertar duas vezes do mesmo jeito; já passam no `tsc` e no lint deste repositório.

| Arquivo | Conteúdo |
|---|---|
| `button.tsx` | `Button` e `buttonClass()` |
| `icon-button.tsx` | `IconButton` com badge de contagem |
| `stepper.tsx` | `Stepper` com lixeira no mínimo |
| `tabs.tsx` | `Tabs` roláveis com indicador deslizante |
| `bottom-sheet.tsx` | `BottomSheet` sobre `<dialog>` nativo |
| `toast.tsx` | `ToastProvider` e `useToast()` |
| `skeleton.tsx` | `Skeleton`, `ItemRowSkeleton`, `StoreSkeleton` |

Os demais primitivos são pequenos: escreva a partir do inventário.

## 3. Inventário

### Ações

**`Button`** — `{ variant?: 'primary' | 'secondary' | 'tertiary' | 'text' | 'brand' | 'dark' | 'ghost'; size?: 'sm' | 'md' | 'lg'; loading?; fullWidth?; pill?; leading?; trailing?; after?; href?; target?; rel? } & ButtonHTMLAttributes`
- **Do app** — primary: verde chapado, texto branco, **borda grafite**. secondary: branco com **borda e texto grafite** (D22 — era verde; a borda grafite dá 17,46:1 e cumpre sozinha o mínimo de 3:1 da WCAG para o limite de um controle). tertiary: `gray-100`. text: só o texto verde.
- **Do site institucional** (landing e auth, 2026-09-23 — D19): `brand` é o verde vivo `#25d366` com rótulo e **borda** GRAFITE (8,8:1; branco sobre ele dá 1,98:1 e é proibido) e é o único botão verde da landing; `dark` é grafite chapado, para a mesma ação repetida fora da dobra principal (o botão do header); `ghost` é o `text` em grafite, para link que não deve puxar cor. Não use nenhum dos três dentro da loja, do item, da sacola ou do painel.
- Alturas 40/48/56, raio 8 (`pill` só na landing), `text-body2 font-semibold`, desabilitado `bg-gray-200 text-gray-400`.
- **Borda grafite nos dois botões verdes** (2026-09-23, decisão do dono): `primary` e `brand` levam `border border-gray-900`, o mesmo contorno do `secondary` — o desenho do botão é o contorno, e a variante só troca o preenchimento. Quem desabilita mantém a `border` (em `gray-300`), senão o botão encolhe 2px. Sobre o bloco `gray-900` do CTA final a borda não aparece, porque é a cor do próprio fundo.
- `trailing` alinha o conteúdo à direita: é o preço em "Adicionar    R$ 29,90".
- **`after` cola o ícone ao rótulo** (D22) e é a prop do padrão do WhatsApp: lá nenhum botão vem sem ícone, e o ícone está sempre à direita, nunca à esquerda. Não confunda com `trailing`, que manda o conteúdo para a outra ponta.
- `loading` troca o `leading` por spinner, desabilita e marca `aria-busy`.
- Substitui `.btn*` (121 usos), os botões ad-hoc de `cart-drawer.tsx` e `item-order-panel.tsx`, e o visual dos cinco `SubmitButton` (eles mantêm o `useFormStatus` e renderizam `<Button type="submit" loading={pending}>`) e do `PendingButton` de `category-manager.tsx`.

**Ícones de botão** (`ui/button-icons.tsx`) — o desenho diz o que acontece, então são dois:
- **`NavIcon`** (chevron): navega dentro do MenuQR. É o "Log In >" deles.
- **`ExternalIcon`** (seta diagonal): abre em aba nova. É o "Help Center ↗" deles.
- Quem abre o WhatsApp usa o **`WhatsAppGlyph`**: ali o destino é a marca, e o glifo diz mais que uma seta.
- Botão de ação local — Salvar, Copiar, Excluir, Cancelar — **não** leva ícone de navegação; se levar ícone, é o do que ele faz.


**`IconButton`** — `{ label; icon; variant?: 'plain' | 'raised' | 'tonal'; size?: 'sm' | 'md'; badge?: number; href? }`
- Círculo de 40px (32 no `sm`). `raised` é o círculo branco com `shadow-medium` usado sobre foto (voltar e compartilhar na página do item). O quick-add da linha do cardápio **não** usa este componente: lá o "+" é um glifo solto, sem círculo — ver `screens-cliente.md` seção 3.
- `label` vira `aria-label`; o ícone é `aria-hidden`.
- Só recebe `relative` quando tem `badge`. Para posicioná-lo (o "+" sobre a foto), passe `className="absolute -bottom-1 -right-1"` — sem `badge`, porque não há `tailwind-merge` e duas classes de `position` brigariam.
- Substitui o botão do carrinho e de compartilhar do header, os "fechar" de sheet e drawer, o menu do `site-header` e as setas do `category-manager`.

**`Tooltip`** — `{ label: string; placement?: 'top' | 'bottom'; align?: 'start' | 'center' | 'end'; children: ReactElement }`
- Bolha escura (`bg-gray-800 text-caption text-white rounded-sm shadow-high`, `max-w-64`), sem seta, igual ao toast. Abre no hover, no foco e no toque; fecha no Esc, ao sair e ao tocar fora — o clique só abre.
- Clona o filho para injetar `aria-describedby`. Com a bolha fechada o texto continua no DOM como `sr-only`.
- **O gatilho bloqueado usa `aria-disabled="true"`, nunca `disabled`**: botão desabilitado de verdade não recebe foco nem hover, e o motivo nunca apareceria. O `Button` já entende `aria-disabled` — pinta o estado desativado, tira o `press` e ignora o clique.
- É onde mora o motivo de uma ação indisponível (o bloqueio de publicar, em `publish-toggle.tsx`), em vez de um parágrafo embaixo do botão.

### Rótulos e indicadores

**`Badge`** — `{ count: number; max?: number }`: círculo de 18px `bg-primary text-white text-[11px] font-bold`, `key={count}` + `animate-badge-pop`. O `IconButton` já embute um; use `Badge` solto na barra da sacola.

**`Tag`** (já existe em `src/components/ui/tag.tsx`) — `{ tone?: 'neutral' | 'promo' | 'positive' | 'warning' | 'error' | 'dark'; size?: 'sm' | 'md' }`: `rounded-xs px-1.5 py-0.5 text-[10px] font-bold`; neutral `bg-gray-100 text-gray-600`; promo `bg-pink-100 text-primary-pressed`; positive `bg-success-bg text-success`; dark `bg-gray-800 text-white uppercase tracking-wide` (é o OBRIGATÓRIO). Substitui as tags `flame` de item, "Indisponível", "Esgotado", "Prévia" e "Mais completo".

**`Chip`** — `{ selected?; leading?; onClick? }`: pílula de 32px `border border-gray-300 text-body2`; selecionado `border-gray-800 bg-gray-800 text-white`. Para filtros e sugestões.

**`Price`** — `{ value: number; original?: number; size?: 'sm' | 'md' | 'lg'; from?: boolean }`: usa `formatPrice`; com `original`, o valor novo fica `text-positive` e o antigo riscado em `text-caption text-gray-400`; `from` prefixa "a partir de". O modelo de dados ainda não tem promoção: a API fica pronta.

**`Avatar`** — `{ src?: string; emoji?: string; name: string; size?: 40 | 48 | 56 }`: círculo com `border border-gray-200`. Imagem quando `src`; emoji centralizado em `bg-gray-100` quando o logo é emoji; senão as iniciais das duas primeiras palavras em `bg-gray-100 text-gray-700 font-semibold`. Sem cor de marca.

**`Logo`** (já existe em `src/components/platform/logo.tsx`): marca + nome do MenuQR em SVG inline, `{ size?: 'sm' | 'md'; withName?: boolean }`. Substitui o glifo usado hoje em `site-header`, `site-footer`, `painel/layout` e `demo-shell`.

### Estrutura

**`Container`** — `{ size?: 'page' | 'narrow'; as?: 'div' | 'section' | 'ul' | 'ol' | 'nav' }`: `mx-auto w-full px-4 md:px-6 lg:px-8` com `max-w-page` (1200px) ou `max-w-narrow` (640px). O `w-full` é obrigatório (ver armadilha do `mx-auto` no SKILL.md). Já existe em `src/components/ui/container.tsx`. Substitui `.container-page` (34 usos).

**`Card`** — `{ padding?: 'none' | 'sm' | 'md' | 'lg'; interactive?: boolean; highlight?: boolean; as?: 'div' | 'section' | 'li' | 'article' }`: branco, `border border-gray-200 rounded-md`; `highlight` troca a borda por `border-2 border-primary` (plano em destaque) — é prop e não `className` porque, sem `tailwind-merge`, duas classes de borda brigariam; `interactive` acrescenta `shadow-low hover:shadow-medium press`. Já existe em `src/components/ui/card.tsx`. Substitui `.surface` e `.surface-hover`.

**`Divider`** — `{ thick?: boolean; inset?: boolean }`: `h-px bg-gray-200`, ou `h-2 bg-gray-50` (o separador grosso entre blocos, muito característico do iFood).

**`ListRow`** — `{ leading?; title; description?; trailing?; href?; onClick?; divider?: boolean }`: `flex min-h-14 items-center gap-3 px-4 py-3`, título `text-body1 text-gray-700`, descrição `text-body2 text-gray-600`, `border-b border-gray-200`. Com `href` ou `onClick`, leva `press` e `ChevronRight` no `trailing`.

**`AppBar`** — `{ leading?; title?; trailing?; sticky?: boolean; bordered?: boolean; titleId?: string }`: 56px, branco, `z-50`, `pt-safe` quando `sticky`; `border-b border-gray-200` só quando `bordered` (conteúdo rolado). Título `text-body1 font-semibold` centralizado e truncado. Substitui os três headers sticky e o cabeçalho do drawer.

**`StickyBottomBar`** — `{ children; fixed?: boolean; tone?: 'white' | 'primary' }`: `border-t border-gray-200 bg-white px-4 pt-4 pb-safe-4 shadow-high z-40`. Com `fixed`, `fixed inset-x-0 bottom-0`. Substitui as barras de `item-order-panel`, `cart-drawer`, `cart-bar` e a barra de salvar do `business-form`.

**`Banner`** — `{ tone: 'info' | 'warning' | 'error' | 'success' | 'promo' | 'neutral'; icon?; title?; children; onDismiss?; role?: 'status' | 'alert' }`: `flex gap-3 rounded-sm p-3 text-body2`, fundo `*-bg` (promo `bg-pink-100`, neutral `bg-gray-50`), ícone na cor cheia do tom. Substitui `ClosedNotice`, `ReviewNotice`, `demo-banner`, os alertas dos formulários e o aviso do `item-order-panel`.

**`EmptyState`** — `{ icon; title; description?; action? }`: centrado, ícone Lucide 48px `text-gray-400`, título `text-subtitle font-semibold`, texto `text-body2 text-gray-600`. Substitui a sacola vazia, busca sem resultado, cardápio vazio, `not-found` e `error`.

**`Skeleton`** — `{ shape?: 'text' | 'rect' | 'circle' }`.

### Formulário

**`TextField`** — `{ id; label; hint?; error?; required?; leading?; trailing?; prefix? } & InputHTMLAttributes`
- Rótulo `text-body2 font-medium text-gray-700` acima do campo; obrigatório leva asterisco `aria-hidden` + `sr-only` "(obrigatório)" — o padrão que já existe em `cart-drawer.tsx`.
- Campo `h-12 w-full rounded-sm border border-gray-300 bg-white px-4 text-body1 placeholder:text-gray-400 focus:border-primary focus:outline-none`. Sem anel de foco difuso.
- Erro: `border-error` + mensagem `text-caption text-error` com `role="alert"`; o input leva `aria-invalid` e `aria-describedby`.
- `prefix` cobre o campo de slug (`menuqr.app/r/` fixo à esquerda).
- **`SelectField`**: mesmo invólucro sobre `<select>` com `ChevronDown` à direita.
- Substitui `Field` (4 cópias), `inputClass` (5 cópias) e `.field-input*`. Mantenha `id`, `name`, `autoComplete` e `inputMode` exatamente como estão.

**`TextArea`** — `TextField & { rows?; maxLength?; showCounter? }`: contador "0/140" `text-caption text-gray-400` à direita, `text-error` ao chegar no limite.

**`RadioRow` / `CheckboxRow`** — `{ name; value; checked; disabled?; onChange; label; description?; leading?; trailing? }`: a linha inteira é o `<label>` (`flex min-h-12 items-center gap-3 py-3 press`); o `<input>` nativo fica `sr-only` e um controle desenhado de 20px mostra o estado (`border-2 border-gray-300`; marcado `border-primary bg-primary` com check branco; radio redondo, checkbox `rounded-xs`), com `peer-focus-visible` para o contorno de foco. `trailing` recebe "+ R$ 3,00".

**`SegmentedControl`** — `{ options: { value; label; icon? }[]; value; onChange; label }`: `role="radiogroup"` com setas do teclado; trilho `rounded-full bg-gray-100 p-1`; opção ativa `rounded-full bg-white shadow-low text-gray-700`, inativa `text-gray-600`. Substitui o `ModeButton` de Entrega/Retirada.

**`Stepper`** — `{ value; min?; max?; onChange; onRemove?; size?: 'sm' | 'md'; variant?: 'outlined' | 'plain'; orientation?: 'horizontal' | 'vertical'; label; disabled? }`: pílula `rounded-sm border border-gray-300`, ícones em `text-primary`, número `tabular-nums` com `aria-live`. Com `onRemove`, no mínimo o "−" vira lixeira e remove (Sacola e quick-add); sem ele, o "−" desabilita (página do item). `orientation="vertical"` empilha "+ / número / −" numa coluna da largura de um botão, com o aumentar em cima — é o que a linha do cardápio usa, onde um stepper deitado tiraria a foto da régua.

**`SearchBar`** — `{ value; onChange; onClear; onCancel?; placeholder?; autoFocus? }`: `h-12 rounded-xl bg-gray-50` sem borda, `Search` 20px `text-gray-400` à esquerda, limpar à direita, foco `bg-white shadow-medium`; "Cancelar" é um `Button variant="text"` ao lado.

**`Switch`** — `{ checked; onChange; label; disabled? }` (`ui/switch.tsx`): `role="switch"`, trilho `h-6 w-11 rounded-full bg-gray-300` → `bg-positive`, bolinha branca com `translate-x` em 150ms. Para o publicar/despublicar do painel e o disponível/esgotado de cada linha do cardápio.

**`Menu`** — `{ label; items: { label; icon?; onSelect; disabled?; destructive? }[] }` (`ui/menu.tsx`, sobre `@radix-ui/react-dropdown-menu`): o "⋯" (`IconButton` com `MoreHorizontal`) abre uma lista curta ancorada, `rounded-sm border border-gray-200 bg-white p-1.5 shadow-high`, itens de 40px com ícone; os `destructive` ficam em `text-error` depois de um divisor. Foco, setas, Esc e clique fora vêm do Radix. Usado nas opções da categoria.

**`ImageUpload`** — `{ label; value; preview?; busy?; disabled?; invalid?; shape?: 'square' | 'circle'; noun?; onFile; onRemove; onReject? }` (`ui/image-upload.tsx`): quadro de 128px com a imagem e, centralizados sobre ela, os `IconButton raised` de trocar (`Pencil`) e remover (`Trash2`), sempre visíveis; vazio, o quadro inteiro abre o seletor (`ImagePlus`); aceita soltar arquivo (fica `primary-tint` com `Upload`) e colar. Sem rótulo visível nem botão ao lado (decisão do dono, 2026-09-23). O envio fica com quem chama (`painel/image-field.tsx`).

### Navegação e sobreposição

**`Tabs`** — `{ items: { id; label; href? }[]; activeId; onSelect?; label }`: texto puro, `text-body2 font-semibold`, ativa `text-primary` com traço de 2px deslizante, sempre centralizada. Com `href` vira link com `aria-current="page"` (abas do painel); sem `href`, botão (categorias). Substitui as tabs do `menu-browser` e o `DashboardNav`.

**`BottomSheet`** — `{ open; onClose; title?; labelledBy?; ariaLabel?; children; footer?; snap?: 'auto' | 'full'; enterFrom?: 'bottom' | 'right'; desktop?: 'dialog' | 'sheet'; lockScroll? }`
- `<dialog>` nativo com `showModal()`: foco preso, Esc, top layer e fundo inerte vêm do navegador.
- `snap="auto"`: até 90dvh, `rounded-t-lg`, alça arrastável. `snap="full"` + `enterFrom="right"`: a Sacola.
- Em `lg` vira dialog centrado `max-w-md rounded-lg shadow-highest`.
- Sai animado (desmontagem adiada), fecha por Esc, scrim e arrasto, devolve o foco ao gatilho.
- Ao abrir, o foco vai para o painel (não para o botão fechar, que acenderia o anel de foco). Para focar um campo — a busca, por exemplo — marque-o com `data-autofocus`.
- `lockScroll={false}` quando o `StoreProvider` já trava o `body`. Nunca os dois.
- Substitui o diálogo do `share-button` e a casca do `cart-drawer`; é também o seletor de bairro e o "Sobre a loja".

**`ConfirmDialog`** — `{ open; onClose; title; description?; confirmLabel; cancelLabel?; destructive?; onConfirm }`: um `BottomSheet` com dois botões no `footer` (`text` para cancelar, `primary` para confirmar). Usado em "Limpar sacola?".

**`Toast`** — `useToast()` devolve `toast('Link copiado')` ou `toast({ message, tone, action, duration })`. Faixa `bg-gray-800 text-white rounded-sm` acima da barra da sacola, uma por vez. Substitui o "✓" de 1,4s do quick-add, os "Copiado!" e os parágrafos de sucesso do painel.

**`CartBar`** (fica em `src/components/store/cart-bar.tsx`): `StickyBottomBar fixed` com botão `bg-primary` de largura total, `max-w-lg` centralizado: à esquerda `ShoppingBag` + `Badge`, no centro "Ver sacola", à direita o total `font-bold tabular-nums`; entra com `animate-slide-up`.

## 4. Ícones: emoji → Lucide

`lucide-react`, `strokeWidth` padrão (2), 24px em barras e botões, 20px em linhas e campos, 16px dentro de texto. Ícone decorativo leva `aria-hidden="true"`.

| Hoje | Lucide | | Hoje | Lucide |
|---|---|---|---|---|
| carrinho | `ShoppingBag` | | alvos de compartilhar | `MessageCircle` · `Send` · `Mail` · SVG próprio para o Facebook |
| lupa | `Search` | | alerta | `TriangleAlert` |
| compartilhar, "↗" em botão | `Share2` | | festa, onboarding | `PartyPopper` |
| "↗" em link externo | `ExternalLink` | | demo | `FlaskConical` |
| fechar | `X` | | sem imagem | `ImageIcon` |
| voltar | `ChevronLeft` / `ArrowLeft` | | checklist feito / pendente | `CircleCheck` / `Circle` |
| moto | `Bike` | | reordenar | `ChevronUp` / `ChevronDown` |
| retirada | `Store` | | menu | `Menu` |
| enviar pelo WhatsApp | `MessageCircle` | | sair | `LogOut` |
| pedido enviado | `CircleCheck` | | pagamento | `Banknote` · `CreditCard` · `Ticket` · `Wallet` · `QrCode` (Pix) |
| relógio | `Clock` | | landing | `Smartphone` · `Receipt` · `Link2` · `BadgePercent` · `Clock` · `Search` |
| mais / menos / lixeira | `Plus` / `Minus` / `Trash2` | | públicos da landing | `Beef` · `Soup` · `Coffee` · `Beer` |

Confira o nome exato no pacote instalado antes de importar: o Lucide renomeia ícones entre versões (o `tsc` acusa). **O Lucide 1.x não tem ícones de marca** (`Facebook`, `Instagram`, `Whatsapp` não existem): para WhatsApp use `MessageCircle`, para Telegram `Send`, para Instagram `AtSign`; o único logo que o menu de compartilhar precisa (Facebook) vira um SVG inline pequeno em `src/components/ui/brand-icons.tsx`, com `fill="currentColor"` e `aria-hidden`. Emoji que vem de **dado** (logo, ícone de categoria, imagem do prato) continua renderizado, dentro de `Avatar`, do tile `bg-gray-100` do `DishImage` ou do título da seção.

## 5. Acessibilidade

O código atual é cuidadoso com isso; a refatoração não pode regredir.

- Botão só de ícone tem `aria-label`; ícone é `aria-hidden`.
- Controles desenhados (radio, checkbox, switch) mantêm o input nativo por baixo.
- Quantidade, resultados de busca e status de abertura ficam em regiões `aria-live="polite"`.
- Sheets: `aria-labelledby` apontando para o título visível, Esc fecha, foco volta ao gatilho.
- Alvo de toque mínimo de 40px; 44px quando o layout permite.
- Contraste: texto `gray-600` sobre branco passa em AA; `gray-400` só para placeholder e desabilitado; branco sobre `primary` passa para texto de botão (semibold 14px+).
- Um `h1` por página (na loja ele é `sr-only`), `h2` por categoria.

## 6. Limites conhecidos

- **Toast atrás de dialog**: `<dialog>` modal vive no top layer e cobre o toast. Dentro de sheets, dê o feedback inline (ícone `Copy` → `Check`) ou feche o sheet antes do toast.
- **Sem mini-stepper por opção**: `CartLineSelections` guarda só ids de escolha, sem quantidade. Grupos de múltipla escolha usam `CheckboxRow`.
- **`Button` com `href`** não tem estado desabilitado: para ação indisponível, renderize `<Button disabled>` sem `href`.
