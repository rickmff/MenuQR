# Tokens — Pomodoro no Tailwind v4

## Sumário

1. Fonte da verdade
2. Cores
3. Tipografia
4. Espaçamento, grid e alturas
5. Raio
6. Elevação
7. Movimento
8. Como o Tailwind v4 lê o tema e os utilitários próprios
9. Bloco LEGADO e o codemod da fase 1
10. Armadilhas

## 1. Fonte da verdade

Os valores vivem em `assets/theme.css`, que substitui `src/app/globals.css` por inteiro na fase 1. Este documento explica nomes, papéis e o porquê; quando precisar de um hex, abra o `theme.css`. Se mudar um valor, mude lá.

O `theme.css` espelha os tokens, a base e os utilitários do `src/app/globals.css` como estavam em 2026-09-24, depois do refactor "de app" das telas do cliente. Fica só no `globals.css` o papel de parede animado da landing (`wallpaper`, `wallpaper-light`, `--animate-wallpaper` e o keyframe `wallpaper-drift`). Se os dois divergirem, o `globals.css` é o que roda: ajuste o `theme.css` a ele.

A origem dos valores é uma extração pública do CSS do iFood mais análise da marca (ver `sources.md`). O iFood não publica o Pomodoro, então trate os números como observação cuidadosa, não como especificação oficial. Se o usuário trouxer um print, um Figma ou um valor medido, isso vence este arquivo.

## 2. Cores

**A cor do sistema é o verde do WhatsApp, não o vermelho do iFood** (decisão do dono, 2026-09-22). O verde vivo do logo deles (`#25d366`) tem 2:1 sobre branco: serve para marca e badge, nunca para texto nem para botão com rótulo branco. Por isso o `primary` é o mesmo matiz (142°) escurecido até 4,7:1, o `hover` é o verde de ação do app atual, o `tint` é o balão enviado, e o vermelho ficou restrito a erro (o "apagar" do WhatsApp). Os cinzas também são os do WhatsApp: azulados de leve.

| Token                                | Valor                                     | Origem                                                                                           |
| ------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `primary`                            | `#0b8639`                                 | #25d366 escurecido (H 142°, S 85%, L 29%)                                                        |
| `primary-hover`                      | `#1daa61`                                 | verde de ação do app                                                                             |
| `primary-pressed` · `primary-active` | `#096b2e` · `#075424`                     | mesma escala                                                                                     |
| `primary-tint`                       | `#d9fdd3`                                 | balão enviado (modo claro)                                                                       |
| `brand`                              | `#25d366`                                 | verde do logo — marca do Menu Online e badges, só                                                |
| `chat-bg`                            | `#efeae2`                                 | papel de parede da conversa                                                                      |
| `tick`                               | `#53bdeb`                                 | tique azul de "lido"                                                                             |
| `error` · `error-pressed`            | `#ea0038` · `#a8002a`                     | vermelho de "apagar"                                                                             |
| `gray-900 … gray-400`                | `#111b21 #1f2c34 #3b4a54 #667781 #8696a0` | TINTA — os azulados do WhatsApp                                                                  |
| `gray-300 … gray-50`                 | `#d1d7db #e9edef #f0f2f5 #f7f8fa`         | SUPERFÍCIE — cinza frio. Só na home: a família do creme, `#d3cabb #e5ded1 #f4ede1 #fcf5eb` (D21) |

**Papel quente só na home (2026-09-23 — D21).** Medido no whatsapp.com, o creme
`#fcf5eb` cobre 66,4% da tela e o texto por cima é um grafite azulado. O
contraste de temperatura dá nitidez sem o estalo do branco puro, e é por isso
que a escala neutra se parte em duas: os quatro degraus claros são superfície;
os cinco escuros são tinta e continuam frios.

Aplicado ao sistema inteiro, o creme lia como bege no painel — ferramenta
olhada por hora, e não por dez segundos — e no cardápio. Ficou só na home, onde
o parentesco com o app é o argumento de venda. O `@theme` guarda os quatro
degraus frios, e a home liga o creme com `data-paper="creme"` no wrapper de
`src/app/(plataforma)/page.tsx`:

```css
html:has([data-paper="creme"]) {
  --color-gray-50: #fcf5eb; /* … e os outros três degraus de superfície */
}
```

Trocar só os quatro primeiros degraus vira a temperatura da página inteira —
header, rodapé, `Card`, bordas — sem que componente nenhum saiba que existem
dois papéis. `html:has()`, e não uma classe no wrapper, porque o cabeçalho e o
rodapé são irmãos da página, e não filhos dela. O `chat-bg` não entra nessa
troca: é o bege medido do WhatsApp Web e vale em qualquer tela que use
`wallpaper` ou `cover-fallback`.

| Onde                                                                                                                                                                 | Papel                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `body`                                                                                                                                                               | `gray-50`: cinza frio; creme na home                                                                                                                                                                                                                                                                                                             |
| painel                                                                                                                                                               | `gray-50` frio (`PanelShell`); cartão branco com borda `gray-200`                                                                                                                                                                                                                                                                                |
| loja: cardápio, item, sacola                                                                                                                                         | `bg-white` de borda a borda (`StoreFrame`). O `gray-50` volta só em volta do painel do item no desktop, no campo `soft`, nos blocos cinza da Sacola e do Finalizar (CEP cotado, "Vamos confirmar com o restaurante", endereço da retirada), no aviso de prato indisponível (`Banner tone="neutral"`) e no toque das linhas (`active:bg-gray-50`) |
| lista do cardápio, cartão, sheet, balão, app bar                                                                                                                     | `bg-white` explícito                                                                                                                                                                                                                                                                                                                             |
| tile de foto, chip, botão `tertiary`, `IconButton tonal`, trilho do segmentado, `Tag ink`, selo "Obrigatório", `Stepper soft`, "+" da linha sem foto, barra de busca | `gray-100`                                                                                                                                                                                                                                                                                                                                       |
| divisor e borda de cartão                                                                                                                                            | `gray-200`                                                                                                                                                                                                                                                                                                                                       |
| borda de input e de chip                                                                                                                                             | `gray-300`                                                                                                                                                                                                                                                                                                                                       |

