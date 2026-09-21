# Movimento — micro-interações

Os números aqui são **inferidos** das convenções do Material 3 e do iOS, que os apps nativos do iFood seguem (ver `sources.md`). Use como checklist da fase 5: passe item por item do catálogo e confira cada um na tela.

## 1. Princípios

- Movimento explica, não enfeita: mostra de onde veio um painel, o que mudou na sacola, qual tab está ativa. Se tirar a animação não confunde ninguém, ela não precisava existir.
- Rápido. O app do iFood parece instantâneo: nada passa de 300ms (exceto o shimmer). Entradas desaceleram, saídas aceleram, mudanças no lugar usam a curva padrão.
- Sem mola, sem bounce, sem shake, sem parallax. A única "brincadeira" é o pop do contador da sacola.
- Só `transform` e `opacity` (e `background-color` no toque). Nunca anime `height`, `top` ou `margin` — causa layout shift.
- Toda animação respeita `prefers-reduced-motion`.

## 2. Tokens

| O quê | Valor |
|---|---|
| `ease-standard` | mudança no lugar (tabs, chips, toque) |
| `ease-decelerate` | entradas (sheet, barra da sacola, toast) |
| `ease-accelerate` | saídas |
| `duration-100` | feedback de toque |
| `duration-150` | hover, fade, troca de número, radio e checkbox |
| `duration-200` | chips, indicador de tab, toast, saída de sheet, acordeão |
| 250ms | `animate-slide-up` (barra da sacola) |
| 300ms | `animate-sheet-in`, `animate-slide-in-right` |
| 1.4s linear infinito | `animate-shimmer` |

## 3. Receitas

**Toque.** Todo elemento clicável leva a utility `press` (escurece o fundo via classes `active:` e encolhe para 0.98). Ela substitui o ripple do Android e o highlight do iOS, que `-webkit-tap-highlight-color: transparent` desliga.

```tsx
<button className="press rounded-sm bg-primary active:bg-primary-pressed …">
```

**Entrada e saída com desmontagem adiada.** Um componente que some precisa continuar montado até a animação de saída terminar. O padrão está em `assets/ui/bottom-sheet.tsx`: `rendered` acompanha `open` na entrada (ajuste de estado durante o render, sem efeito) e só cai num `setTimeout` de 200ms depois que `open` vira falso. Entradas não usam `fill-mode: both`; saídas usam `forwards`.

```tsx
const [rendered, setRendered] = useState(open);
const [previousOpen, setPreviousOpen] = useState(open);
if (open !== previousOpen) {
  setPreviousOpen(open);
  if (open) setRendered(true);
}
const closing = rendered && !open; // troca animate-sheet-in por animate-sheet-out
```

**Contador e número que trocam.** Uma `key` com o valor refaz a animação a cada mudança, sem estado extra:

```tsx
<span key={count} className="animate-badge-pop …">{count}</span>   // badge da sacola
<span key={value} className="inline-block animate-fade-in">{value}</span> // número do stepper
```

**Imagem que chega.** Fundo `bg-gray-100` com a utility `skeleton` até o `onLoad`; a imagem entra com `transition-opacity duration-200`. O contêiner tem proporção fixa (`size-[88px]`, `aspect-4/3`) para não haver layout shift.

**Indicador de tab que desliza.** Um traço absoluto de 2px cujo `transform` e `width` são escritos direto no DOM num `useLayoutEffect` (ver `assets/ui/tabs.tsx`). Sem estado: evita re-render da lista e evita `setState` dentro de efeito, que o lint do React Compiler reprova.

**Título que aparece na app bar.** Uma sentinela invisível no fim do cabeçalho da loja + `IntersectionObserver`; o estado `compact` troca `opacity-0 translate-y-1` por `opacity-100 translate-y-0` com `transition duration-150`. Leia o ref dentro do efeito, nunca no render.

**"+" que vira stepper.** O contêiner anima a largura (`transition-[width] duration-200 ease-standard`, de `w-8` para `w-24`) e o stepper entra com `animate-fade-in`.

**Linha removida da sacola.** A remoção no store é imediata, então adie-a: marque a linha como `removing`, aplique `grid-rows-[0fr] opacity-0` num wrapper `grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-200 ease-accelerate` (o filho tem `overflow-hidden`) e só então chame `setQuantity(uid, 0)`, após 200ms (0ms com movimento reduzido).

**Acordeão do FAQ.** `<details className="group">` com o `ChevronDown` em `transition-transform duration-200 group-open:rotate-180`; o conteúdo entra com `animate-fade-in`.

