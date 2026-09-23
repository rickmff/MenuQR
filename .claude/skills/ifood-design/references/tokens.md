# Tokens — Pomodoro no Tailwind v4

## Sumário
1. Fonte da verdade
2. Cores
3. Tipografia
4. Espaçamento, grid e alturas
5. Raio
6. Elevação
7. Movimento
8. Como o Tailwind v4 lê o tema
9. Bloco LEGADO e o codemod da fase 1
10. Armadilhas

## 1. Fonte da verdade

Os valores vivem em `assets/theme.css`, que substitui `src/app/globals.css` por inteiro na fase 1. Este documento explica nomes, papéis e o porquê; quando precisar de um hex, abra o `theme.css`. Se mudar um valor, mude lá.

A origem dos valores é uma extração pública do CSS do iFood mais análise da marca (ver `sources.md`). O iFood não publica o Pomodoro, então trate os números como observação cuidadosa, não como especificação oficial. Se o usuário trouxer um print, um Figma ou um valor medido, isso vence este arquivo.

## 2. Cores

**A cor do sistema é o verde do WhatsApp, não o vermelho do iFood** (decisão do dono, 2026-09-22). O verde vivo do logo deles (`#25d366`) tem 2:1 sobre branco: serve para marca e badge, nunca para texto nem para botão com rótulo branco. Por isso o `primary` é o mesmo matiz (142°) escurecido até 4,7:1, o `hover` é o verde de ação do app atual, o `tint` é o balão enviado, e o vermelho ficou restrito a erro (o "apagar" do WhatsApp). Os cinzas também são os do WhatsApp: azulados de leve.

| Token | Valor | Origem |
|---|---|---|
| `primary` | `#0b8639` | #25d366 escurecido (H 142°, S 85%, L 29%) |
| `primary-hover` | `#1daa61` | verde de ação do app |
| `primary-pressed` · `primary-active` | `#096b2e` · `#075424` | mesma escala |
| `primary-tint` | `#d9fdd3` | balão enviado (modo claro) |
| `brand` | `#25d366` | verde do logo — marca do MenuQR e badges, só |
| `chat-bg` | `#efeae2` | papel de parede da conversa |
| `tick` | `#53bdeb` | tique azul de "lido" |
| `error` · `error-pressed` | `#ea0038` · `#a8002a` | vermelho de "apagar" |
| `gray-900 … gray-400` | `#111b21 #1f2c34 #3b4a54 #667781 #8696a0` | TINTA — os azulados do WhatsApp |
| `gray-300 … gray-50` | `#d3cabb #e5ded1 #f4ede1 #fcf5eb` | SUPERFÍCIE — a família do creme (D21) |

**Papel quente, tinta fria (2026-09-23 — D21).** Medido no whatsapp.com, o creme
`#fcf5eb` cobre 66,4% da tela e o texto por cima é um grafite azulado. O
contraste de temperatura dá nitidez sem o estalo do branco puro, e é por isso
que a escala neutra se parte em duas: os quatro degraus claros são superfície e
saem do creme (matiz 37°); os cinco escuros são tinta e continuam frios.

Trocar só os quatro primeiros degraus vira a temperatura do sistema inteiro sem
tocar em componente nenhum — foi assim que a mudança foi feita.

| Onde | Papel |
|---|---|
| `body`, painel, seções alternadas, rodapé | `gray-50`, o creme |
| lista do cardápio, cartão, sheet, balão, app bar | `bg-white` explícito |
| tile de foto, chip, botão `tertiary` | `gray-100` |
| divisor e borda de cartão | `gray-200` |
| borda de input e de chip | `gray-300` |

O branco deixou de ser o fundo e passou a ser o **conteúdo**, que é o que ele é
no WhatsApp: no app deles a lista de conversas é branca e o resto é papel.
A borda `gray-200` sobre branco melhorou de 1,18:1 para 1,34:1 na troca.

**Escala verde (2026-09-23).** Existiam dois verdes — um vivo que não serve para
nada com texto e um escuro que servia para tudo. Faltavam os degraus do meio, e
sem eles não havia como dosar. `green-*` é o mesmo matiz (142°), do claro ao
escuro; `green-400` é o `brand` e `green-600` é o `primary`, então a escala não
cria cor nova, só nomeia o que faltava.

