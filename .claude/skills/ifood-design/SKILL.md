---
name: ifood-design
description: "Refatora e restiliza qualquer tela ou componente do MenuQR para ficar idêntico ao app do iFood (design system Pomodoro): tokens, tipografia, ícones, componentes, telas, micro-interações e copy pt-BR, com um processo por fases que mantém o app buildando. Use SEMPRE que o usuário mencionar iFood, Pomodoro, redesign, refatorar, restilizar ou redesenhar a interface, trocar o design, tirar os emojis, tema, cores, tokens, botões, cardápio, item, sacola, checkout, painel, landing, animações ou deixar igual ao iFood — e também ao criar componente visual novo ou editar src/app/globals.css e arquivos de src/components deste repositório, mesmo que a skill não seja citada."
---

# ifood-design — o MenuQR com a cara e o jeito do iFood

Esta skill conduz a troca completa do visual do MenuQR (neutros quentes, laranja, serif Fraunces, emojis como ícone, cor por restaurante) pelo padrão do app do iFood. Ela traz o que foi pesquisado sobre o design do iFood, um processo por fases que nunca deixa o app quebrado e um mapa do código atual, arquivo a arquivo.

O objetivo é fidelidade: alguém que usa o iFood todo dia deve se sentir em casa — na cor, no ritmo, nas palavras e nas respostas da interface ao toque. O que sustenta isso não é o vermelho; é a disciplina: branco e cinzas frios, vermelho raro, tudo chapado, um raio por papel, uma fonte só, texto curto, movimento rápido.

## O que "igual ao iFood" significa aqui

- **Cor**: fundo branco, cinzas frios, texto `gray-700` (nunca preto puro). Vermelho `#EA1D2C` só no CTA da tela, no estado ativo, em badges e em links curtos. Verde para "Grátis" e "Aberto", amarelo para estrela, rosa para promoção.
- **Forma**: chapado. Hierarquia por divisor fino e blocos `gray-50`; sombra só em quem flutua (sheet, barra inferior, toast). Raio por papel: 4 tag, 8 botão e input, 12 card, 16 sheet, 24 busca, pill para chip.
- **Tipo**: só Inter (é o fallback oficial da fonte proprietária do iFood). Sem serif, sem fonte display.
- **Ícones**: Lucide, de linha. Emoji nunca no chrome da interface.
- **Foto de comida é a protagonista**; o resto sai da frente.
- **Texto**: "Sacola" (nunca "Carrinho"), sentence case, botão com verbo, "você".
- **Movimento**: rápido e funcional, nada acima de 300ms, tudo respeitando `prefers-reduced-motion`.
- **Minimalismo (decisão do dono, 2026-09-22)**: cada tela tem um objetivo e mostra só o que serve a ele. Sem texto de venda, selo ou reforço fora da landing; sem a mesma informação dita duas vezes; sem cabeçalho e rodapé em tela que é só um formulário (entrar, criar conta). Na dúvida entre explicar e cortar, corte — o iFood raramente explica.

O MenuQR copia um padrão de interface, não a marca: nome, logo e fonte do iFood não entram no produto.

## Decisões já tomadas

O dono do produto decidiu estes pontos. Siga-os sem perguntar de novo; se o pedido da vez disser outra coisa, o pedido vence.

