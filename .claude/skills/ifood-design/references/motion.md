# Movimento — micro-interações

As curvas e as durações de base (100/150/200/300ms) são **inferidas** das convenções do Material 3 e do iOS, que os apps nativos de delivery seguem (ver `sources.md`). Desde 2026-09-24 as telas do cliente (loja, item, sacola, finalizar, enviado) seguem a experiência de app de delivery (referência: app da Glovo), e este arquivo descreve o movimento **implementado** em `src/`. Quando este arquivo e o código divergirem, vale o código. Use como checklist da fase 5: passe item por item do catálogo e confira cada um na tela, com e sem movimento reduzido.

## 1. Princípios

- Movimento explica, não enfeita: mostra de onde veio um painel, o que mudou na sacola, qual aba está ativa. Se tirar a animação não confunde ninguém, ela não precisava existir.
- Rápido. Na loja e no painel nada passa de 300ms; a troca de tela mais longa (View Transition) fecha em 280ms. Exceções: o shimmer e o que é da landing (papel de parede, `word-in`, `motion`, D15). Entradas desaceleram, saídas aceleram, mudanças no lugar usam a curva padrão.
- Sem mola, sem shake, sem parallax. As únicas "brincadeiras" são os pops que passam um pouco do tamanho e assentam: o contador da sacola e o check do grupo escolhido (`badge-pop`), e o check do "Pedido enviado!" (`check-pop`).
- Propriedades animáveis: `transform` (e `translate`), `opacity`, `background-color` e as outras cores (texto, borda), `box-shadow` e `clip-path`. Exceções conhecidas, todas sem layout shift: o traço das abas anima `width` num elemento `absolute`; a linha removida da sacola recolhe com `grid-template-rows`; o papel de parede da landing move `background-position`. Nunca `height`, `top` ou `margin`. Fora da loja ficaram três desvios: o header do site anima `height` (§7), a barra de progresso do `SetupWidget` anima `width` (300ms) e os pontos do `auth-aside` usam `transition-all` (300ms).
- O que já estava na sacola não anima quando a página carrega: quem recarrega com a sacola cheia vê a barra, os badges e as pílulas parados (§3, "Sem entrada na hidratação", 2026-09-24).
- Toda animação respeita `prefers-reduced-motion`: o CSS pela regra global, o JavaScript por `src/lib/reduced-motion.ts` (§6).

## 2. Tokens e keyframes

Curvas, animações e keyframes ficam no `@theme` de `src/app/globals.css`; as regras das View Transitions ficam no `@layer base` do mesmo arquivo. Não existe namespace `--duration-*`: use `duration-150`, `duration-200`.

