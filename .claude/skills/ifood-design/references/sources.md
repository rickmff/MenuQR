# Fontes — de onde veio cada informação

Pesquisa feita em setembro de 2026. O iFood não publica o design system (o catálogo Design Systems Brasileiros lista o Pomodoro como fechado, sem kit nem código). "100% iFood" aqui significa: fiel ao que é observável publicamente, com as lacunas preenchidas por convenção de plataforma e marcadas como inferência.

**Se o usuário trouxer um print, um Figma ou um valor medido no app, isso vence qualquer coisa deste diretório.** Atualize o `theme.css` ou a referência correspondente e siga.

## Usadas

| Fonte | Tipo | O que saiu dela |
|---|---|---|
| designmd.app/brands/ifood | terceiro (extração de CSS público + análise de marca) | paleta completa, escala tipográfica, espaçamento, raios, sombras, lista de componentes, do's and don'ts. Base do `theme.css` |
| tech.ifood.com.br — "IFDS: por dentro dos padrões de engenharia e arquitetura de componentes do iFood Design System" | **oficial** | arquitetura iFDL (tokens) → iFDS (componentes); tokens `--ifdl-*` gerados do Figma via style-dictionary; CSS com tokens, nunca valor fixo; props semânticas (`variant`, `isLoading`) em vez de props de estilo; composição (`Dialog.Header/Body/Footer`); a11y e testes obrigatórios. Base das convenções de `components.md` |
| Guia de Identidade Visual iFood (cópia em pdfcoffee.com) | oficial, versão antiga | vermelho `#EA1D2C` (Pantone 185C), branco, regras do logo, grafia "iFood". A tipografia desse guia (Sul Sans) é anterior à Tipo iFood |
| fabiohaagtype.com/en/ifood-font | **oficial** (autor da fonte) | Tipo iFood, 2023, com FutureBrand: versões Display e Text, letras f, t e r abertas; proprietária |
| brandcolorcode.com/ifood | terceiro | confirmação do `#EA1D2C` (RGB 234, 29, 44) |
| designsystemsbrasileiros.com/pomodoro | terceiro | status fechado do Pomodoro |
| institucional.ifood.com.br — "Na Mesa" | oficial | o iFood tem produto de cardápio por QR code dentro do app: o fluxo do MenuQR (cardápio → item → sacola) espelha o do app do consumidor |
| institucional.ifood.com.br — design de conteúdo para UX | oficial | existe guia de conteúdo por público, com faça/não faça e regra de emoji; o conteúdo do guia não é público |
| institucional.ifood.com.br — iF Design Award 2026; blog-parceiros.ifood.com.br — Portal do Parceiro | oficial | funções do Portal do Parceiro e do Gestor de Pedidos (sem detalhe visual) |

## Bloqueadas (não usadas)

Responderam 403 ou desafio do Cloudflare: os artigos do Medium (iFood Tech "Design System: Style Dictionary em escala"; estudos de caso de redesign do app; análise iFood × Rappi; estudo "iFood in loco") e o próprio ifood.com.br. O archive.org não estava acessível. Se o usuário conseguir abrir algum deles, vale extrair nomes reais de token e descrições de tela.

## Inferido (marque como tal ao explicar para o usuário)

- **Movimento**: durações, easings e o catálogo de micro-interações seguem o Material 3 e o iOS, que os apps nativos do iFood seguem. Não há documentação pública de motion do iFood.
- **Anatomia das telas** (loja, item, sacola, finalizar): descrição do app do consumidor a partir de conhecimento público do produto, não de especificação.
- **Painel** no estilo Portal do Parceiro e **landing** no estilo do site institucional: só a estrutura funcional é documentada; o visual aplica os mesmos tokens e primitivos.
- **Raio dos botões**: a extração do site aponta CTAs pill; no app os botões de ação têm cantos de cerca de 8px. Decisão: 8px no produto (loja, painel), pill só na landing.
- **Ícones**: o iFood tem conjunto próprio, de linha, desenhado para combinar com a Tipo iFood. Lucide (linha, 2px, cantos arredondados) é o substituto aberto mais próximo.

## Limites legais e de marca

O MenuQR copia um padrão de interface, não a marca. Não use o nome, o logo ou a Tipo iFood na interface, nos metadados ou no material do produto.
