---
name: ifood-design
description: "Refatora e restiliza qualquer tela ou componente do MenuQR para ficar idêntico ao app do iFood (design system Pomodoro): tokens, tipografia, ícones, componentes, telas, micro-interações e copy pt-BR, com um processo por fases que mantém o app buildando. Use SEMPRE que o usuário mencionar iFood, Pomodoro, WhatsApp, verde, papel de parede, familiaridade, redesign, refatorar, restilizar ou redesenhar a interface, trocar o design, tirar os emojis, tema, cores, tokens, botões, cardápio, item, sacola, checkout, painel, landing, animações ou deixar igual ao iFood — e também ao criar componente visual novo ou editar src/app/globals.css e arquivos de src/components deste repositório, mesmo que a skill não seja citada."
---

# ifood-design — o MenuQR com a cara e o jeito do iFood

Esta skill conduz a troca completa do visual do MenuQR (neutros quentes, laranja, serif Fraunces, emojis como ícone, cor por restaurante) pelo padrão do app do iFood. Ela traz o que foi pesquisado sobre o design do iFood, um processo por fases que nunca deixa o app quebrado e um mapa do código atual, arquivo a arquivo.

O objetivo é fidelidade: alguém que usa o iFood todo dia deve se sentir em casa — no ritmo, nas palavras e nas respostas da interface ao toque. O que sustenta isso não é a cor; é a disciplina: branco e cinzas frios, cor de destaque rara, tudo chapado, um raio por papel, uma fonte só, texto curto, movimento rápido.

**Direção de 2026-09-22 (decisão do dono): a estrutura continua a do iFood, mas a cor e o vínculo emocional vêm do WhatsApp.** O produto existe para receber pedidos no WhatsApp; a interface deve parecer parente dele. Na prática: verde do WhatsApp como `primary`, cinzas azulados do WhatsApp, papel de parede bege com rabisco nas seções não brancas da landing, ilustrações monocromáticas de linha, balões, tiques. O mapa completo — o que já entrou, o que é sugestão e o que não se copia — está em `references/whatsapp-familiarity.md`.

## O que "igual ao iFood" significa aqui