| O quê | Valor |
|---|---|
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)`: mudança no lugar (abas, segmented, toque, barra compacta) |
| `ease-decelerate` | `cubic-bezier(0.05, 0.7, 0.1, 1)`: entradas (sheet, barra da sacola, toast, checks) |
| `ease-accelerate` | `cubic-bezier(0.3, 0, 0.8, 0.15)`: saídas |
| `duration-100` | escala do toque (`press`) |
| `duration-150` | hover, cor, fade, barra compacta, rádio e checkbox |
| `duration-200` | traço das abas, pílula do segmented, toast, saída de sheet e de barra, fade da foto, colapso da linha da sacola |
| 250ms | `animate-slide-up` (`CartBar`) |
| 300ms | `animate-sheet-in`, `animate-slide-in-right`, `animate-check-pop` |
| 120 / 180 / 250 / 280ms | View Transitions (§4) |
| 1.4s linear infinito | `animate-shimmer` |

Entradas não usam `fill-mode: both` (quando a animação acaba, o `transform` inline volta a valer, e é isso que deixa arrastar o sheet); saídas usam `forwards` para o elemento continuar escondido até desmontar. `tick-in`, `word-in` e as View Transitions usam `both` porque podem ter atraso.

| Utilitário | Keyframe · tempo · curva | O que faz | Onde |
|---|---|---|---|
| `animate-fade-in` | 150 · standard | opacidade 0 → 1 | passo da sacola (`key={step}`), número do `Stepper`, resultados da busca, `EmptyState`, aviso "Fechado agora" do prato, `Banner` de aviso do Finalizar, scrim do sheet, `article` do prato sem View Transitions |
| `animate-fade-out` | 200 · accelerate · `forwards` | opacidade → 0 | scrim do sheet saindo |
| `animate-slide-up` | 250 · decelerate | sobe de 100% | `CartBar` entrando |
| `animate-sheet-in` / `-out` | `slide-up` 300 · decelerate / `slide-down` 200 · accelerate · `forwards` | sheet de baixo; a saída parte de `--drag-y` | `BottomSheet` ("Sobre a loja", "Limpar sacola?", Compartilhar); o `sheet-out` também é a descida da `CartBar` |
| `animate-slide-in-right` / `-out-right` | 300 · decelerate / 200 · accelerate · `forwards` | página que entra e sai pela direita | Sacola: tela cheia no celular e drawer de 440px no `lg` |
| `animate-pop-in` / `-out` | 200 · decelerate / 150 · accelerate · `forwards` | escala 0.96 + fade | `BottomSheet desktop="dialog"` no `lg` (entra e sai); só a entrada no `Menu` e no `ImageUpload` do painel |
| `animate-toast-in` / `-out` | 200 · decelerate / 200 · accelerate · `forwards` | 16px + fade | `Toast` |
| `animate-badge-pop` | 250 · decelerate | escala 0.6 → 1.15 → 1 | `CountBadge` (sacola na pílula do topo e "+" do cardápio) e `CircleCheck` do grupo escolhido |
| `animate-check-in` (2026-09-24) | 150 · decelerate | opacidade 0 e escala 0.8 → 1 | ponto branco do `RadioRow` e check do `CheckboxRow` (`option-row.tsx`) |
| `animate-pill-reveal` (2026-09-24) | 200 · standard | `clip-path: inset(0 0 0 56px round 9999px)` → `inset(0 round 9999px)`: a pílula de 88px, já no tamanho final, aparece da direita para a esquerda a partir do círculo de 32 (88 − 32 = 56) | `QuickPill` do `ItemCard` (`Stepper sm floating` sobre a foto) e `StepperRow` dos adicionais do prato (`Stepper sm soft`) |
| `animate-check-pop` (2026-09-24) | 300 · decelerate | escala 0.5 → 1.1 → 1 com fade | círculo do check em "Pedido enviado!" (`done-step.tsx`) |
| `animate-tick-in` (2026-09-24) | 200 · decelerate · `both` | 4px da esquerda + fade | **sem uso hoje**: ficou reservado para os tiques (✓✓ em `text-tick`) do Enviado, que não entraram |
| `animate-shimmer` | 1.4s · linear · infinito | brilho do `skeleton` | status da loja antes de hidratar; `StoreSkeleton`/`ItemSkeleton` do modo demo |

## 3. Receitas

**Toque.** Todo elemento clicável leva a utility `press`: encolhe para 0.98 em `:active` (100ms na ida e na volta) e transiciona fundo, borda, cor e sombra em 150ms. O escurecimento vem das classes `active:` de cada um (`active:bg-primary-pressed` no CTA, `active:bg-gray-50` nas linhas, `active:bg-black/5` nos botões das pílulas do `Stepper`). Ela substitui o ripple do Android e o highlight do iOS, que `-webkit-tap-highlight-color: transparent` desliga. O `Button` desabilitado (inclusive com `aria-disabled`) não leva `press`: fica estático. Nos `<button>` da loja o `cursor-pointer` é explícito (o preflight do Tailwind v4 não põe).

```tsx
<button className="press rounded-full bg-primary active:bg-primary-pressed …">
```

Na linha da sacola, `has-[a:active]:bg-gray-50` pinta a linha só quando o link é pressionado, não quando o toque é no `Stepper` por cima dele.

**Entrada e saída com desmontagem adiada.** Um componente que some precisa continuar montado até a animação de saída terminar. O padrão está em `src/components/ui/bottom-sheet.tsx` e se repete na `CartBar` (`src/components/store/cart-bar.tsx`): `rendered` acompanha `open` na entrada (ajuste de estado durante o render, sem efeito) e só cai num `setTimeout` de 200ms (0 com movimento reduzido) depois que `open` vira falso.

```tsx
const [rendered, setRendered] = useState(open);
const [previousOpen, setPreviousOpen] = useState(open);
if (open !== previousOpen) {
  setPreviousOpen(open);
  if (open) setRendered(true);
}
const closing = rendered && !open; // troca a classe de entrada pela de saída
```

**Sem entrada na hidratação (2026-09-24).** A sacola vem do `localStorage` só depois da hidratação. Sem cuidado, quem recarrega com a sacola cheia veria a barra subir, os badges pularem e as pílulas se revelarem sem ter feito nada. O `StoreProvider` resolve assim:

- `hydrated = snapshot !== store.getServerSnapshot()`: a sacola já foi lida;
- `settled` vira `true` um quadro depois (`requestAnimationFrame`) e desce pelo `SettledContext`. O quadro de atraso existe porque o que aparece por causa da sacola monta no mesmo commit em que `hydrated` vira `true`;
- `useMountAnimation()` congela `settled` na montagem (`useState(settled)`): quem montou na carga não anima nem depois; quem monta por um gesto, anima.

```tsx
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <Pop key={count} count={count} />; // a key remonta a cada mudança
}
function Pop({ count }: { count: number }) {
  const animate = useMountAnimation();
  return <span className={cn('…', animate && 'animate-badge-pop')}>{count}</span>;
}
```

Usam o hook: `CountBadge`, a barra da `CartBar` e a `QuickPill` do `ItemCard`. Componente novo que aparece por causa da sacola deve usar o mesmo hook. O `badge` embutido do `IconButton` não usa o hook (hoje ninguém passa `badge`; a loja usa `CountBadge`). Limites conhecidos: o prato não usa o hook. Ao abrir uma edição (`?editar=<uid>`) as escolhas chegam depois da hidratação, e o ponto do rádio, a pílula dos adicionais e o check do grupo animam uma vez na abertura. E o número do `Stepper` (`key={value}` + `animate-fade-in`) também não usa o hook: na carga com a sacola cheia a `QuickPill` aparece parada, mas o número dela faz o fade de 150ms uma vez.

**Número que troca.** Uma `key` com o valor refaz a animação sem estado extra: `<span key={value} className="inline-block animate-fade-in">{value}</span>` no `Stepper`. O total da `BottomBar` e o rótulo "Adicionar 2 por R$ 59,80" trocam secos, com `tabular-nums` para não pular de largura.

**Imagem que chega (`FadeImage`, 2026-09-24).** `src/components/store/fade-image.tsx`. Sem `priority`, a foto nasce `opacity-0` e vai a `opacity-100` em `transition-opacity duration-200 ease-standard` no `onLoad`. Um callback ref confere `complete && naturalWidth > 0` na montagem, porque a imagem que já estava no cache carrega antes da hidratação e o `onLoad` não dispara de novo. Com `priority` (capa, foto do prato, os dois primeiros itens da primeira categoria) nasce visível, sem fade, porque o LCP não pode esperar a hidratação. O `DishImage` só liga o fade com `fade` (a lista do cardápio); a miniatura da sacola e o painel aparecem como sempre. Até a foto chegar, o fundo do contêiner segura o lugar (`bg-gray-100`; a foto do prato fica sobre `bg-white`, `surface="white"`; a capa sem foto é o `cover-fallback`, parado). Imagem não tem shimmer. A proporção é fixa (`size-24` na linha, `aspect-4/3` e `lg:aspect-[16/10]` no prato, `h-60 lg:h-80` na capa), sem layout shift.

**Traço das abas.** `src/components/ui/tabs.tsx`: um `<li>` absoluto cujo `transform` e `width` são escritos direto no DOM num `useLayoutEffect`, com `transition-[transform,width] duration-200 ease-standard`. Não há estado, o que evita re-render da lista e evita `setState` dentro de efeito (o lint do React Compiler reprova). O traço nasce `opacity-0` e só aparece depois de medido. A aba ativa rola para o centro da lista (`list.scrollTo`, `behavior: scrollBehavior()`). Um `ResizeObserver` reposiciona o traço sem rolar. Tons: `ink` (loja, 2026-09-24) é o traço de 3px `rounded-full bg-gray-900` com rótulo grafite; `primary` (painel) é o traço de 2px verde.

**Pílula deslizante do `SegmentedControl` (2026-09-24).** Com `indicator="sliding"`, uma pílula branca única (`absolute inset-y-1 left-1`, `shadow-low`) tem largura `calc((100% - 0.5rem) / var(--segments))` e anda com `translate-x-[calc(var(--segment)*100%)]` em `transition-transform duration-200 ease-standard`. É só CSS: o índice vai numa variável inline, sem medir no JavaScript. O rótulo troca de cor em 150ms. A opção desligada (hint "Indisponível") não leva `press`. O padrão `fill` (painel) continua sem deslize.

**Barra compacta (2026-09-24).** O `StoreHeader` é `fixed` e tem a mesma altura (56px + notch) nos dois estados. Nada acima do conteúdo muda de tamanho ao rolar, então o scroll anchoring do Chrome não tem o que corrigir. Uma sentinela de 1px no fim do `StoreIdentity` e um `IntersectionObserver` (`rootMargin` = altura medida da barra; `root` = a moldura, na prévia) ligam `compactHeader` só quando a sentinela passou POR CIMA. `setCompactHeader` só é chamado no callback do observer (e com `false` no cleanup), nunca no render. Com a barra compacta ligada, tudo em `duration-150 ease-standard`:

- a camada branca atrás dos botões vai de `-translate-y-1 opacity-0` a `translate-y-0 opacity-100`;
- o nome da loja vai de `translate-y-1 opacity-0` ao lugar (e é `aria-hidden` enquanto invisível);
- a pílula de ações perde o fundo branco e a sombra (`transition-[background-color,box-shadow]`);
- o "‹" passa de `raised` a `plain` **seco**: ele leva `transition-opacity duration-150` (para aparecer depois da hidratação), e essa classe vem depois da `press` no CSS e troca a lista de propriedades dela (§7). No prato, sem essa classe, a `press` do "‹" transiciona fundo e sombra em 150ms.

O `ItemHero` repete o desenho na página do prato: a sentinela fica no fim da foto, e a barra com o nome fica `aria-hidden`, `inert` e `pointer-events-none` enquanto invisível (só abaixo do `lg`). O "‹" da loja só aparece depois de hidratar e quando há histórico (`opacity`, 150ms).

**"+" que vira pílula (2026-09-24).** O "+" é um círculo branco de 32px com sombra sobre o canto da foto. Ele vive num contêiner `absolute`, irmão do link da linha, e a `QuickPill` (`Stepper sm floating`, 88px) toma o lugar dele com `animate-pill-reveal` e `origin-right`: cresce para a esquerda por cima da foto, e nada da linha se move. É `clip-path` e não `scaleX`, porque a escala achataria o "−" e o número. Quando a quantidade volta a zero, a pílula desmonta e o "+" reaparece seco. Os adicionais do prato (`StepperRow`) fazem o mesmo com o `Stepper sm soft`. O "+" da lista não faz toast nem vibra: a pílula, o badge e a barra já são o feedback.

**Linha removida da sacola.** A remoção no store é imediata, então adie-a: marque a linha como `removing`, aplique `grid-rows-[0fr] opacity-0` num wrapper `grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-200 ease-accelerate` (o filho tem `min-h-0 overflow-hidden`) e só então chame `setQuantity(uid, 0)`, após 200ms (0ms com movimento reduzido). O `Stepper` fica desabilitado enquanto isso (`cart-line.tsx`).

**Rodapé do Finalizar com o teclado (2026-09-24).** Abaixo do `lg`, com um campo em foco (`:has(input:focus, select:focus, textarea:focus)`), o resumo (`dl[data-summary]`: subtotal, taxa e total) some seco, com `hidden` e sem animação, e sobram o aviso (`Banner`, quando há), o CTA e a legenda abaixo dele. Só some o que fica ACIMA do botão: ao tocar no CTA o campo perde o foco e o resumo volta. Se algo voltasse abaixo do botão, ele subiria entre o `mousedown` e o `mouseup` e o clique cairia fora.

**Toast com ação (2026-09-24).** `toast({ message, action })`: com ação ele fica 5s (sem ação, 3s), o tempo de alcançar o botão (WCAG 2.2.1). Tocar na ação executa e fecha. Entra com `toast-in` (16px + fade, 200ms), sai com `toast-out` (200ms) e só então desmonta; o novo substitui o atual (a `key` é o id). Fica acima da barra de baixo (`bottom: --bottom-bar-height + 0.5rem + --safe-bottom`, `z-80`). Hoje só "Adicionado à sacola · Ver sacola" usa ação. Na prévia do painel o `ToastProvider` mora dentro da moldura (`EmbeddedShell`, `transform-gpu`), então o `fixed` do toast fica preso a ela e o toast sobrevive à troca prato → cardápio (a casca está no layout). Limite: `<dialog>` modal cobre o toast, e dentro de sheets o feedback é inline ("Copiar" → "Copiado!").

**Vibração (2026-09-24).** `tapHaptic()` em `src/lib/haptics.ts` chama `navigator.vibrate(10)`. É a única vibração do app, só no "Adicionar" da página do prato. Não vibra com movimento reduzido nem sem a API: o iOS ignora, e o Chrome Android exige ativação do usuário, que o clique já dá.

**Acordeão (painel).** `<details className="group">` com o `ChevronDown` em `transition-transform duration-150 ease-standard group-open:rotate-180`; o conteúdo abre seco (`item-form.tsx`). O FAQ (`/perguntas-frequentes`) é lista corrida, não acordeão.

## 4. View Transitions: troca de tela da loja (2026-09-24)

Entraram na fase 9 do refactor "de app". Usam o `<ViewTransition>` do React 19.2 com o `transitionTypes` do Next 16, sem flag em `next.config.ts`.

- **`StoreScreen`** (`src/components/store/store-screen.tsx`) envolve o conteúdo de cada PÁGINA (`StoreMenu` e `ItemDetail`), não o layout. O layout sobrevive à troca de rota, e nele entrada e saída nunca aconteceriam.
- Dentro dele vai **um nó só** (um `<div>` em volta de tudo): o `<ViewTransition>` dá um nome a cada filho do DOM, e com vários cada um animaria por conta própria. Assim a tela desliza como uma peça.
- `enter` e `exit` são mapas por tipo, com `default="none"`. Sem isso, a busca (`useDeferredValue`) e o `router.refresh()`, que também são transições, animariam a tela.

| Tipo | Quem manda | Sai (`exit`) | Entra (`enter`) |
|---|---|---|---|
| `nav-forward` (`NAV_FORWARD`) | os dois `Link` do `ItemCard`: a linha e o "+" de item com opções | `vt-push-out`: o cardápio some em 120ms (accelerate) e recua 40px para a esquerda em 250ms (standard) | `vt-push-in`: o prato chega de 60px à direita em 280ms (decelerate) e aparece em 180ms (decelerate), a partir dos 100ms |
| `nav-back` (`NAV_BACK`) | `useBackToMenu` (o "‹" e o "Adicionar" do prato, e o "‹" do `StoreMessage` de prato que não existe mais), no `router.replace(basePath, { transitionTypes: ['nav-back'] })`: só quando a entrada não tem origem registrada (`mqFrom`), ou seja, a pessoa chegou direto pelo link | `vt-pop-out`: o espelho; o prato some e vai 40px para a direita | `vt-pop-in`: o cardápio chega de 60px à esquerda |
| sem tipo | `router.back()`, voltar do navegador e gesto do sistema, o link da linha da sacola (tocar na linha abre o prato em `?editar=<uid>`), o `openCartAfterNav` do "Atualizar" (`router.replace` sem tipo), busca, `router.refresh()` | nada | nada |

- A tela velha some em 120ms e a nova só começa a aparecer aos 100ms: as duas quase não se sobrepõem, porque sobrepostos os textos se misturam. O deslocamento é curto (40/60px) em vez da tela inteira: é a troca de tela de um app sem arrastar o olho. Os keyframes `vt-*` animam a propriedade `translate`, não `transform`.
- O resto da página (as barras fixas da casca, fora do `StoreScreen`) faz o fade padrão do navegador.
- `::view-transition { pointer-events: none; }`: durante a troca os toques atravessam a camada da transição.
- **`router.back()` não anima, de propósito.** O Next roda o voltar num `popstate`, fora do nosso alcance: `router.back()` não aceita `transitionTypes` (só `push` e `replace` aceitam), e o voltar do sistema não leva tipo. Com `default="none"` a tela troca seca, como o voltar do navegador, e no iOS o gesto de voltar já traz a animação dele. Na prática, o "‹" do prato só desliza quando a pessoa chegou direto pelo link (`replace`). Vindo do cardápio ou da sacola ele usa `router.back()`, que devolve a loja na mesma rolagem (e a sacola aberta, se foi de lá) sem empilhar entrada, e a troca é seca.
- **Prévia do painel**: o `ItemCard` não passa tipo quando há `ScrollRootContext` (a moldura rolável). A transição é da página inteira e vazaria da moldura. Limite: o `useBackToMenu` não confere a moldura. Quem abre um prato da prévia direto pelo endereço (sem `mqFrom`) e toca no "‹" ou no "Adicionar" leva o `nav-back`, e a troca vaza da moldura.
- **Navegador sem suporte**: o `article` do prato entra com `animate-fade-in`, desligado onde há suporte (`supports-[view-transition-name:none]:animate-none`), porque os dois juntos animariam duas vezes. É fade e não deslize: o `article` contém elementos `fixed` (o "‹" e a barra com o nome), e `transform` num ancestral os prenderia a ele.
- **Rolagem**: com `<html data-scroll-behavior="smooth">`, o Next desliga o `scroll-behavior: smooth` do `:root` durante a troca de rota, e abrir um prato vai ao topo na hora, como num app. A volta ao cardápio restaura a rolagem guardada na entrada do histórico (`mqScrollY`, gravada no clique) num `useLayoutEffect`, com `behavior: 'instant'`, antes da pintura.
- **Movimento reduzido**: as regras `vt-*` só existem em `@media (prefers-reduced-motion: no-preference)`, e a regra global zera duração e atraso de `::view-transition-group/old/new(*)`. A tela troca seca.

## 5. Catálogo

| # | Interação | Especificação |
|---|---|---|
| 1 | Pressionar botão ou linha | `press`: escala 0.98 em 100ms (ida e volta); fundo (`primary-pressed`, `gray-50`, `black/5` nas pílulas) e sombra em 150ms |
| 2 | Hover no desktop | linha do cardápio e linhas de opção `lg:hover:bg-gray-50`; "+" sobre a foto `hover:shadow-high`; CTA `hover:bg-primary-hover`; 150ms |
| 3 | Foco por teclado | contorno 2px `primary`, offset 2px, sem animação; sobre foto e capa, `focus-ring-photo` (contorno grafite + halo branco) |
| 4 | "+" do cardápio (item sem escolha obrigatória) | vira a pílula "− n +" com `animate-pill-reveal` (200ms), crescendo para a esquerda sobre a foto; o badge da sacola pula; na primeira unidade a `CartBar` sobe. Sem toast e sem vibração |
| 5 | "+" de item com opções | é link para o prato (`nav-forward`); com unidades na sacola, o `CountBadge` dele pula a cada mudança |
| 6 | Stepper | número troca com fade de 150ms; no mínimo o "−" fica cinza desabilitado (prato) ou vira lixeira (sacola e pílula do cardápio); remover da sacola recolhe a linha em 200ms |
| 7 | Abas de categoria | traço grafite de 3px desliza em 200ms (`transform` + `width`); a aba ativa rola para o centro; tocar numa aba rola até a seção (`scrollBehavior()`) e trava o scroll-spy por 700ms (0 com movimento reduzido) |
| 8 | Rolar até a capa sair | capa e folha branca (`-mt-6 rounded-t-xl`) ficam paradas, sem parallax nem escala; a barra compacta entra (opacidade + 4px, 150ms), a pílula de ações perde fundo e sombra (150ms) e o "‹" troca de `raised` para `plain` seco (§3); as abas grudam no mesmo instante |
| 9 | Modo busca | a lupa monta o campo e foca no mesmo toque (`flushSync` + `focus()`; sem isso o iOS não abre o teclado); a barra branca entra como a compacta; com foco, o fundo do campo passa de `gray-100` a branco em 150ms e a sombra entra seca (`transition-colors` não inclui `box-shadow`); Enter fecha o teclado e Esc cancela; capa e identidade saem com `hidden`; a lista vai ao topo sem animação e a tela de resultados entra com fade de 150ms (trocar o termo não refaz o fade); o filtro usa `useDeferredValue` (não é debounce) e o leitor de tela ouve a contagem 500ms depois da última tecla; fechar devolve a rolagem de antes |
| 10 | Entrega ↔ Retirada | pílula branca desliza em 200ms sob o rótulo (`SegmentedControl indicator="sliding"`); o rótulo troca de cor em 150ms |
| 11 | Bottom sheet ("Sobre a loja", "Limpar sacola?", Compartilhar) | scrim entra em 150ms e sai em 200ms; o painel sobe em 300ms desacelerando e sai em 200ms acelerando; arrastar a alça mais de 30% fecha, com a saída partindo de onde o dedo soltou (`--drag-y`); no `lg` vira dialog com `pop-in` 200ms / `pop-out` 150ms; foco preso e devolvido |
| 12 | Sacola abre | celular: página inteira pela direita em 300ms (`slide-in-right`); `lg`: drawer de 440px pela direita, com a mesma animação, e scrim de 150ms. A `CartBar` fica `invisible` + `inert` no mesmo render, mas continua montada |
| 13 | Sacola fecha ("‹", scrim, Esc, voltar do sistema) | sai pela direita em 200ms e desmonta depois; Esc, scrim e o fechamento nativo voltam UM passo (camadas no histórico); o foco volta ao gatilho |
| 14 | Sacola → Finalizar → Enviado | o passo troca com fade de 150ms (`key={step}`), sem deslizar; o cabeçalho ("‹" ou "✕" e o título) fica |
| 15 | Abrir o prato | com View Transitions, `nav-forward` (§4); sem suporte, fade de 150ms no `article`. A `CartBar` desce (200ms), porque na rota do prato ela não existe |
| 16 | Fechar o prato | com a loja logo atrás, `router.back()`: troca seca, rolagem restaurada antes da pintura; quem chegou pelo link: `router.replace` com `nav-back` (§4) |
| 17 | Rádio e checkbox | o anel ou o quadrado enche de `primary` em 150ms (`transition-colors`); o ponto ou o check entra com `animate-check-in` (0.8 → 1, 150ms) |
| 18 | Grupo satisfeito | o selo "Obrigatório" (pílula cinza) some e o `CircleCheck` verde entra com `badge-pop`; grupo opcional com escolha também ganha o check |
| 19 | Último obrigatório satisfeito | CTA cinza → verde em 150ms (a `press` do botão liberado); verde → cinza em 200ms (`transition-colors` da pílula desabilitada). Tocar no cinza rola até o grupo que falta (`scrollBehavior()`), foca a primeira opção e anuncia |
| 20 | Quantidade ou opção muda | "Adicionar 2 por R$ 59,80" troca seco, com `tabular-nums` e largura total, sem pulo |
| 21 | "Adicionar" (prato) | vibração curta (`tapHaptic`), toast "Adicionado à sacola · Ver sacola" (5s) e volta ao cardápio na mesma rolagem, onde a `CartBar` sobe (250ms) |
| 22 | Contador da observação | atualiza a cada tecla; no limite fica `text-error` e só então é anunciado |
| 23 | Toast | sobe 16px com fade em 200ms; fica 3s (5s com ação); sai em 200ms; o novo substitui o atual |
| 24 | Imagem | fundo parado até carregar (cinza; branco no prato); sem `priority` a foto entra com fade de 200ms (`FadeImage`); com `priority`, sem fade |
| 25 | Skeleton | shimmer de 1.4s: status da loja antes de hidratar; `StoreSkeleton`/`ItemSkeleton` no modo demo enquanto o cardápio não está pronto |
| 26 | Estado vazio | ícone e texto com `animate-fade-in`; na sacola vazia (`EmptyState variant="hero"`) o foco vai para "Ver cardápio" |
| 27 | Barra da sacola (`CartBar`) | sobe em 250ms com a primeira unidade e desce em 200ms quando a sacola esvazia (desmontagem adiada); o total troca seco (`tabular-nums`); quem recarrega com a sacola cheia já a encontra no lugar |
| 28 | Badge de contagem | `animate-badge-pop` a cada mudança (`key={count}`), nunca na carga da página |
| 29 | Status "Aberto/Fechado" | skeleton até hidratar (o status depende do relógio e a página vem do cache); troca sem piscar; confere a cada minuto, e o ponto muda de cor em 150ms se o status virar com a página aberta |
| 30 | Enviar com erro (Finalizar) | rola até o primeiro campo inválido, no centro (`scrollIntoView({ block: 'center', behavior: scrollBehavior() })`), e foca; sem shake. Abaixo do pedido mínimo não há campo a apontar: o aviso (`Banner`) entra no rodapé com fade de 150ms |
| 31 | Rodapé do Finalizar com teclado | abaixo do `lg`, o resumo some seco e só acima do botão (§3) |
| 32 | Pedido enviado | check num círculo `primary-tint` com `animate-check-pop` (300ms) |
| 33 | Loja fechada | sem shake e sem bloqueio: o pedido segue marcado para quando abrir; no prato, "Fechado agora · o pedido fica para quando abrir" entra com fade depois de hidratar; na sacola e no Finalizar, aviso fixo |
| 34 | Copiar link | painel (`CopyLink`): `Copy` vira `Check` e o rótulo vira "Link copiado" por 2,2s; sheet Compartilhar da loja: "Copiar" vira "Copiado!" por 2,2s, porque o toast ficaria atrás do `<dialog>` |
| 35 | Prévia do painel | a mesma casca dentro de uma moldura rolável (`EmbeddedShell`, `transform-gpu`): barras, CTA e toast ficam presos a ela; os observadores usam a moldura como `root`; sem View Transitions (com o limite do §4) |
| 36 | Switch do painel | a bolinha desliza em 150ms; o trilho muda de cor |
| 37 | Chips | não há chips no app hoje; quando entrarem: fundo muda em 150ms, sem escala |
| 38 | Acordeão (painel) | seta gira 180° em 150ms; o conteúdo abre seco |
| 39 | Carrossel | não há na loja hoje ("Pedir de novo" ficou para depois em 2026-09-24); quando entrar: `snap-x snap-mandatory scrollbar-none`, setas só no `lg` |
| 40 | Pull-to-refresh, ripple, swipe-back próprio | não implementar: são do sistema. `overscroll-contain` só nos contêineres que rolam por dentro (sheets, sacola, Finalizar, prato no `lg`, moldura da prévia) |
| 41 | Vitrine da landing | `StoreProvider history={false}` com `ItemCard`, `CartBar`, `StoreHeader layout="bar"` e as `Tabs` reais: a pílula, o badge e a barra se movem como na loja, dentro do telefone (`transform-gpu`) |
| 42 | Papel de parede da landing | `--animate-wallpaper`: `background-position` deriva um ladrilho (22rem) na diagonal em 75s, `linear infinite`. Move a posição do fundo, e não uma camada com `transform`, porque a seção "como funciona" tem painel `sticky` dentro e sticky morre sob ancestral recortado |

## 6. Contrato de movimento reduzido

- CSS: a regra global de `globals.css` reduz toda animação e transição a 0.01ms (uma iteração), põe `scroll-behavior: auto` no `:root` e zera duração e atraso dos pseudo-elementos `::view-transition-*`. As regras `vt-*` só existem em `no-preference`. Não remova nada disso.
- JavaScript usa `src/lib/reduced-motion.ts` (2026-09-24):
  - `prefersReducedMotion()` lê `matchMedia('(prefers-reduced-motion: reduce)')` e devolve `false` no servidor. Serve para esperar uma saída animada (`CartBar`, linha da sacola), para a trava do scroll-spy (700ms → 0) e para a vibração (`tapHaptic`);
  - `scrollBehavior()` devolve `'smooth'` ou `'auto'`. Serve para `scrollIntoView`/`scrollTo`: aba ao centro, ida à categoria, grupo que falta, primeiro erro do Finalizar.
- O `BottomSheet` e o `item-form` do painel ainda leem `matchMedia` direto. É equivalente, mas código novo usa a lib.
- O toast espera 200ms para desmontar mesmo com movimento reduzido: a saída já acabou (0.01ms) e o atraso não aparece.
- Restauração de rolagem (volta do prato, abrir e fechar a busca) é sempre `behavior: 'instant'`.
- O conteúdo aparece e some no lugar. Nada depende da animação para funcionar.
- Teste no DevTools (Rendering → "Emulate CSS prefers-reduced-motion") ou com `scripts/screenshot.mjs --reduced-motion`.

## 7. O que não fazer

- Animar na montagem de listas longas (cada linha do cardápio entrando): custa frames e nenhum app de delivery faz.
- Animar a entrada do que já estava lá quando a página carregou: use `useMountAnimation`.
- Deslizar entre os passos da sacola: fade é suficiente e não enjoa.
- `transition-all`: anima propriedades que você não queria e custa performance. Liste as propriedades.
- Shake, bounce, confete, parallax, blur animado.
- Depender de `:hover` para revelar algo: no celular não existe.
- `transform`, ou animação de `transform`, num ancestral de elemento `fixed` da loja: ele vira o bloco de contenção, e o "‹", as barras e o toast passam a andar com ele. A moldura da prévia faz isso de propósito; o `article` do prato não pode.
- `scaleX` ou `width` para transformar um botão em pílula: achata os filhos ou empurra os vizinhos. Revele com `clip-path` um elemento que já está no tamanho final e fora do fluxo.
- Mudar a altura de algo `fixed` ou `sticky` acima do conteúdo ao rolar: o scroll anchoring do Chrome faz a página pular. O header do site ainda faz isso (`sticky`, encolhe de `h-32` para `h-16` com `transition-[height]`) e pisca: diagnosticado em 2026-09-24, não corrigido; a saída é `fixed` + espaçador, como no `StoreHeader`.
- `<ViewTransition>` sem `default="none"`, em volta do layout ou com mais de um nó dentro; tipo de transição dentro da prévia.
- Pôr um `transition-*` do Tailwind num elemento que já tem `press`: o utilitário vem depois no CSS e troca a lista de propriedades da `press`, e o que ficar fora da lista nova passa a mudar seco (a escala do toque sempre; com `transition-opacity`, também o fundo e a sombra). Acontece hoje no "‹" da loja (`transition-opacity`), nos botões do `SegmentedControl` e nas abas do painel (`business-tabs.tsx`, `dashboard-nav.tsx`), esses dois com `transition-colors`. Quando precisar das duas coisas, liste tudo num `transition-[…]` só.
- Importar `motion` (a lib) fora de `src/components/platform/landing/`: a loja e o painel são CSS puro (D15, P13).