| # | Decisão |
|---|---|
| D1 | Todas as superfícies entram: loja, item, sacola, checkout, painel, landing, auth e páginas globais |
| D2 | O chrome é sempre vermelho iFood. `brandColor` continua no banco e aparece só no `theme_color` do manifest e na imagem de compartilhamento de cada loja. `brandStyle()` e `--tenant-brand*` somem |
| D3 | **Funcionalidades ficam; muda a apresentação.** Quick-add, os três passos da sacola, compartilhar, busca, demo e prévia continuam funcionando como hoje |
| D4 | Emoji continua sendo dado válido do lojista (logo, ícone de categoria, imagem do prato) e é renderizado dentro de contêineres iFood: `Avatar`, tile `gray-100`, título de seção. O ícone de categoria não aparece nas tabs, que são só texto |
| D5 | Quick-add no padrão do iFood Mercado: "+" branco circular sobre a foto que vira stepper inline. Item com opção obrigatória abre a página do item |
| D6 | O item continua sendo rota (`/r/[slug]/item/[item]`): tela cheia no celular, painel centrado em `lg` |
| D7 | A sacola continua sendo overlay de cliente com os passos `cart` → `checkout` → `done`: tela cheia entrando pela direita no celular, dialog em `lg`. Sem rotas novas |
| D8 | Depois de "Adicionar" na página do item: volta ao cardápio, toast e a barra da sacola sobe (como no iFood). Abrir a sacola direto é a alternativa, se pedirem |
| D9 | Grupo obrigatório de escolha única não vem pré-selecionado; o botão "Adicionar" só libera com a escolha feita |
| D10 | O CTA final é vermelho: "Fazer pedido pelo WhatsApp". O verde do WhatsApp sai |
| D11 | Painel e plataforma são restilizados com os mesmos tokens e primitivos, não redesenhados tela a tela |
| D12 | Sheets e dialogs usam o `<dialog>` nativo (`assets/ui/bottom-sheet.tsx`) |
| D13 | Menos informação por tela. Telas de conta são só o formulário (grupo de rotas `(auth)`, sem header/footer, marca em cima). Um selo, uma estatística ou um texto de apoio só entra se não repetir algo já na tela |
| D14 | Auth é do Clerk e do dono do produto: não mexer em lógica de auth, e-mail, `src/server/auth/`, `proxy.ts`. O visual das telas do Clerk se ajusta só pelo `appearance` em `src/app/layout.tsx` (Clerk 7: `variables` com `colorForeground`/`colorMutedForeground`, `options.elevation: 'flush'`, `elements` com objetos CSS) |

## O que não se toca

A refatoração é visual. Estes pontos são regra de negócio, contrato de dados ou acessibilidade conquistada — quebrá-los custa mais do que qualquer ganho estético:

- `src/lib/cart-store.ts` (formato de `CartLine`, chaves do `localStorage`, `signatureOf`), `src/lib/whatsapp.ts` (a mensagem, emojis inclusos), `hours.ts`, `seo.ts`, `share-link.ts`, `use-share-url.ts`, server actions, repositórios, schema, tipos e rotas (há QR codes impressos).
- A URL do WhatsApp gerada para as mesmas entradas sai byte a byte igual.
- Mensagens de `validate()`, ids e `autoComplete` dos campos do checkout.
- `aria-*`, `sr-only`, `aria-live`, foco visível, um `h1` por página, JSON-LD, NAP visível no rodapé.
- **Os três caminhos de renderização** que compartilham os componentes da loja: banco (`/r/[slug]`), modo demo e prévia do painel (`/painel/previa`). Demo × banco é decidido no build, então conferir os três pede duas execuções.
- Relógio e `localStorage` só depois da hidratação: as páginas da loja são ISR.

## Processo por fases

Mais de mil ocorrências do design antigo em 52 arquivos não migram numa tacada. A estratégia é **aliases de compatibilidade**: a fase 1 instala o tema novo junto com um bloco `LEGADO` que aponta cada nome antigo para um valor novo. O app inteiro já aparece vermelho, cinza e em Inter, com `npm run check` verde, e as fases seguintes só removem usos. A auditoria reprova enquanto o bloco existir — é a linha de chegada.

Regras de trabalho: migre cada arquivo por inteiro numa edição (nunca meio-legado); audite o arquivo em seguida; feche cada fase com o checkpoint; um commit por fase se o usuário pedir commits. Se o pedido for só uma tela ou um componente, faça a fase 1 e a parte da fase 2 de que ele precisa (se ainda não existirem) e vá direto ao arquivo.