O branco é o **conteúdo**, que é o que ele é no WhatsApp: no app deles a lista
de conversas é branca e o resto é papel. A borda `gray-200` sobre branco dá
1,18:1 no cinza frio e 1,34:1 no creme.

**O papel `gray-200` do painel não está no código.** A D21 o registrou como
resposta ao cartão branco que sumia no creme (1,08:1); com o creme restrito à
home, o painel é `bg-gray-50` frio e o cartão se separa pela borda. Sobre esse
papel vale a D20: `gray-600` dá 4,37:1 e `primary` 4,41:1 — os dois reprovam
em texto pequeno —, então corpo direto sobre o papel é `gray-700` (8,62:1) e
verde de texto é `green-700` (6,53:1). Dentro do cartão branco, `gray-600`
(4,65:1) e `primary` (4,68:1) passam.

**Armadilha:** `border-gray-200` sobre fundo `gray-200` some (1:1). Divisor
que fica direto sobre um fundo cinza precisa de `gray-300`; dentro de um
cartão branco o `gray-200` continua valendo.

**Escala verde (2026-09-23).** Existiam dois verdes — um vivo que não serve para
nada com texto e um escuro que servia para tudo. Faltavam os degraus do meio, e
sem eles não havia como dosar. `green-*` é o mesmo matiz (142°), do claro ao
escuro; `green-400` é o `brand` e `green-600` é o `primary`, então a escala não
cria cor nova, só nomeia o que faltava.

| Token       | Valor     | Sobre branco | Sob `gray-900` | Papel                             |
| ----------- | --------- | ------------ | -------------- | --------------------------------- |
| `green-100` | `#d9fdd3` | 1,11:1       | 15,75:1        | balão enviado (= `primary-tint`)  |
| `green-300` | `#5ede8d` | 1,71:1       | 10,24:1        | hover do botão `brand`            |
| `green-400` | `#25d366` | 1,98:1       | 8,80:1         | marca e botão `brand` (= `brand`) |
| `green-500` | `#1daa61` | 3,01:1       | 5,80:1         | pressed do botão `brand`          |
| `green-600` | `#0b8639` | 4,68:1       | —              | ação sobre BRANCO (= `primary`)   |
| `green-700` | `#08682b` | 6,94:1       | —              | ação sobre fundo que não é branco |
| `green-800` | `#0f3d26` | 12,24:1      | —              | fundo escuro                      |

**Regra do verde sobre fundo que não é branco.** O `primary` foi calculado a
4,68:1 contra branco, e essa folga some assim que o fundo escurece: sobre o
papel de parede (`#efeae2`) ele cai para 3,91:1 e sobre `gray-50` para 4,41:1
(4,33:1 no creme da home) — os dois reprovam em texto pequeno. Fora do branco,
verde de texto é `green-700`. O mesmo vale para o `gray-600`, que sobre o bege
dá 3,88:1: ali o corpo é `gray-700`.

**`gray-600` sobre `gray-100` reprova (2026-09-24, medido pelo axe).** Dá
4,14:1, abaixo dos 4,5:1 do texto pequeno, e o `gray-100` é o fundo de todas as
superfícies tonais da loja. Por isso o rótulo inativo do `SegmentedControl
indicator="sliding"` (Entrega/Retirada, sobre o trilho `gray-100`) é
`gray-700`, e a `Tag` da loja — tag do item e "Indisponível" na linha sem
foto (com foto, o selo é `gray-800/85` sobre a imagem) — usa `tone="ink"`:
`gray-700` sobre `gray-100`, 8,16:1. O selo
"Obrigatório" dos grupos do item é a mesma dupla. O `indicator="fill"` e a
`Tag` `neutral` do painel continuam em `gray-600` sobre `gray-100`, com a mesma
reprovação: o painel ficou fora do refactor.

**Pendência no código (2026-09-24).** Três blocos `bg-gray-50` ainda escrevem
em `gray-600` (4,37:1). No Finalizar (`checkout-step.tsx`): o aviso "Vamos
confirmar com o restaurante", que aparece com "Meu bairro não está na lista"
ou com o CEP fora do raio, e o endereço da retirada. Na Sacola e no Finalizar:
o CEP cotado (`delivery-quote-field.tsx`), onde o "Trocar" em `primary` dá
4,41:1. Pela regra acima, ali o corpo é `gray-700` e o verde de texto é
`green-700`.

**O rótulo do botão verde vivo é grafite, não branco.** Foi a regra do rótulo
branco que empurrou a cor de ação para o escuro. Invertendo o rótulo, o
`#111b21` sobre `#25d366` dá 8,8:1 — quase o dobro do branco sobre `primary` — e
a landing recupera o verde que a pessoa reconhece do celular. Branco sobre verde
vivo continua proibido.