**Vibração.** Opcional, só ao adicionar à sacola, só sem movimento reduzido: `navigator.vibrate?.(10)`. O iOS ignora; tudo bem.

## 4. Catálogo

| # | Interação | Especificação |
|---|---|---|
| 1 | Pressionar botão ou linha | `press`: fundo escurece (`primary-pressed` ou `gray-50`) + escala 0.98 em 100ms; volta em 150ms |
| 2 | Hover no desktop | `primary-hover`; card interativo ganha `shadow-medium`; 150ms |
| 3 | Foco por teclado | contorno 2px `primary`, offset 2px, sem animação |
| 4 | Quick-add "+" | vira stepper (largura 200ms); badge da sacola faz pop; barra da sacola entra com `animate-slide-up` |
| 5 | Stepper | número troca com fade 150ms; no mínimo o "−" vira lixeira; remover colapsa a linha em 200ms |
| 6 | Tabs de categoria | indicador desliza em 200ms; tab ativa rola para o centro |
| 7 | App bar ao rolar | nome da loja aparece com fade + 4px em 150ms; borda inferior surge |
| 8 | Modo busca | campo entra em 200ms no lugar das tabs; filtro com debounce de 150ms; resultados com `animate-fade-in` |
| 9 | Bottom sheet | scrim em 150ms; painel sobe em 300ms desacelerando; sai em 200ms acelerando; arrastar mais de 30% fecha; foco preso e devolvido |
| 10 | Sacola | no celular entra pela direita em 300ms; no desktop dialog com `animate-pop-in`; os passos trocam com fade de 150ms, sem deslizar |
| 11 | Página do item | conteúdo entra com `animate-slide-in-right`; a barra inferior sobe com `animate-slide-up` |
| 12 | Grupo obrigatório satisfeito | tag "OBRIGATÓRIO" vira check verde com pop; "Adicionar" vai de cinza a vermelho em 200ms |
| 13 | Radio e checkbox | borda vira preenchimento `primary` em 150ms; o check escala de 0.8 a 1 |
| 14 | Contador do comentário | atualiza a cada tecla; no limite fica `text-error` |
| 15 | Toast | sobe 16px com fade em 200ms; fica 3s; sai em 200ms; o novo substitui o atual |
| 16 | Imagem | shimmer até carregar; entra com fade de 200ms |
| 17 | Skeleton de página | shimmer 1.4s; troca pelo conteúdo com fade |
| 18 | Estado vazio | ícone e texto com `animate-fade-in` |
| 19 | Segmented control | pílula branca desliza em 200ms |
| 20 | Chips | fundo muda em 150ms; sem escala |
| 21 | Switch do painel | bolinha desliza em 150ms; o trilho muda de cor |
| 22 | Acordeão | seta gira 180° em 200ms; conteúdo com fade |
| 23 | Copiar link | ícone `Copy` vira `Check` por 2s + toast "Link copiado" |
| 24 | Loja fechada | sem shake: botão desabilitado e toast explicando |
| 25 | Carrossel de destaques | `snap-x snap-mandatory`; setas só no desktop |
| 26 | Barra da sacola | total troca com fade de 150ms; some quando a sacola abre |
| 27 | Badge de contagem | `animate-badge-pop` a cada mudança |
| 28 | Status "Aberto/Fechado" | skeleton até hidratar; troca sem piscar |
| 29 | Transição de rota | `next/link` comum. Sem View Transitions (experimental); a entrada do item cobre o caso |
| 30 | Pull-to-refresh e ripple | não implementar: são do sistema nativo |

## 5. Contrato de movimento reduzido

- CSS: a regra global do `theme.css` reduz toda animação e transição a 0.01ms. Não a remova.
- JavaScript lê `window.matchMedia('(prefers-reduced-motion: reduce)').matches` antes de: `scrollTo`/`scrollIntoView` com `behavior: 'smooth'`, esperar o tempo de saída de sheet e toast, e `navigator.vibrate`.
- O conteúdo aparece e some no lugar. Nada depende da animação para funcionar.
- Teste no DevTools: Rendering → "Emulate CSS prefers-reduced-motion".

## 6. O que não fazer

- Animar na montagem de listas longas (cada linha do cardápio entrando): custa frames e o iFood não faz.
- Deslizar entre os passos da sacola: fade é suficiente e não enjoa.
- `transition-all`: anima propriedades que você não queria e custa performance. Liste as propriedades.
- Shake, bounce, confete, parallax, blur animado.
- Depender de `:hover` para revelar algo: no celular não existe.