| Token | Valor | Sobre branco | Sob `gray-900` | Papel |
|---|---|---|---|---|
| `green-100` | `#d9fdd3` | 1,11:1 | 15,75:1 | balão enviado (= `primary-tint`) |
| `green-300` | `#5ede8d` | 1,71:1 | 10,24:1 | hover do botão `brand` |
| `green-400` | `#25d366` | 1,98:1 | 8,80:1 | marca e botão `brand` (= `brand`) |
| `green-500` | `#1daa61` | 3,01:1 | 5,80:1 | pressed do botão `brand` |
| `green-600` | `#0b8639` | 4,68:1 | — | ação sobre BRANCO (= `primary`) |
| `green-700` | `#08682b` | 6,94:1 | — | ação sobre fundo que não é branco |
| `green-800` | `#0f3d26` | 12,24:1 | — | fundo escuro |

**Regra do verde sobre fundo que não é branco.** O `primary` foi calculado a
4,68:1 contra branco, e essa folga some assim que o fundo escurece: sobre o
papel de parede (`#efeae2`) ele cai para 3,91:1 e sobre `gray-50` para 4,41:1 —
os dois reprovam em texto pequeno. Fora do branco, verde de texto é `green-700`.
O mesmo vale para o `gray-600`, que sobre o bege dá 3,88:1: ali o corpo é
`gray-700`.

**O rótulo do botão verde vivo é grafite, não branco.** Foi a regra do rótulo
branco que empurrou a cor de ação para o escuro. Invertendo o rótulo, o
`#111b21` sobre `#25d366` dá 8,8:1 — quase o dobro do branco sobre `primary` — e
a landing recupera o verde que a pessoa reconhece do celular. Branco sobre verde
vivo continua proibido.

| Utilitário | Papel |
|---|---|
| `primary` | CTA, tab ativa, badge de contagem, link curto, ícone ativo, ícone de linha |
| `brand` | fundo do logo do MenuQR, badge de não lidos. Nunca texto |
| `chat-bg` | fundo do `wallpaper` (landing) e de qualquer área "de conversa" |
| `tick` | os dois tiques de pedido enviado/lido |
| `primary-hover` · `primary-pressed` · `primary-active` | estados do vermelho |
| `primary-tint` | fundo sutil, item ativo da sidebar do painel, seleção de texto |
| `pink-100` · `pink-200` · `pink-300` | herança do iFood, sem uso novo: promoção agora é `primary-tint` |
| `star` | avaliação. Nunca vermelho |
| `positive` · `whatsapp` | "Grátis", "Aberto", preço promocional · texto e ícone que falam do WhatsApp — os dois são o próprio `primary`, com nome pelo assunto |
| `success` / `success-bg` | toast e banner de sucesso |
| `warning` / `warning-bg` | loja fechada, pedido mínimo, revisão da sacola |
| `error` / `error-bg` | erro de campo e de envio |
| `info` / `info-bg` | avisos neutros (modo demonstração, prévia) |
| `gray-400 … gray-900` | tinta fria. Não existe `gray-500` |
| `gray-50 … gray-300` | superfície quente, a família do creme (D21) |
| `white` · `black` · `scrim` | redeclarados porque o reset apaga a paleta padrão |

**Hierarquia de texto pela escala de cinza**, sem apelidos semânticos:

- Títulos do site institucional: `text-gray-900`. Nomes de item e preços na loja e no painel: `text-gray-700` — o iFood nunca usa preto puro, e é isso que dá o ar "macio" à lista.
- Corpo, descrições e metadados: `text-gray-600`.
- Placeholder, desabilitado e ícone inativo: `text-gray-400`.
- Página `bg-gray-50` (o creme, vindo do `body`); conteúdo — lista do cardápio, cartão, sheet — em `bg-white` explícito.
- Divisor entre linhas `border-gray-200`; borda de input e chip `border-gray-300`; toast `bg-gray-800`.

Por que não criar `--color-body` ou `--color-heading`: no Tailwind, cor de texto e tamanho de texto dividem o prefixo `text-`. `text-body` (cor) ao lado de `text-body1` (tamanho) é um convite a erro. A escala numérica evita a colisão.

Regras que mantêm a cara do iFood:

- **Um verde cheio por dobra** (2026-09-23). Por tela, no máximo uma área
  preenchida de verde e um acento verde; o resto é grafite, cinza ou o bege do
  papel de parede. A landing tinha doze elementos verdes na primeira dobra e
  nenhum era o CTA. Área grande de verde não existe mais: onde havia um bloco
  verde em tela cheia, agora há grafite com o botão verde por cima — é a
  variação de modo escuro que o sistema de marca do WhatsApp descreve, e é ela
  que devolve o brilho ao verde.
