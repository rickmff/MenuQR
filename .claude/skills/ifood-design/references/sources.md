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
| brandcolorcode.com/ifood | terceiro | confirmação do `#EA1D2C` (RGB 234, 29, 44). Esse é o vermelho **do iFood**; desde 2026-09-22 o MenuQR usa o verde do WhatsApp (abaixo) |
| mobbin.com/colors/brand/whatsapp, usbrandcolors.com/whatsapp-colors, designpieces.com (paleta WhatsApp) | terceiros, coincidentes | paleta pública do WhatsApp: `#25D366` (verde do logo), `#128C7E` e `#075E54` (teal), `#DCF8C6` (balão), `#ECE5DD` (fundo do chat), `#34B7F1` (tique azul) |
| CSS público do WhatsApp Web (variáveis observadas) | primário, inferido | `#008069` (teal de botão), `#00a884` (verde de acento), `#d9fdd3` (balão enviado), `#efeae2` (papel de parede), `#111b21` / `#667781` / `#e9edef` / `#f0f2f5` (neutros), `#53bdeb` (tique), `#ea0038` (apagar). É daqui que saem `primary-tint`, `chat-bg`, `tick`, os cinzas e o `error` |
| designsystemsbrasileiros.com/pomodoro | terceiro | status fechado do Pomodoro |
| institucional.ifood.com.br — "Na Mesa" | oficial | o iFood tem produto de cardápio por QR code dentro do app: o fluxo do MenuQR (cardápio → item → sacola) espelha o do app do consumidor |
| institucional.ifood.com.br — design de conteúdo para UX | oficial | existe guia de conteúdo por público, com faça/não faça e regra de emoji; o conteúdo do guia não é público |
| institucional.ifood.com.br — iF Design Award 2026; blog-parceiros.ifood.com.br — Portal do Parceiro | oficial | funções do Portal do Parceiro e do Gestor de Pedidos (sem detalhe visual) |

## Captura do app real (vence tudo acima)

| Data | Tela | O que confirmou |
|---|---|---|
| 2026-09-22 | Página de item do app do consumidor (marmita de açaí, loja "Seven Açaí") — captura enviada pelo dono | foto de borda a borda com botão voltar escuro sobre ela; **chip da loja sobreposto ao pé da foto** (logo redondo, nome, "★ 4,9 (1835) • 57-72 min • Entrega Grátis" com o grátis em verde); título 18px bold; descrição cinza; "Entrega Grátis" verde bold + nota em caption; preço com ícone de fogo, preço antigo riscado e selo "-55%" verde; **cabeçalho de grupo em faixa cinza clara e sticky** ("Adicionais!" bold + "Escolha de 1 a 4" caption; à direita check verde quando satisfeito ou selo preto OBRIGATÓRIO); linhas de opção com miniatura quadrada à direita (~56px, raio 8) e o controle no canto: **"+" vermelho para múltipla escolha** (vira stepper por opção), **círculo de rádio para escolha única**; preço da opção em cinza abaixo do nome ("+ R$ 3,99"); **app bar branca com voltar + nome do item aparece ao rolar**; "Alguma observação?" com ícone de balão, contador "0/140" à direita e textarea com borda, placeholder "Ex: tirar a cebola, maionese à parte etc."; link "Denunciar item" em vermelho; nota "O preço com desconto aparece na sacola"; **barra inferior**: stepper "− 1 +" em pílula com borda (menos cinza, mais vermelho) + botão "Adicionar   R$ 39,99" que fica **cinza (desabilitado) enquanto há grupo obrigatório sem escolha**, mantendo o preço |

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

## Medição do whatsapp.com (2026-09-23)

| Fonte | Tipo | O que saiu dela |
|---|---|---|
| whatsapp.com, medido com Chrome headless via DevTools Protocol | **primário** (o que o navegador computa, não o que o CSS-fonte diz) | paleta por área de pixel, escala tipográfica em 1440 e 390, botões, raios, sombras, grade, ritmo vertical e transições |

Números que valem como referência (e vencem inferência antiga):

- **Fundo creme `#fcf5eb` em 66,4% da área** no desktop, 56,4% no celular. O papel do site não é branco.
- **Verde vivo `#25d366` em 0,3% da área** (1,0% no celular). É acento, nunca superfície.
- Grafite `#111b21` em 16% (duas seções e o rodapé); branco 9,5%; verde pálido `#e6ffda` 7,7% (um bloco só). Texto sobre o creme é `#1c1e21`, não `#111b21`.
- **Botão verde com rótulo grafite** (`#25d366` + `#1c1e21`, 8,8:1). Rótulo branco sobre o verde não existe na página.
- **Link é grafite com sublinhado verde** de 2px, mais chevron.
- Tipo: `WhatsApp Sans Var`, proprietária, três pesos. **Todo título é peso 400**, entrelinha 1,0, espacejamento zero, e **não há uma única caixa alta na página**. Escala 80/60/48/32/18/16/12 no desktop e 44/32/24/16/12 no celular — o título cai ~0,53 e o corpo só 0,89.
- Forma: **zero sombras**, três raios (25px imagem, 50px botão, 50% avatar), nenhuma borda de bloco. A hierarquia vem da troca de fundo por seção.
- Grade: margem de 180px em 1440, conteúdo de 1080px, coluna de texto de **450px (~50 caracteres)**, seções de 593 a 846px.
- Movimento: `0.33s cubic-bezier(0.2, 0, 0, 1)` domina (222 ocorrências), entradas de 1s. Duas a três vezes mais lento que a convenção de app.

A leitura completa, com as comparações contra a landing do MenuQR, está em
https://claude.ai/artifact/9SYajfQTHgnF4igrLyWFvH