| Fase | O que fazer | Leia antes | Pronto quando |
|---|---|---|---|
| 0 Auditoria | `npm run check` verde; branch nova; `audit-legacy.mjs --baseline`; confirmar que os dois modos sobem | este arquivo | nenhum diff; o usuário sabe o tamanho do trabalho |
| 1 Fundações | `globals.css` ← `assets/theme.css`; rodar `codemod-scale.mjs` **uma vez**; `layout.tsx` só com Inter, `themeColor: '#ea1d2c'`, `viewportFit: 'cover'`, skip link com `sr-only focus:not-sr-only`; `brandStyle()` devolve `{}` (apague os imports de `@/lib/colors` que sobrarem, senão o lint avisa); `npm i lucide-react` | `tokens.md` | `check` e `build` verdes; o app já parece iFood; baseline sem Fraunces |
| 2 Primitivos | copiar `assets/ui/*` para `src/components/ui/` e escrever os demais; galeria descartável em `src/app/dev/ui/page.tsx` | `components.md` | `check`; galeria conferida no teclado (sheet, tabs, stepper) |
| 3 Loja e item — **em andamento** (feito em 2026-09-22: item, linha, app bar da loja, barra da sacola; falta busca/tabs, rodapé, sheet de compartilhar) | app bar, cabeçalho, tabs, busca, linha de item com quick-add, rodapé, página do item; `StoreFrame embedded` nas duas prévias; apagar `brandStyle` | `screens-cliente.md`, `migration-map-loja.md` | `check`; três caminhos; scroll-spy e âncoras alinhados; loja fechada testada |
| 4 Sacola | `cart-drawer.tsx` → pasta `cart/` + `use-checkout.ts`; `cart-bar.tsx` | `migration-map-loja.md` seção 13 | `check` e `build`; pedido nos dois modos; URL do WhatsApp idêntica; sacola sobrevive a recarregar |
| 5 Movimento | percorrer o catálogo item a item | `motion.md` | `check`; sem layout shift; movimento reduzido conferido |
| 6 Painel e plataforma | re-skin mecânico do painel, landing, auth, shells do demo, páginas globais, manifest e OG | `screens-painel-plataforma.md`, `migration-map-painel.md` | `check`; fluxo completo no demo: conta → negócio → categoria → item → publicar → prévia → link → pedido |
| 7 Purga | apagar o bloco `LEGADO`, `readableOnLight`, `opening-badge.tsx`, `cart-drawer.tsx`, `src/app/dev`; README; `audit:legado` dentro do `check` | `migration-map-painel.md` (fim) | auditoria `--strict` verde; `check` e `build` verdes; passada final nos três caminhos |

Comandos:

```bash
node .claude/skills/ifood-design/scripts/audit-legacy.mjs --baseline      # contagens, não reprova
node .claude/skills/ifood-design/scripts/audit-legacy.mjs <arquivo|pasta> # só o que você migrou
node .claude/skills/ifood-design/scripts/audit-legacy.mjs --strict        # linha de chegada (fase 7)
node .claude/skills/ifood-design/scripts/codemod-scale.mjs --dry-run      # fase 1, uma única vez
node .claude/skills/ifood-design/scripts/screenshot.mjs <url> --full      # celular 390px; --desktop, --click '<seletor>', --scroll-to '<seletor>', --reduced-motion
```

## Checkpoint (fim de cada fase)

1. `npm run check`. Nas fases 1, 4 e 7, também `npm run build` — é ele que pega erro de fronteira server/client.
2. Os três caminhos:
   - banco: `DATABASE_URL=file:./data/menuqr.db`, `npm run db:seed`, `npm run dev` → `/r/sabor-e-brasa`, um item, adicionar → sacola → finalizar → WhatsApp; `/painel/previa` (login `demo@menuqr.app` / `demo1234`);
   - demo: `NEXT_PUBLIC_DEMO_MODE=1 npm run dev` → as mesmas telas, a prévia, e um link compartilhado (com `#c=` no endereço) aberto em janela anônima.
3. Olhe de verdade. Não há Playwright no repositório: use `scripts/screenshot.mjs` (Chrome via DevTools Protocol, emulação real de celular) e abra o PNG com a ferramenta de leitura de imagem. Ele também avisa quando a página estoura na horizontal. Página longa vira imagem ilegível em `--full`: capture fatias com `--scroll-to '#secao'`. `chrome --screenshot --window-size=390` não serve: no macOS a janela mínima tem ~500px e a captura sai cortada. Confira 390px e `--desktop`; Tab percorre app bar → tabs → linhas; Esc fecha o sheet e o foco volta ao gatilho; movimento reduzido emulado; aparelho com notch no DevTools; loja fechada; sacola depois de recarregar.
4. Relate o que foi verificado e o que não foi. Se não deu para abrir o navegador, diga.

