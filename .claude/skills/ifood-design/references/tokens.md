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

| Utilitário | Papel |
|---|---|
| `primary` | CTA, tab ativa, badge de contagem, link curto, ícone ativo |
| `primary-hover` · `primary-pressed` · `primary-active` | estados do vermelho |
| `primary-tint` | fundo sutil, item ativo da sidebar do painel, seleção de texto |
| `pink-100` · `pink-200` · `pink-300` | promoções, cupons, banner de entrega grátis |
| `star` | avaliação. Nunca vermelho |
| `positive` | "Grátis", "Aberto", preço promocional |
| `success` / `success-bg` | toast e banner de sucesso |
| `warning` / `warning-bg` | loja fechada, pedido mínimo, revisão da sacola |
| `error` / `error-bg` | erro de campo e de envio |
| `info` / `info-bg` | avisos neutros (modo demonstração, prévia) |
| `gray-50 … gray-900` | escala neutra fria. Não existe `gray-500` |
| `white` · `black` · `scrim` | redeclarados porque o reset apaga a paleta padrão |

**Hierarquia de texto pela escala de cinza**, sem apelidos semânticos:

- Títulos, nomes de item e preços: `text-gray-700`. O iFood nunca usa preto puro; é isso que dá o ar "macio".
- Corpo, descrições e metadados: `text-gray-600`.
- Placeholder, desabilitado e ícone inativo: `text-gray-400`.
- Página `bg-white`; seções alternadas e fundo do painel `bg-gray-50`.
- Divisor entre linhas `border-gray-200`; borda de input e chip `border-gray-300`; toast `bg-gray-800`.

Por que não criar `--color-body` ou `--color-heading`: no Tailwind, cor de texto e tamanho de texto dividem o prefixo `text-`. `text-body` (cor) ao lado de `text-body1` (tamanho) é um convite a erro. A escala numérica evita a colisão.

Regras que mantêm a cara do iFood:

- Vermelho é escasso. Se tudo é vermelho, nada é CTA. Reserve para a ação principal da tela, o estado ativo e badges.
- Vermelho não serve para texto longo: o contraste cai em corpo de texto. Só links curtos e rótulos.
- Verde, amarelo e vermelho têm significado fixo (aberto/grátis, estrela, erro). Não decore com eles.
- Texto sobre foto só com `image-gradient` por baixo.

## 3. Tipografia

O iFood usa a "Tipo iFood" (2023, Fabio Haag Type com a FutureBrand), proprietária. Ela não pode ser embarcada. A pilha oficial do iFood cai em Inter e depois em fontes de sistema, então **Inter é o fallback correto**, não uma aproximação. Não procure "sósias" da Tipo iFood: fonte parecida-mas-errada chama mais atenção do que a Inter.

- Uma família só: `font-sans` (Inter via `next/font`). Não existe fonte display; Fraunces sai.
- Pesos: 400, 500, 600 e 700. O 800 só aparece no título do hero da landing.
- `tracking-tight` apenas de `text-h3` para cima.

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