- Verde é escasso. Se tudo é verde, nada é CTA. Reserve para a ação principal da tela, o estado ativo, badges e os ícones de linha das ilustrações.
- Verde não serve para texto longo: o contraste cai em corpo de texto. Só links curtos e rótulos.
- Amarelo e vermelho têm significado fixo (estrela, erro). Não decore com eles. O `brand` (verde vivo) nunca é texto.
- Papel de parede (`wallpaper`) só em seção que não é branca, e sempre com o conteúdo em cartão branco por cima.
- Texto sobre foto só com `image-gradient` por baixo.

## 3. Tipografia

O iFood usa a "Tipo iFood" (2023, Fabio Haag Type com a FutureBrand), proprietária. Ela não pode ser embarcada, e não se procura "sósia" dela: fonte parecida-mas-errada chama mais atenção do que uma neutra bem usada.

**Três famílias, três papéis (2026-09-23 — D19).** Até então havia uma só, a
Inter, escolhida por ser o fallback declarado da Tipo iFood. Só que a marca
deixou de ser a do iFood no dia em que o verde substituiu o vermelho, e sobrou
uma fonte escolhida para imitar outra que não está mais em jogo. O iFood de
verdade usa **dois** cortes — o site institucional carrega
`TipoiFoodTitulos-Bold` e `TipoiFoodTextos-Regular` —, e é essa estrutura que o
MenuQR passa a ter.

| Classe | Família | Onde |
|---|---|---|
| `font-sans` | Inter | INTERFACE e corpo: botão, campo, linha do cardápio, preço, tabela, loja inteira, painel inteiro |
| `font-display` | Figtree | TÍTULO e eyebrow do site institucional: landing, auth, logo. Humanista de bojo redondo e abertura larga — a mesma intenção que o desenhador da Tipo iFood descreve ("formas bem abertas… tecnologia sem a frieza que costuma vir junto") |
| `font-mono` | JetBrains Mono | TEXTO DE MÁQUINA e nada mais: link do cardápio, chave Pix, caminho do navegador falso da landing |

- **`--font-mono` não existia.** O tema zera `--color-*`, `--text-*`, `--radius-*`
  e `--shadow-*`, mas nunca declarou `--font-*` para o mono: as dezessete
  ocorrências de `font-mono` caíam no monoespaçado padrão do Tailwind e mudavam
  de desenho por sistema (SF Mono no Mac, Consolas no Windows, Liberation Mono
  no Android). Doze delas eram eyebrow decorativa e foram para `font-display`.
- **Eyebrow é `font-display` em caixa alta**, `text-caption font-semibold
  uppercase tracking-widest`. Nunca monoespaçada: mono passou a significar uma
  coisa só, "isto foi escrito por uma máquina e você pode copiar".
- Pesos: 400, 500, 600 e 700. O 800 só aparece nos títulos grandes da landing.
- **Espacejamento zero e nenhuma caixa alta** (D21). O site do WhatsApp não tem
  um único `letter-spacing` nem um único `text-transform` na página inteira, e
  era isso que dava à landing o ar de agência. `tracking-tight`, `tracking-widest`
  e `uppercase` saíram de todas as superfícies; a eyebrow é `font-display
  text-caption font-semibold` em caixa normal. Exceção única: o selo `Tag dark`
  ("OBRIGATÓRIO"), que é citação de um print do app real (D5).
- **Entrelinha 1,0 nos títulos grandes** (`h3` 1,05 · `h2` 1,02 · `h1` e
  `display` 1,0). Eles usam entrelinha igual ao corpo da letra em todos os
  títulos, e é o que faz o bloco parecer uma peça sólida.
- **Peso máximo 600.** O `font-extrabold` saiu. Eles usam 400 em título de 80px,
  mas isso só se sustenta com fonte proprietária; 600 é o meio-termo honesto.
- **Título é `gray-900`, não `gray-700`.** O `gray-700` é o cinza de corpo; nos
  títulos da landing ele dava 9,16:1 onde o `gray-900` dá 17,46:1, e o tamanho
  prometia um peso que a cor não entregava. É o mesmo `#111b21` que o WhatsApp
  usa em texto primário. Dentro da loja e do painel o título continua
  `gray-700`.