## Armadilhas

1. **Classe fora da escala não quebra o build, só some.** Depois dos resets, `rounded-2xl`, `shadow-md`, `text-sm` e `bg-red-500` não geram CSS. A auditoria `--strict` lista.
2. **O tema reaproveita nomes do Tailwind com outros valores** (`rounded-xl` era 12px, agora é 24px). Por isso o codemod da fase 1 — e por isso ele roda uma vez só.
3. **Tríade de offsets**: `scroll-margin-top` global, `scroll-mt` das seções e o `rootMargin` do scroll-spy mudam juntos (56 + 48 + 8px), ou tabs e âncoras dessincronizam.
4. **Relógio no render**: status de abertura, badge e avisos de loja fechada só após hidratar (`useOpeningStatus` devolve `null` primeiro). A sacola fica desmontada quando fechada.
5. **ESLint com regras do React Compiler**: nada de `ref.current` no render, `setState` síncrono em efeito, `Date.now()` no render. Meça o DOM em efeito e escreva no DOM, ou ajuste estado durante o render (veja `bottom-sheet.tsx` e `tabs.tsx`).
6. **Safe area vale zero sem `viewportFit: 'cover'`**; use `dvh`, nunca `100vh`.
7. **Trava de rolagem em dobro**: o `StoreProvider` já trava o `body`; a sacola usa `lockScroll={false}`.
8. **Toast atrás de dialog**: `<dialog>` modal cobre o toast. Dentro de sheet, feedback inline.
9. **Strings de classe são literais**: `text-${tone}` nunca é gerado; use `Record<Tone, string>`.
10. **As palavras `btn`, `surface` e `eyebrow`** são caçadas pela auditoria: não batize nada novo com elas.
11. **Lucide em `src/lib`**: não. Conteúdo com ícone mora em `src/components`.
12. **`mx-auto` sem `w-full`**: o `body` é `flex flex-col`, e margem automática desliga o stretch — o bloco encolhe para o conteúdo e uma lista rolável dentro dele estoura a tela. Todo contêiner centralizado leva `w-full` (o primitivo `Container` já leva).
13. **Imagens remotas** usam `<img>` (o `next.config.ts` não tem `remotePatterns`); mantenha o `eslint-disable` que já existe.

## Onde está cada coisa

| Preciso de… | Leia |
|---|---|
| nomes de cor, tipo, raio, sombra; como o Tailwind v4 lê o tema; bloco LEGADO e codemod | `references/tokens.md` (valores em `assets/theme.css`) |
| um botão, campo, sheet, toast, tabs…; o que cada primitivo substitui; emoji → Lucide | `references/components.md` (prontos em `assets/ui/`) |
| como é a loja, o item, a sacola, o checkout; estados; desktop | `references/screens-cliente.md` |
| painel, landing, auth, páginas globais, manifest e OG | `references/screens-painel-plataforma.md` |
| qualquer animação ou resposta ao toque | `references/motion.md` |
| o texto certo de um rótulo ou mensagem | `references/copy.md` |
| o que manter e o que trocar num arquivo da loja (com números de linha) | `references/migration-map-loja.md` |
| idem para painel, plataforma, demo; o que apagar na fase 7 | `references/migration-map-painel.md` |
| de onde veio uma informação e o quanto confiar nela | `references/sources.md` |

Os valores do iFood foram levantados de fontes públicas e parte é inferência (movimento, painel, landing). Quando o usuário trouxer um print, um Figma ou uma medida do app real, isso vence a referência: atualize o arquivo correspondente e siga.

## Ao terminar um pedido

Diga o que mudou, em que fase o projeto está, o resultado do `check` (e do `build`, se rodou), quais dos três caminhos você conferiu e o que a auditoria ainda acusa nos arquivos tocados. Não declare "igual ao iFood" sem ter olhado a tela.