- **Cor**: fundo branco, cinzas frios azulados (os do WhatsApp: `#111b21`, `#667781`, `#e9edef`), texto `gray-700` (nunca preto puro). Verde `#0b8639` (`primary`: o matiz do WhatsApp escurecido até 4,7:1 sobre branco) só no CTA da tela, no estado ativo, em badges, em links curtos e nos ícones de linha. O verde vivo do logo deles (`brand`, `#25d366`) fica na marca do MenuQR, em badges e — desde 2026-09-23 — no botão `brand` do site institucional, sempre com rótulo grafite. "Grátis" e "Aberto" usam o mesmo verde; amarelo para estrela; promoção é o balão verde (`primary-tint`). Vermelho só em erro. **Um verde cheio por dobra** (D19): se a tela tem mais de uma área verde, nenhuma é o CTA.
- **Forma**: chapado. Hierarquia por divisor fino e por troca de papel — creme em volta, branco no conteúdo (D21); sombra só em quem flutua (sheet, barra inferior, toast). Raio por papel: 4 tag, 8 botão e input, 12 card, 16 sheet, 24 busca, pill para chip e para botão do site institucional.
- **Sem caixa alta e sem espacejamento** (D21). Nenhum `uppercase`, nenhum `tracking-*`, em nenhuma superfície. A única exceção é o selo `Tag dark`.
- **Tipo**: três famílias com papéis separados (D19). **Inter** é a interface e o corpo — loja, item, sacola, painel, formulário. **Figtree** é o título e a eyebrow do site institucional (landing, auth, logo): o iFood usa dois cortes de verdade, e este é o nosso. **JetBrains Mono** é texto de máquina e nada mais (link, chave Pix). Sem serif.
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
| D2 | O chrome é sempre o verde do sistema (`primary`); vermelho só em erro. `brandColor` continua no banco e aparece só no `theme_color` do manifest e na imagem de compartilhamento de cada loja. `brandStyle()` e `--tenant-brand*` somem |
| D3 | **Funcionalidades ficam; muda a apresentação.** Quick-add, os três passos da sacola, compartilhar, busca, demo e prévia continuam funcionando como hoje |
| D4 | Emoji continua sendo dado válido do lojista (logo, ícone de categoria, imagem do prato) e é renderizado dentro de contêineres iFood: `Avatar`, tile `gray-100`, título de seção. O ícone de categoria não aparece nas tabs, que são só texto |
| D5 | Quick-add como na página de item do iFood: um "+" solto numa coluna própria na borda direita da linha, sem círculo nem sombra — vermelho quando dá para agir, cinza quando o item está indisponível. Item com opção obrigatória usa o mesmo "+" para abrir a página do item |
| D6 | O item continua sendo rota (`/r/[slug]/item/[item]`): tela cheia no celular, painel centrado em `lg` |
| D7 | A sacola continua sendo overlay de cliente com os passos `cart` → `checkout` → `done`: tela cheia entrando pela direita no celular, dialog em `lg`. Sem rotas novas |
| D8 | Depois de "Adicionar" na página do item: volta ao cardápio, toast e a barra da sacola sobe (como no iFood). Abrir a sacola direto é a alternativa, se pedirem |
| D9 | Grupo obrigatório de escolha única não vem pré-selecionado; o botão "Adicionar" só libera com a escolha feita |
| D10 | O CTA final é `primary`: "Fazer pedido pelo WhatsApp". Um verde só no produto — não existe um segundo verde "do WhatsApp" ao lado dele |
| D11 | Painel e plataforma são restilizados com os mesmos tokens e primitivos, não redesenhados tela a tela |
| D12 | Sheets e dialogs usam o `<dialog>` nativo (`assets/ui/bottom-sheet.tsx`) |
| D13 | Menos informação por tela. Telas de conta são só o formulário (grupo de rotas `(auth)`, sem header/footer, marca em cima). Um selo, uma estatística ou um texto de apoio só entra se não repetir algo já na tela |
| D16 | **Uma tela, um objetivo.** Cada página é responsável por uma coisa só, como uma classe bem definida: o que não serve àquele objetivo sai ou vai para a tela onde a pessoa consegue resolvê-lo. Antes de acrescentar um bloco, pergunte qual objetivo ele serve; se for outro, ele está na tela errada. Aplicado em 2026-09-22: a visão geral do painel (que juntava publicar, divulgar, estatísticas e pendências) virou **Compartilhar** (link + QR + estado de publicação); **Dados do negócio** virou cinco abas que salvam sozinhas (identidade, contato, endereço, horários, entrega); a vitrine das telas de conta só aparece em `/entrar` e `/criar-conta`, nunca nas etapas do Clerk; o aviso de termos só na tela de criar conta |
| D15 | A **landing** (`/`) segue um brief próprio (2026-09-22): mostrar, não descrever — componentes reais da loja rodando com o cardápio de exemplo, `motion` como única lib de animação (só ali; o app continua CSS puro), sem cards de ícone, sem seção clássica de features/depoimentos/preço/FAQ, um CTA ("Criar meu cardápio"). Código em `src/components/platform/landing/`; a lógica de animação vive em `landing/motion.ts`. Tokens continuam os do sistema |
| D17 | **Verde WhatsApp como cor do sistema (2026-09-22).** `primary #0b8639`, hover `#1daa61`, pressed `#096b2e`, tint `#d9fdd3` (balão enviado), `brand #25d366` (só marca e badge), `chat-bg #efeae2` (papel de parede), `tick #53bdeb`; cinzas azulados do WhatsApp; erro `#ea0038`. O verde vivo nunca vira texto nem fundo de botão com rótulo branco: 2:1 |
| D18 | **Familiaridade com o WhatsApp (2026-09-22).** Toda seção não branca da landing leva o papel de parede (`wallpaper` / `wallpaper-light`: bege + rabisco próprio em opacidade baixa) e o conteúdo vai por cima em cartões brancos, como mensagens. A landing ganha ilustrações monocromáticas de linha (`landing/illustrations.tsx`), a palavra "WhatsApp" do hero leva o glifo (`ui/whatsapp-glyph.tsx`, em `currentColor`). O rabisco e o glifo são desenhos próprios ou uso nominativo; o doodle e o logo do WhatsApp não entram como asset |
| D14 | Auth é do Clerk e do dono do produto: não mexer em lógica de auth, e-mail, `src/server/auth/`, `proxy.ts`. O visual das telas do Clerk se ajusta só pelo `appearance` em `src/app/layout.tsx` (Clerk 7: `variables` com `colorForeground`/`colorMutedForeground`, `options.elevation: 'flush'`, `elements` com objetos CSS) |
| D19 | **Dose do verde e tipografia do site institucional (2026-09-23).** A landing tinha doze elementos verdes na primeira dobra e nenhum era o CTA. Regra: **um verde cheio por dobra**, mais um acento; o resto é grafite, cinza ou o bege. Na prática — o botão do header é `dark`; o título do hero é grafite inteiro e só o glifo leva cor; o CTA é `brand` (verde vivo `#25d366` com rótulo grafite, 8,8:1); o link secundário é `tertiary`; a seção de preço troca o cinza frio pelo papel de parede; a faixa e a borda do cartão viram grafite e os tiques, cinza; o bloco final deixa de ser verde em tela cheia e vira grafite com o botão verde. **A loja, o item, a sacola e o painel não entram**: ali o verde já é escasso. Tipografia: Inter na interface, **Figtree** em título e eyebrow do site institucional, **JetBrains Mono** só em texto de máquina (`--font-mono` nunca existira, e `font-mono` caía no monoespaçado do sistema). Título da landing em `gray-900`. Detalhes e contrastes em `references/tokens.md` |
| D22 | **Borda grafite e ícone em todo botão que leva a algum lugar (2026-09-23).** Medido no site do WhatsApp: o botão secundário deles é branco com **contorno grafite**, não colorido, e **nenhum botão vem sem ícone — sempre à direita**. Aplicado: `Button variant="secondary"` passou de `border-primary` (1,47:1 sobre branco) a `border-gray-900` (17,46:1, e agora a borda sozinha cumpre os 3:1 que a WCAG pede para o limite de um controle); prop nova `after`, que cola o ícone ao rótulo — `trailing` continua sendo o preço, que vai para a outra ponta. O ícone diz o que acontece, e por isso são dois (`ui/button-icons.tsx`): `NavIcon` (chevron) para navegar dentro do MenuQR e `ExternalIcon` (seta diagonal) para o que abre em aba nova, como eles fazem em "Help Center ↗". Quem abre o WhatsApp usa o `WhatsAppGlyph`, porque ali o destino é a marca. Botão de ação local (Salvar, Copiar, Cancelar) não ganha ícone de navegação |
| D21 | **O papel do sistema é o creme (2026-09-23).** Depois de medir o whatsapp.com (ver `sources.md`), o design dele passou a valer para o sistema inteiro — mas na dose certa: o site deles é marketing, o MenuQR tem marketing **e** aplicativo, e o app do WhatsApp não se parece com o site do WhatsApp. O que entrou em tudo: **superfície quente, tinta fria** — `gray-50…300` viram a família do creme (`#fcf5eb #f4ede1 #e5ded1 #d3cabb`) e `gray-400…900` seguem os azulados; o `body` é creme e o **branco fica sendo o conteúdo** (a lista do cardápio, o cartão, o sheet, o balão). **O painel é a exceção e tem papel próprio, `gray-200`** (decisão do dono, 2026-09-23, depois de ver a tela): no creme claro o cartão branco ficava a 1,08:1 do fundo e o painel, que é feito de cartão, virava uma mancha só; sobre o `gray-200` ele sobe para 1,34:1. Lá o corpo é `gray-700` (6,85:1) e o verde de texto é `green-700` (5,19:1), porque `gray-600` e `primary` caem para 3,47:1 e 3,5:1 e reprovam; **nenhuma caixa alta e nenhum espacejamento** em lugar nenhum — o site deles não tem um só caso, e era o detalhe que mais denunciava; entrelinha 1,0 nos títulos grandes; peso máximo 600 (o 800 saiu). O CTA do checkout vira `brand`, porque é literalmente o botão do WhatsApp. **O que NÃO se copia do site deles para o app**: pílula em todo botão (o raio por papel é estrutura iFood), zero sombras (sheet, barra e toast precisam flutuar), coluna de 50 caracteres, título em peso 400 e movimento de 330ms a 1s — o app fica em 150–300ms. Exceção de caixa alta: o selo `Tag dark`, que é citação de print do app real (D5) |
| D20 | **Verde e cinza fora do branco (2026-09-23).** O `primary` foi calculado contra branco e não sobrevive a fundo mais escuro: sobre o papel de parede bege dá 3,91:1 e sobre `gray-50`, 4,41:1 — os dois reprovam na WCAG AA. Fora do branco, verde de texto é `green-700` e corpo é `gray-700`. Isso vale para as seções `wallpaper` da landing, para a vitrine de `/entrar` e `/criar-conta` e para o rodapé |
| D23 | **Um desenho só para "adicionar" no painel (2026-09-23).** A mesma ação aparecia de quatro jeitos, às vezes na mesma tela: linha fantasma verde ("Adicionar item"), caixa tracejada ("Nova categoria"), `Button secondary` ("Grupo de complementos") e `Button text` ("Opção") — e o "+" ora em 20px, ora em 16px. Agora acrescentar é sempre o **`AddButton`** (`ui/add-button.tsx`): `Button variant="secondary" size="sm"` com o "+" de 16px à esquerda, esteja ele dentro de um card, dentro de um fieldset ou solto na página — o que muda entre os casos é só onde ele fica, nunca a aparência. O tracejado sai (era o único do app fora da landing) e o rótulo começa com o verbo: "Adicionar item", "Adicionar categoria", "Adicionar grupo", "Adicionar opção", "Adicionar bairro". Dentro de um card ele mora num rodapé `border-t border-gray-200 p-4`; numa lista solta, logo depois dela |
| D24 | **Ordem das ações e botão apagado sem conteúdo (2026-09-23, decisão do dono).** Em toda linha de ações, **confirmar é o botão mais à direita** e quem desiste (Limpar, Cancelar) fica à esquerda dele — a ordem do sheet de confirmação e do formulário de item, que a linha da categoria contrariava. Ação destrutiva de outro escopo (Excluir item) continua na ponta oposta, separada por `ml-auto`. E **formulário em branco não acende botão**: "Salvar"/"Adicionar ao cardápio" e "Limpar" nascem desabilitados e só ligam quando há algo dentro (`formHasContent()` em `use-form-action.ts`, que ignora os campos ocultos de contexto). "Cancelar" é a exceção: ele fecha o editor e vale sempre. Editar um item ou renomear uma categoria já nasce com os botões acesos, porque os campos chegam preenchidos |

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
| 1 Fundações | `globals.css` ← `assets/theme.css`; rodar `codemod-scale.mjs` **uma vez**; `layout.tsx` com Inter, Figtree e JetBrains Mono (D19), `themeColor: '#0b8639'`, `viewportFit: 'cover'`, skip link com `sr-only focus:not-sr-only`; `brandStyle()` devolve `{}` (apague os imports de `@/lib/colors` que sobrarem, senão o lint avisa); `npm i lucide-react` | `tokens.md` | `check` e `build` verdes; o app já parece iFood; baseline sem Fraunces |
| 2 Primitivos | copiar `assets/ui/*` para `src/components/ui/` e escrever os demais; galeria descartável em `src/app/dev/ui/page.tsx` | `components.md` | `check`; galeria conferida no teclado (sheet, tabs, stepper) |
| 3 Loja e item — **em andamento** (feito em 2026-09-22: item, linha, app bar da loja, barra da sacola; falta busca/tabs, rodapé, sheet de compartilhar) | app bar, cabeçalho, tabs, busca, linha de item com quick-add, rodapé, página do item; `StoreFrame embedded` nas duas prévias; apagar `brandStyle` | `screens-cliente.md`, `migration-map-loja.md` | `check`; três caminhos; scroll-spy e âncoras alinhados; loja fechada testada |
| 4 Sacola | `cart-drawer.tsx` → pasta `cart/` + `use-checkout.ts`; `cart-bar.tsx` | `migration-map-loja.md` seção 13 | `check` e `build`; pedido nos dois modos; URL do WhatsApp idêntica; sacola sobrevive a recarregar |
| 5 Movimento | percorrer o catálogo item a item | `motion.md` | `check`; sem layout shift; movimento reduzido conferido |
| 6 Painel e plataforma — **em andamento** (feito em 2026-09-22: layout do painel padronizado — `PanelShell`, `PanelPage`, `PanelHeader`, duas larguras, coluna à esquerda; falta `item-form`, `category-manager`, `onboarding-form`, landing e páginas globais) | re-skin mecânico do painel, landing, auth, shells do demo, páginas globais, manifest e OG | `screens-painel-plataforma.md`, `migration-map-painel.md` | `check`; fluxo completo no demo: conta → negócio → categoria → item → publicar → prévia → link → pedido |
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
12. **Duas classes de largura disputando**: sem `tailwind-merge`, um `w-full` embutido numa função de classe vence o `w-auto` de quem chama conforme a ordem do CSS — foi assim que os campos de horário viraram uma coluna. Largura fica com quem chama.
13. **`mx-auto` sem `w-full`**: o `body` é `flex flex-col`, e margem automática desliga o stretch — o bloco encolhe para o conteúdo e uma lista rolável dentro dele estoura a tela. Todo contêiner centralizado leva `w-full` (o primitivo `Container` já leva).
14. **Imagens remotas** usam `<img>` (o `next.config.ts` não tem `remotePatterns`); mantenha o `eslint-disable` que já existe.