| Utilitário                                             | Papel                                                                                                                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `primary`                                              | CTA, tab ativa do painel, badge de contagem, link curto, ícone ativo, ícone de linha. Na loja a aba ativa é grafite (`Tabs tone="ink"`, traço de 3px)                        |
| `brand`                                                | fundo do logo do Menu Online, badge de não lidos e do `Button variant="brand"` (rótulo grafite): o CTA da landing e o "Fazer pedido pelo WhatsApp" do Finalizar. Nunca texto |
| `chat-bg`                                              | fundo do `wallpaper` (landing) e de qualquer área "de conversa"                                                                                                              |
| `tick`                                                 | os dois tiques de pedido enviado/lido                                                                                                                                        |
| `primary-hover` · `primary-pressed` · `primary-active` | estados do verde                                                                                                                                                             |
| `primary-tint`                                         | fundo sutil, item ativo da sidebar do painel, seleção de texto                                                                                                               |
| `pink-100` · `pink-200` · `pink-300`                   | herança do iFood, sem uso novo: promoção agora é `primary-tint`                                                                                                              |
| `star`                                                 | avaliação. Nunca vermelho                                                                                                                                                    |
| `positive` · `whatsapp`                                | "Grátis", "Aberto", preço promocional · texto e ícone que falam do WhatsApp — os dois são o próprio `primary`, com nome pelo assunto                                         |
| `success` / `success-bg`                               | toast e banner de sucesso                                                                                                                                                    |
| `warning` / `warning-bg`                               | loja fechada, pedido mínimo, revisão da sacola                                                                                                                               |
| `error` / `error-bg`                                   | erro de campo e de envio                                                                                                                                                     |
| `info` / `info-bg`                                     | avisos informativos: modo demonstração, prévia e, no painel, o aviso que não bloqueia nada (sugestão de horários, rascunho, cobrança pendente) |
| `gray-400 … gray-900`                                  | tinta fria. Não existe `gray-500`                                                                                                                                            |
| `gray-50 … gray-300`                                   | superfície: cinza frio; o creme só na home (D21)                                                                                                                             |
| `white` · `black` · `scrim`                            | redeclarados porque o reset apaga a paleta padrão                                                                                                                            |

**Hierarquia de texto pela escala de cinza**, sem apelidos semânticos:

- Títulos do site institucional e, desde 2026-09-24, os títulos grandes da loja: `text-gray-900`. Nome do item na lista da loja, e nomes e preços no painel: `text-gray-700` — o iFood nunca usa preto puro, e é isso que dá o ar "macio" à lista. Preço na loja (linha do item, página do item, total da barra inferior): `font-bold text-gray-900`.
- Corpo, descrições e metadados: `text-gray-600`.
- Placeholder, desabilitado e ícone inativo: `text-gray-400`.
- Página `bg-gray-50` (vindo do `body`: cinza frio, creme na home); conteúdo — lista do cardápio, cartão, sheet — em `bg-white` explícito. A casca da loja é branca inteira (`StoreFrame`).
- Divisor entre linhas `border-gray-200`; borda de input e chip `border-gray-300`; toast `bg-gray-800`. Na loja, desde 2026-09-24, as linhas do cardápio, das opções do item e da sacola não têm divisor: o respiro separa.

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
- Capa da loja sem foto: `cover-fallback`, o mesmo papel parado (2026-09-24). A deriva de 75s do `wallpaper` custaria composição contínua numa área grande que a pessoa olha enquanto lê o cardápio.
- Texto sobre foto só com `image-gradient` por baixo. Na capa da loja não vai texto nenhum: o nome fica na folha branca logo abaixo, legível com qualquer foto. Foco de teclado sobre foto ou capa é `focus-ring-photo`.

## 3. Tipografia

O iFood usa a "Tipo iFood" (2023, Fabio Haag Type com a FutureBrand), proprietária. Ela não pode ser embarcada, e não se procura "sósia" dela: fonte parecida-mas-errada chama mais atenção do que uma neutra bem usada.

**Três famílias, três papéis (2026-09-23 — D19).** Até então havia uma só, a
Inter, escolhida por ser o fallback declarado da Tipo iFood. Só que a marca
deixou de ser a do iFood no dia em que o verde substituiu o vermelho, e sobrou
uma fonte escolhida para imitar outra que não está mais em jogo. O iFood de
verdade usa **dois** cortes — o site institucional carrega
`TipoiFoodTitulos-Bold` e `TipoiFoodTextos-Regular` —, e é essa estrutura que o
Menu Online passa a ter.

| Classe         | Família        | Onde                                                                                                                                                                                                                                                                                                       |
| -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `font-sans`    | Inter          | INTERFACE e corpo: botão, campo, linha do cardápio, preço, tabela, abas, o resto da loja e o painel inteiro                                                                                                                                                                                                |
| `font-display` | Figtree        | TÍTULO e eyebrow do site institucional: landing, auth, logo. Desde 2026-09-24, também os **títulos grandes da loja** (abaixo). Humanista de bojo redondo e abertura larga — a mesma intenção que o desenhador da Tipo iFood descreve ("formas bem abertas… tecnologia sem a frieza que costuma vir junto") |
| `font-mono`    | JetBrains Mono | TEXTO DE MÁQUINA e nada mais: link do cardápio, chave Pix, caminho do navegador falso da landing                                                                                                                                                                                                           |

**Figtree nos títulos grandes da loja (2026-09-24, decisão do dono).** A D19
reservava a Figtree ao site institucional. No refactor "de app" das telas do
cliente os títulos ganharam o mesmo corte, e a D19 passa a valer também ali.
Todos são `font-display font-bold text-gray-900`:

| Título                                                                                                                | Tamanho                                          | Onde                                                                                          |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| nome da loja                                                                                                          | `text-h4 lg:text-h3`, com `leading-tight` (1,25) | `StoreIdentity` — é um `<p>`: o `h1` da página é `sr-only`                                    |
| título do item                                                                                                        | `text-h4`                                        | `ItemDetail` (o `h1`)                                                                         |
| seção do cardápio · grupo de complementos                                                                             | `text-h5`                                        | `MenuBrowser` · `OptionGroup`                                                                 |
| "Sua sacola" · "Pedido enviado!"                                                                                      | `text-h5`                                        | `bag-step` · `done-step`                                                                      |
| seção do Finalizar · título de sheet com o fechar ("×") à esquerda ("Sobre a loja", "Compartilhar", "Limpar sacola?") | `text-h6`                                        | `checkout-step` · `BottomSheet closeSide="start"` (`ConfirmDialog appearance="store"` também) |
| estado vazio de tela inteira (sacola vazia, prato que não abre)                                                       | `text-h5`                                        | `EmptyState variant="hero"` (`bag-step`, `item-missing`)                                      |

O resto da loja continua Inter: nome e preço na linha do item, abas, botões,
campos, o nome na barra compacta, o título central do topo da Sacola
("Sacola", "Finalizar pedido", "Pedido enviado") e os estados vazios que não
são a tela inteira — cardápio sem itens, busca sem resultado (`EmptyState`
padrão, `text-subtitle`). O painel não muda: lá o título do sheet,
com o fechar à direita, é `text-subtitle font-bold text-gray-700` em Inter.

- **`--font-mono` não existia.** O tema zera `--color-*`, `--text-*`, `--radius-*`
  e `--shadow-*`, mas nunca declarou `--font-*` para o mono: as dezessete
  ocorrências de `font-mono` caíam no monoespaçado padrão do Tailwind e mudavam
  de desenho por sistema (SF Mono no Mac, Consolas no Windows, Liberation Mono
  no Android). Doze delas eram eyebrow decorativa e foram para `font-display`.
- **Eyebrow é `font-display`**, `text-caption font-semibold`, em caixa normal
  desde a D21 (abaixo). Nunca monoespaçada: mono passou a significar uma
  coisa só, "isto foi escrito por uma máquina e você pode copiar".
- Pesos: 400, 500, 600 e 700. O 800 saiu (D21).
- **Espacejamento zero e nenhuma caixa alta** (D21). O site do WhatsApp não tem
  um único `letter-spacing` nem um único `text-transform` na página inteira, e
  era isso que dava à landing o ar de agência. `tracking-tight`, `tracking-widest`
  e `uppercase` saíram de todas as superfícies; a eyebrow é `font-display
text-caption font-semibold` em caixa normal. Exceção única: o selo `Tag dark`
  ("OBRIGATÓRIO"), que é citação de um print do app real (D5). Hoje ele só
  aparece no `SetupWidget` do painel: no item da loja o "Obrigatório" virou
  pílula `gray-100` em caixa normal (2026-09-24).
- **Entrelinha 1,0 nos títulos grandes** (`h3` 1,05 · `h2` 1,02 · `h1` e
  `display` 1,0). Eles usam entrelinha igual ao corpo da letra em todos os
  títulos, e é o que faz o bloco parecer uma peça sólida.
- **Peso: 600 no hero, 700 nos outros títulos.** O `font-extrabold` saiu. Eles
  usam 400 em título de 80px, mas isso só se sustenta com fonte proprietária; o
  hero da landing (`h1`, `display`) fica em 600, o meio-termo honesto. Os
  títulos de seção da landing e os títulos grandes da loja são `font-bold`
  (700), que também é o peso da base para `h1`–`h3`.
- **Título é `gray-900`, não `gray-700`.** O `gray-700` é o cinza de corpo; nos
  títulos da landing ele dava 9,16:1 onde o `gray-900` dá 17,46:1, e o tamanho
  prometia um peso que a cor não entregava. É o mesmo `#111b21` que o WhatsApp
  usa em texto primário. Na loja, desde 2026-09-24, os títulos grandes também
  são `gray-900`; o nome do item na lista continua `gray-700`. No painel o
  título continua `gray-700`.

| Utilitário                             | px           | line-height      | Uso                                                                                                |
| -------------------------------------- | ------------ | ---------------- | -------------------------------------------------------------------------------------------------- |
| `text-caption`                         | 12           | 1.4              | metadados, helper, contador                                                                        |
| `text-body2`                           | 14           | 1.4              | descrição de item, rótulo de botão, tab                                                            |
| `text-body1`                           | 16           | 1.5              | nome de item, corpo, input                                                                         |
| `text-subtitle`                        | 18           | 1.4              | nome do item na lista da loja, título de sheet do painel                                           |
| `text-h6`                              | 20           | 1.3              | preço na página do item, total da barra inferior, seção do Finalizar, título de sheet da loja      |
| `text-h5`                              | 24           | 1.25             | título de card do painel, auth; na loja, seção do cardápio, grupo, "Sua sacola", "Pedido enviado!" |
| `text-h4`                              | 28           | 1.2              | título de página; nome da loja e título do item                                                    |
| `text-h3`                              | 32           | 1.05             | títulos de seção da landing; nome da loja no `lg`                                                  |
| `text-h2` · `text-h1` · `text-display` | 40 · 48 · 56 | 1.02 · 1.0 · 1.0 | hero da landing                                                                                    |