| Utilitário | px | line-height | Uso |
|---|---|---|---|
| `text-caption` | 12 | 1.4 | metadados, helper, contador |
| `text-body2` | 14 | 1.4 | descrição de item, rótulo de botão, tab |
| `text-body1` | 16 | 1.5 | nome de item, corpo, input |
| `text-subtitle` | 18 | 1.4 | título de seção do cardápio |
| `text-h6` | 20 | 1.3 | nome da loja, nome do item na página |
| `text-h5` | 24 | 1.25 | título de card do painel, auth |
| `text-h4` | 28 | 1.2 | título de página |
| `text-h3` | 32 | 1.2 | títulos de seção da landing |
| `text-h2` · `text-h1` · `text-display` | 40 · 48 · 56 | 1.15 · 1.1 · 1.05 | hero da landing |

Inputs usam `text-body1` (16px) sempre: abaixo disso o Safari do iOS dá zoom ao focar.

## 4. Espaçamento, grid e alturas

Base de 4px — é o `--spacing` padrão do Tailwind, então `p-4` = 16px. Papéis:

| px | Classe | Onde |
|---|---|---|
| 4 | `gap-1` | ícone e badge, estrela e nota |
| 8 | `p-2` | padding de tag |
| 12 | `gap-3` | texto e foto na linha de item, padding de chip |
| 16 | `p-4` | padding de card, de input e gutter mobile |
| 24 | `gap-6` | entre cards |
| 32 | `py-8` | entre seções |
| 48 · 64 | `py-12` · `py-16` | blocos da landing |

- Largura: `max-w-page` (1200px) e `max-w-narrow` (640px). Gutter `px-4 md:px-6 lg:px-8`.
- Breakpoints padrão do Tailwind (768/1024/1280) coincidem com os do iFood. Mobile-first sempre: mais de 90% do tráfego é celular.
- Alturas fixas em `:root`: `--app-bar-height` (56px), `--tabs-height` (48px) e `--sticky-offset` (soma + 8px), usado em `scroll-margin-top` e no `rootMargin` do scroll-spy. Os três mudam juntos.
- Barras inferiores usam `pb-safe-4`; sheets de tela cheia usam `h-dvh`. Nunca `100vh`.

## 5. Raio

| Classe | px | Papel |
|---|---|---|
| `rounded-xs` | 4 | tags e badges de texto |
| `rounded-sm` | 8 | botões do app, inputs, thumbnails, toasts, banners |
| `rounded-md` | 12 | cards — a assinatura visual do iFood |
| `rounded-lg` | 16 | bottom sheets, dialogs, cards de destaque |
| `rounded-xl` | 24 | barra de busca, imagens grandes da landing |
| `rounded-full` | — | chips, avatares, icon buttons, CTAs pill da landing |

Um papel, um raio. Nunca canto vivo em elemento interativo. Atenção: os nomes coincidem com os do Tailwind padrão, mas os valores não (o `rounded-xl` padrão é 12px; aqui é 24px). Veja a seção 9.

## 6. Elevação

| Classe | Onde |
|---|---|
| sem sombra | listas, linhas, seções — o padrão |
| `shadow-low` | card em repouso |
| `shadow-medium` | hover de card, busca em foco, botão "+" sobre a foto |
| `shadow-high` | bottom sheet, barras inferiores, toast |
| `shadow-highest` | dialog no desktop |

O iFood é chapado: a hierarquia vem de divisores finos e de blocos `gray-50`, não de sombra. Opacidade máxima de sombra: 0.2. Nada de blur de fundo, brilho ou gradiente.

## 7. Movimento

Os números de movimento são **inferidos** (convenções do Material 3 e do iOS, que os apps nativos do iFood seguem), não medidos.

- Easings: `ease-standard` (mudança no lugar), `ease-decelerate` (entradas), `ease-accelerate` (saídas).
- Durações (`duration-100` … `duration-300`): 100 toque, 150 hover e fade, 200 chips, tabs, toast e saída de sheet, 250 barra da sacola, 300 entrada de sheet e de página. Nada acima de 300ms, exceto o shimmer.
- Animações prontas: `animate-fade-in/out`, `animate-slide-up`, `animate-sheet-in/out`, `animate-slide-in-right`/`animate-slide-out-right`, `animate-pop-in/out`, `animate-toast-in/out`, `animate-badge-pop`, `animate-shimmer`.

Receitas e o catálogo completo estão em `motion.md`.

## 8. Como o Tailwind v4 lê o tema

Verificado no Tailwind 4.3.3 instalado:

- Cada namespace gera utilitários: `--color-x` → `bg-x`/`text-x`/`border-x`; `--text-x` (+ `--text-x--line-height`) → `text-x`; `--radius-x` → `rounded-x`; `--shadow-x` → `shadow-x`; `--ease-x` → `ease-x`; `--animate-x` → `animate-x` (os `@keyframes` ficam dentro do `@theme`); `--container-x` → `max-w-x`.
- **Não existe namespace `--duration-*`**: use `duration-150`, `duration-200`.
- `--namespace-*: initial` apaga os valores padrão daquele namespace. É o que impede `bg-orange-500` ou `shadow-md` de funcionar. `--color-white` e `--color-black` são cores de tema e precisam ser redeclaradas.
- `@theme static` emite todas as variáveis mesmo sem uso em classes, para `var(--color-primary)` funcionar em CSS próprio e em `style={{}}`.
- `@theme inline` faz a classe usar o valor direto em vez de `var(--x)`. É necessário em `--font-sans`, porque a variável do `next/font` vive no `<html>`.
- `@utility` cria utilitários próprios que aceitam variantes (`lg:pb-4` vence `pb-safe-4`).
- Variantes úteis que já existem: `motion-reduce:`, `motion-safe:`, `open:`, `backdrop:`, `line-clamp-2`, `size-10`, `h-dvh`.

## 9. Bloco LEGADO e o codemod da fase 1

Mais de mil ocorrências de tokens e classes antigas em 52 arquivos não migram numa edição só. O final do `theme.css` traz um bloco `LEGADO` que mantém o app buildando enquanto os arquivos migram um a um:

- `ink-*`, `flame-*` e `whatsapp-*` apontam para cinzas e vermelhos novos;
- `rounded-card`, `rounded-btn`, `shadow-soft/lift/glow`, `ease-out-soft` e `font-display` apontam para os equivalentes novos;
- `.btn*`, `.surface*`, `.field-input*` e `.container-page` continuam existindo, já com cara de iFood; `.glow-hero`, `.grid-pattern` e `.text-gradient` viram no-op;
- `--tenant-brand*` e `--header-height` ficam em `:root` até a fase 3.

Resultado: depois da fase 1 o app inteiro já aparece vermelho, cinza e em Inter, e as fases seguintes só removem usos. A auditoria reprova enquanto o bloco existir — essa é a condição de saída da fase 7.

**O codemod.** O tema novo reaproveita nomes da escala padrão do Tailwind com outros valores. Sem tradução, 51 `rounded-xl` passariam de 12px para 24px e 15 `rounded-lg` de 8px para 16px. Logo depois de colar o `theme.css`, rode uma única vez:

```bash
node .claude/skills/ifood-design/scripts/codemod-scale.mjs --dry-run
node .claude/skills/ifood-design/scripts/codemod-scale.mjs
```

| Tailwind padrão | Pomodoro | | Tailwind padrão | Pomodoro |
|---|---|---|---|---|
| `rounded-md` (6) · `rounded-lg` (8) | `rounded-sm` (8) | | `text-xs` · `text-sm` | `text-caption` · `text-body2` |
| `rounded-xl` (12) | `rounded-md` (12) | | `text-base` · `text-lg` | `text-body1` · `text-subtitle` |
| `rounded-2xl` (16) | `rounded-lg` (16) | | `text-xl` · `text-2xl` | `text-h6` · `text-h5` |
| `rounded-3xl` (24) | `rounded-xl` (24) | | `text-3xl … text-7xl` | `text-h4 … text-display` |

Não rode duas vezes: a segunda passada retraduziria `rounded-md` para `rounded-sm`. Raios arbitrários (`rounded-[2rem]`) ficam para a migração manual; a auditoria aponta.

## 10. Armadilhas

- Classe fora da escala não dá erro de build: simplesmente não gera CSS. `rounded-2xl`, `shadow-md`, `text-sm` e `bg-red-500` somem em silêncio depois que o bloco LEGADO sai. Rode a auditoria com `--strict`.
- Strings de classe precisam ser literais completas. `text-${tone}` nunca é gerado; use um mapa `Record<Tone, string>`. O `cn()` de `src/lib/cn.ts` basta; não instale `clsx` nem `tailwind-merge`.
- `pb-safe` e `pt-safe` valem zero sem `viewportFit: 'cover'` no `viewport` de `src/app/layout.tsx`.
- Entradas animadas não usam `fill-mode: both`: o transform final ficaria preso e impediria arrastar o sheet. Saídas usam `forwards`.
- Não leia o relógio nem o `localStorage` no primeiro render: as páginas da loja são ISR e o HTML é compartilhado.