## Onde está cada coisa

| Preciso de… | Leia |
|---|---|
| nomes de cor, tipo, raio, sombra; como o Tailwind v4 lê o tema; bloco LEGADO e codemod | `references/tokens.md` (valores em `assets/theme.css`) |
| um botão, campo, sheet, toast, tabs…; o que cada primitivo substitui; emoji → Lucide | `references/components.md` (prontos em `assets/ui/`) |
| como é a loja, o item, a sacola, o checkout; estados; desktop | `references/screens-cliente.md` |
| painel, landing, auth, páginas globais, manifest e OG | `references/screens-painel-plataforma.md` |
| o que do WhatsApp entra, o que é sugestão e o que não se copia | `references/whatsapp-familiarity.md` |
| qualquer animação ou resposta ao toque | `references/motion.md` |
| o texto certo de um rótulo ou mensagem | `references/copy.md` |
| o que manter e o que trocar num arquivo da loja (com números de linha) | `references/migration-map-loja.md` |
| idem para painel, plataforma, demo; o que apagar na fase 7 | `references/migration-map-painel.md` |
| de onde veio uma informação e o quanto confiar nela | `references/sources.md` |

Os valores do iFood foram levantados de fontes públicas e parte é inferência (movimento, painel, landing). Quando o usuário trouxer um print, um Figma ou uma medida do app real, isso vence a referência: atualize o arquivo correspondente e siga.

## Ao terminar um pedido

Diga o que mudou, em que fase o projeto está, o resultado do `check` (e do `build`, se rodou), quais dos três caminhos você conferiu e o que a auditoria ainda acusa nos arquivos tocados. Não declare "igual ao iFood" sem ter olhado a tela.