Inputs usam `text-body1` (16px) sempre: abaixo disso o Safari do iOS dá zoom ao focar.

## 4. Espaçamento, grid e alturas

Base de 4px — é o `--spacing` padrão do Tailwind, então `p-4` = 16px. Papéis:

| px      | Classe            | Onde                                                                                                          |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------- |
| 4       | `gap-1`           | ícone e badge, estrela e nota                                                                                 |
| 8       | `p-2`             | padding de tag                                                                                                |
| 12      | `gap-3`           | padding de chip                                                                                               |
| 16      | `p-4`             | padding de card, de input e gutter mobile; na loja, texto e foto na linha do item (`gap-4`, desde 2026-09-24) |
| 24      | `gap-6`           | entre cards                                                                                                   |
| 32      | `py-8`            | entre seções                                                                                                  |
| 48 · 64 | `py-12` · `py-16` | blocos da landing                                                                                             |

- Largura: `max-w-page` (1200px) e `max-w-narrow` (640px, também o painel do item no desktop); no painel, `max-w-panel` (1024px) e `max-w-panel-form` (768px). Gutter `px-4 md:px-6 lg:px-8`.
- Breakpoints padrão do Tailwind (768/1024/1280) coincidem com os do iFood. Mobile-first sempre: mais de 90% do tráfego é celular.
- Barras inferiores usam `pb-safe-4`; sheets de tela cheia usam `h-dvh`; a casca pública da loja é `min-h-dvh`, a moldura da prévia mede `h-(--screen-height)` e o painel do item no desktop se limita por ela. Nunca `100vh`.

**Offsets da loja (2026-09-24).** `--app-bar-height` e `--sticky-offset` saíram
com o refactor "de app". Os offsets novos descrevem a tela do cliente e sabem
que ela pode estar dentro da moldura da prévia:

| Variável (`:root`)             | Valor                                                      | Papel                                                                                                                                                                                                                                                                             |
| ------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--safe-top` · `--safe-bottom` | `env(safe-area-inset-top)` · `env(safe-area-inset-bottom)` | área segura como variável, e não `env()` direto: a moldura da prévia zera as duas                                                                                                                                                                                                 |
| `--screen-height`              | `100dvh`                                                   | altura da "tela" da loja: a janela no público, a moldura na prévia                                                                                                                                                                                                                |
| `--top-bar-height`             | 3.5rem (56)                                                | barra compacta da loja (`StoreHeader`, `data-store-top-bar`)                                                                                                                                                                                                                      |
| `--top-inset`                  | `calc(var(--top-bar-height) + var(--safe-top))`            | onde o conteúdo começa abaixo da barra: as abas de categoria grudam em `top-(--top-inset)`; os resultados da busca, o painel do item no desktop e o prato que não abre começam abaixo dele                                                                                        |
| `--tabs-height`                | 3rem (48)                                                  | abas de categoria (`Tabs size="lg"`); hoje só entra no `scroll-margin-top` das âncoras                                                                                                                                                                                            |
| `--bottom-bar-height`          | 4.75rem (76 = 12 de respiro + botão de 48 + 16)            | altura da `CartBar` (`StickyBottomBar tone="white"`; o `BottomBar` da Sacola tem a mesma). Usada pelo espaçador que a `CartBar` deixa no fim da página e pelo toast, 8px acima dela, somado ao `--safe-bottom`. O CTA do item, sobre o degradê (`pt-12`), é mais alto e não a usa |

- **Âncoras**: `[id] { scroll-margin-top: calc(var(--top-inset) + var(--tabs-height)) }`. O `calc` fica na regra, e não numa variável do `:root`, para resolver por elemento: dentro da moldura o `--top-inset` é outro. Quem não tem as abas por cima sobrescreve: os grupos do item param abaixo do "‹" flutuante (`scroll-mt-[calc(var(--safe-top)+4.5rem)] lg:scroll-mt-6`) e as seções da landing usam `scroll-mt-16`.
- **Prévia do painel**: `EmbeddedShell` (`store/store-shell.tsx`) redeclara `[--safe-top:0px] [--safe-bottom:0px] [--screen-height:min(80dvh,56rem)] [--top-inset:var(--top-bar-height)]`. O `--top-inset` vai junto porque uma variável feita de `var()` é resolvida onde foi declarada, e a do `:root` já guardou o notch. O `transform-gpu` da moldura faz dela o bloco de contenção dos `fixed` da loja (barra do topo, `CartBar`, CTA do item), que ficam presos a ela como na tela de um celular.
- **`rootMargin` não aceita `var()` nem `env()`**: o scroll-spy (`menu-browser`) mede `[data-store-top-bar]` e as abas no efeito, o observador da identidade (`store-identity`) mede só a barra (sem o elemento, os dois caem em 56 fixos, e 48 nas abas), e o `ItemHero` soma 56 ao `--safe-top` lido do `<html>`. Quem mudar a altura da barra ou das abas confere os três.
- O painel do item no desktop limita a altura a `--screen-height − --top-inset − 5rem` e rola por dentro; o CTA fica `sticky` no pé dele.

## 5. Raio

| Classe         | px  | Papel                                                                                                                                                                            |
| -------------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rounded-xs`   | 4   | tags e badges de texto (a `Tag` da loja também). A caixa de marcar do item (`option-row.tsx`) usa `rounded-[6px]`, fora da escala                                                |
| `rounded-sm`   | 8   | botões e inputs do painel, thumbnails do painel, toasts, banners do painel (na loja o `Banner` é `radius="md"`)                                                                  |
| `rounded-md`   | 12  | cards — a assinatura visual do iFood; na loja, campo `soft`, miniatura da Sacola (`size-14`), avisos (`Banner radius="md"`), CEP cotado e a moldura da prévia                    |
| `rounded-lg`   | 16  | bottom sheets, dialogs, cards de destaque; na loja, foto da linha (`size-24`), logo quadrado (`Avatar shape="square"`), painel do item no desktop e os blocos cinza do Finalizar |
| `rounded-xl`   | 24  | barra de busca, folha branca sobre a capa (`rounded-t-xl`), imagens grandes da landing                                                                                           |
| `rounded-full` | —   | chips, avatares, icon buttons, CTAs pill da landing e todo botão das telas do cliente                                                                                            |

Um papel, um raio. Nunca canto vivo em elemento interativo. Atenção: os nomes coincidem com os do Tailwind padrão, mas os valores não (o `rounded-xl` padrão é 12px; aqui é 24px). Veja a seção 9.

**Telas do cliente: pílula em todo botão (2026-09-24, decisão do dono).** Na
loja, no item, na sacola, no Finalizar e no Enviado, todo botão é
`rounded-full` (`Button pill`) — CTA, "Ver sacola", steppers, segmentado,
botões flutuantes —, e o selo "Obrigatório" também. Os botões verdes mantêm a
borda grafite (D22). O painel continua com o raio por papel. A folha branca
sobe sobre a capa com `-mt-6 rounded-t-xl` e perde o canto no `lg`
(`lg:rounded-none`).

## 6. Elevação

| Classe           | Onde                                                                                                                                                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| sem sombra       | listas, linhas, seções — o padrão                                                                                                                                                                                                                                                                   |
| `shadow-low`     | card em repouso, pílula branca do segmentado deslizante, logo quadrado da loja (`Avatar shape="square"`, com borda branca de 3px)                                                                                                                                                                   |
| `shadow-medium`  | hover de card, busca em foco, "+" sobre a foto, `Stepper floating`, `IconButton raised` (o "‹" sobre a capa, sobre a foto do item e no topo da Sacola, que no Enviado vira "×") e a pílula de ações sobre a capa. Na capa e na foto, o "‹" e a pílula perdem a sombra quando a barra compacta entra |
| `shadow-high`    | bottom sheet, toast, menu, hover do "+"                                                                                                                                                                                                                                                             |
| `shadow-highest` | dialog no desktop, drawer da sacola (440px), painel do item no desktop                                                                                                                                                                                                                              |
| `shadow-up`      | barra colada ao pé da tela: `StickyBottomBar tone="white"` (o `BottomBar` da `CartBar` e da Sacola) e o rodapé do Finalizar (2026-09-24)                                                                                                                                                            |

**`shadow-up` (2026-09-24).** `0 -4px 16px rgb(0 0 0 / 0.12)`: a sombra sobe. A
`high` projeta para baixo e some quando a barra encosta na borda inferior.

O iFood é chapado: a hierarquia vem de divisores finos e de blocos `gray-50`, não de sombra. Opacidade máxima de sombra: 0.2. Nada de brilho; blur de fundo só nos headers fixos do site e do painel, e a loja não tem nenhum. Gradiente, só dois: o `image-gradient` sob texto sobre foto e o degradê branco em que o CTA do item flutua (`StickyBottomBar tone="gradient"`, 2026-09-24), que desbota o conteúdo por baixo do botão.

## 7. Movimento

Os números de movimento são **inferidos** (convenções do Material 3 e do iOS, que os apps nativos do iFood seguem), não medidos.

- Easings: `ease-standard` (mudança no lugar), `ease-decelerate` (entradas), `ease-accelerate` (saídas).
- Durações (`duration-100` … `duration-300`): 100 toque, 150 hover e fade, 200 chips, tabs, toast e saída de sheet, 250 barra da sacola, 300 entrada de sheet e de página. Nada acima de 300ms no app, exceto o shimmer. Na landing, o `word-in` (500ms) e a deriva do papel de parede (75s) são ambiente, não resposta a toque.
- Animações prontas: `animate-fade-in/out`, `animate-slide-up`, `animate-sheet-in/out`, `animate-slide-in-right`/`animate-slide-out-right`, `animate-pop-in/out`, `animate-toast-in/out`, `animate-badge-pop`, `animate-shimmer`; só na landing, `animate-word-in` e `animate-wallpaper`.
- A Sacola entra e sai pela direita (`BottomSheet enterFrom="right"`, `animate-slide-in-right`/`-out-right`): tela cheia no celular, drawer de 440px no desktop. Os passos dentro dela trocam com `animate-fade-in`, sem deslizar.

Novas no fluxo do cliente (2026-09-24):

| Classe                | Tempo                     | Onde                                                                                                                                                                                |
| --------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `animate-check-in`    | 150ms, decelerate         | ponto do rádio e check do checkbox crescem de 80% (`option-row.tsx`)                                                                                                                |
| `animate-pill-reveal` | 200ms, standard           | o "+" de 32px vira a pílula "− n +" de 88px, revelada da direita para a esquerda por `clip-path` (56px = 88 − 32); `scaleX` achataria os filhos (`item-card.tsx`, `option-row.tsx`) |
| `animate-check-pop`   | 300ms, decelerate         | o check de "Pedido enviado!" passa de 1,1 e assenta (`done-step.tsx`)                                                                                                               |
| `animate-tick-in`     | 200ms, decelerate, `both` | tique entrando da esquerda; definida, ainda sem uso                                                                                                                                 |

**View Transitions (2026-09-24).** Cardápio → prato anima como a troca de tela
de um app. `StoreScreen` (`store/store-screen.tsx`, o `<ViewTransition>` do
React 19.2) envolve o conteúdo do `StoreMenu` e do `ItemDetail` — da página,
e não do layout, que sobrevive à troca de rota. O tipo da navegação escolhe a classe:

| Tipo          | Quem passa                                                                                                                                               | Tela que sai                                       | Tela que entra                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `nav-forward` | o `Link` da linha e o do "+" de prato com opções, no `ItemCard` (`transitionTypes`; na prévia não: a transição é da página inteira e vazaria da moldura) | `vt-push-out`: some em 120ms e recua 40px em 250ms | `vt-push-in`: vem de 60px à direita em 280ms e aparece em 180ms, a partir dos 100ms |
| `nav-back`    | `router.replace` do `useBackToMenu`, quando a pessoa chegou direto pelo link                                                                             | `vt-pop-out`: o espelho, para a direita            | `vt-pop-in`: da esquerda                                                            |
| nenhum        | `router.back()`, voltar do navegador, busca, `router.refresh()`                                                                                          | —                                                  | `default="none"`: troca seca                                                        |

As regras moram no `@layer base` do `globals.css`, e não no `@theme`: os
keyframes `vt-fade-in/out`, `vt-from-right/left` e `vt-to-left/right` animam
`opacity` e `translate` e não viram utilitário. Ficam dentro de
`@media (prefers-reduced-motion: no-preference)`; com reduced-motion,
`::view-transition-group/old/new(*)` vão a `0s` e a tela troca seca.
`::view-transition { pointer-events: none }` deixa o toque atravessar a camada
durante a troca. As duas telas quase não se sobrepõem (a velha some em 120ms,
a nova só começa aos 100ms) porque, sobrepostos, os textos se misturam. Onde o
navegador tem View Transitions, o `animate-fade-in` do prato sai
(`supports-[view-transition-name:none]:animate-none`) para não animar duas vezes.

Receitas e o catálogo completo estão em `motion.md`.

## 8. Como o Tailwind v4 lê o tema e os utilitários próprios

Verificado no Tailwind 4.3.3 instalado:

- Cada namespace gera utilitários: `--color-x` → `bg-x`/`text-x`/`border-x`; `--text-x` (+ `--text-x--line-height`) → `text-x`; `--radius-x` → `rounded-x`; `--shadow-x` → `shadow-x`; `--ease-x` → `ease-x`; `--animate-x` → `animate-x` (os `@keyframes` ficam dentro do `@theme`); `--container-x` → `max-w-x`.
- **Não existe namespace `--duration-*`**: use `duration-150`, `duration-200`.
- `--namespace-*: initial` apaga os valores padrão daquele namespace. É o que impede `bg-orange-500` ou `shadow-md` de funcionar. `--color-white` e `--color-black` são cores de tema e precisam ser redeclaradas.
- `@theme static` emite todas as variáveis mesmo sem uso em classes, para `var(--color-primary)` funcionar em CSS próprio e em `style={{}}`.
- `@theme inline` faz a classe usar o valor direto em vez de `var(--x)`. É necessário em `--font-sans`, porque a variável do `next/font` vive no `<html>`.
- Token novo vai **dentro** do `@theme static`: uma `--shadow-up` declarada no `:root` não geraria `shadow-up`. Keyframe que não vira utilitário (os `vt-*` das View Transitions) fica fora dele.
- `@utility` cria utilitários próprios que aceitam variantes (`lg:pb-4` vence `pb-safe-4`) e seletor aninhado (`&::before` no `hit-44`, `&:focus-visible` no `focus-ring-photo`).
- `top-(--top-inset)` e `h-(--screen-height)` são o atalho do v4 para `var()` em valor arbitrário; `[--safe-top:0px]` redeclara uma variável só naquela subárvore (a moldura da prévia).
- Variantes úteis que já existem: `motion-reduce:`, `motion-safe:`, `open:`, `backdrop:`, `supports-[…]:`, `line-clamp-2`, `size-10`, `h-dvh`.

### Utilitários próprios

| Utilitário                      | O quê                                                                             | Para quê                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `press`                         | toque encolhe a 0,98; transição de cor, borda e sombra                            | todo alvo tocável                                                                                                                                |
| `skeleton`                      | brilho do shimmer sobre `gray-100`                                                | placeholder de carregamento                                                                                                                      |
| `scrollbar-none`                | esconde a barra de rolagem                                                        | abas, carrosséis                                                                                                                                 |
| `pt-safe`                       | `padding-top: var(--safe-top)`                                                    | barras do topo: `StoreHeader`, barra compacta do item, topo da Sacola, barra do "‹" do prato que não abre (`item-missing`), header do site, auth |
| `pb-safe`                       | `padding-bottom: var(--safe-bottom)`                                              | definido, sem uso hoje: as barras de baixo usam `pb-safe-4`                                                                                      |
| `pb-safe-4`                     | `padding-bottom: calc(1rem + var(--safe-bottom))`                                 | barras inferiores e rodapés de sheet                                                                                                             |
| `top-safe-4`                    | `top: calc(1rem + var(--safe-top))`                                               | botão flutuante no canto. Hoje sem uso: o "‹" do item usa `top-[calc(var(--safe-top)+0.375rem)]` para alinhar com a barra compacta               |
| `hit-44`                        | `::before` com `inset: -6px`: alvo de 44px num desenho de 32                      | `IconButton hit`, `Stepper sm` soft/floating, "+" da linha, `option-row`                                                                         |
| `hit-y-44`                      | o mesmo só na vertical (`inset: -2px 0`)                                          | opções do `SegmentedControl indicator="sliding"`, largas e lado a lado                                                                           |
| `focus-ring-photo`              | contorno grafite de 2px, halo branco de 5px e `shadow-medium` no `:focus-visible` | o "‹" sobre a capa (`StoreHeader`) e o "‹" sobre a foto do item (`ItemHero`), onde o contorno verde some                                         |
| `cover-fallback`                | `chat-bg` + o rabisco de `public/landing/doodle.svg`, parado                      | capa da loja sem foto (`StoreCover`)                                                                                                             |
| `image-gradient`                | degradê preto 60% → transparente                                                  | obrigatório sob texto sobre foto. Hoje sem uso: na loja não há texto solto sobre foto (o selo "Indisponível" tem fundo próprio)                  |
| `dot-grid`                      | malha de pontos `gray-300`                                                        | fundo técnico. Hoje sem uso                                                                                                                      |
| `wallpaper` · `wallpaper-light` | papel de parede com deriva de 75s                                                 | seções não brancas da landing (só no `globals.css`)                                                                                              |

`pt-safe`, `pb-safe`, `pb-safe-4` e `top-safe-4` leem as variáveis do `:root`
desde 2026-09-24, e não `env()` direto, para a moldura da prévia poder zerá-las.

## 9. Bloco LEGADO e o codemod da fase 1

Mais de mil ocorrências de tokens e classes antigas em 52 arquivos não migram numa edição só. O final do `theme.css` traz um bloco `LEGADO` que mantém o app buildando enquanto os arquivos migram um a um:

- `ink-*`, `flame-*` e `whatsapp-*` apontam para cinzas e verdes novos;
- `rounded-card`, `rounded-btn`, `shadow-soft/lift/glow` e `ease-out-soft` apontam para os equivalentes novos (`font-display` deixou de ser legado: é a Figtree, D19);
- `.btn*`, `.surface*`, `.field-input*` e `.container-page` continuam existindo, já com cara de iFood; `.glow-hero`, `.grid-pattern` e `.text-gradient` viram no-op;
- `--tenant-brand*` e `--header-height` ficam em `:root` até a fase 3.

Resultado: depois da fase 1 o app inteiro já aparece verde, cinza e em Inter, e as fases seguintes só removem usos. A auditoria reprova enquanto o bloco existir — essa é a condição de saída da fase 7.

**O codemod.** O tema novo reaproveita nomes da escala padrão do Tailwind com outros valores. Sem tradução, 51 `rounded-xl` passariam de 12px para 24px e 15 `rounded-lg` de 8px para 16px. Logo depois de colar o `theme.css`, rode uma única vez:

```bash
node .claude/skills/ifood-design/scripts/codemod-scale.mjs --dry-run
node .claude/skills/ifood-design/scripts/codemod-scale.mjs
```

| Tailwind padrão                     | Pomodoro          |     | Tailwind padrão         | Pomodoro                       |
| ----------------------------------- | ----------------- | --- | ----------------------- | ------------------------------ |
| `rounded-md` (6) · `rounded-lg` (8) | `rounded-sm` (8)  |     | `text-xs` · `text-sm`   | `text-caption` · `text-body2`  |
| `rounded-xl` (12)                   | `rounded-md` (12) |     | `text-base` · `text-lg` | `text-body1` · `text-subtitle` |
| `rounded-2xl` (16)                  | `rounded-lg` (16) |     | `text-xl` · `text-2xl`  | `text-h6` · `text-h5`          |
| `rounded-3xl` (24)                  | `rounded-xl` (24) |     | `text-3xl … text-7xl`   | `text-h4 … text-display`       |

Não rode duas vezes: a segunda passada retraduziria `rounded-md` para `rounded-sm`. Raios arbitrários (`rounded-[2rem]`) ficam para a migração manual; a auditoria aponta.

## 10. Armadilhas

- Classe fora da escala não dá erro de build: simplesmente não gera CSS. `rounded-2xl`, `shadow-md`, `text-sm` e `bg-red-500` somem em silêncio depois que o bloco LEGADO sai. Rode a auditoria com `--strict`.
- Strings de classe precisam ser literais completas. `text-${tone}` nunca é gerado; use um mapa `Record<Tone, string>`. O `cn()` de `src/lib/cn.ts` basta; não instale `clsx` nem `tailwind-merge`.
- `pb-safe` e `pt-safe` valem zero sem `viewportFit: 'cover'` no `viewport` de `src/app/layout.tsx`.
- Em classe nova, a área segura é `var(--safe-top)` / `var(--safe-bottom)` (ou os utilitários), nunca `env()` direto: a prévia do painel herdaria o notch do aparelho.
- Quem redeclara `--safe-top` numa subárvore redeclara `--top-inset` junto (seção 4).
- `hit-44` e `hit-y-44` não definem `position`: o elemento precisa ser `relative` ou `absolute`. Sem `tailwind-merge`, uma segunda classe de position brigaria pela ordem do CSS.
- Entradas animadas não usam `fill-mode: both`: o transform final ficaria preso e impediria arrastar o sheet. Saídas usam `forwards`.
- Não leia o relógio, o `localStorage`, o `sessionStorage` nem o `history.state` no primeiro render: as páginas da loja são ISR e o HTML é compartilhado. As camadas da sacola e o último pedido usam `useSyncExternalStore` com snapshot de servidor vazio.
