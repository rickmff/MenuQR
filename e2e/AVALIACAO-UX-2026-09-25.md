> Cópia da avaliação gerada em 2026-09-25 pelo kit em `e2e/`. Evidência (capturas das lentes) em `e2e/report/avaliacao-2026-09-25/`; a rodada E2E que serviu de base está em `e2e/report/` (o passo 3 do relatório atual já traz "Continuar configuração → /painel/negocio", corrigindo a leitura antiga citada em F11). Versão navegável com imagens: ver o link do artifact na conversa.

# Avaliação do fluxo do lojista — Menu Online (2026-09-25)

Base: E2E de 29 passos verdes em http://localhost:3201 (`report/e2e.md`, `report/e2e.json`), mais dez explorações por lente (cadastro, negócio, entrega, cardápio, publicar, guia, celular, feedback, conta, persona) e uma verificação cruzada de cada achado por duas lentes independentes ("reproduz" e "vale"). Caminhos relativos abaixo partem de `scratchpad/` (relatório) ou de `scratchpad/app/src/` (código, clone idêntico à main).

---

## 1. Resumo executivo

O fluxo funciona de ponta a ponta: criar conta, cadastrar o restaurante, preencher as quatro abas do negócio, montar categoria e item com foto e três grupos de complementos, publicar, copiar o link, abrir a loja, fazer o pedido, despublicar, sair, voltar, excluir a conta — 29 passos, zero falhas (`report/e2e.md:3`). O que está bem: o cadastro em três campos com o link derivado do nome, o estado vazio do cardápio que diz o que fazer, o formulário de item permanente com Enter enviando, o guia que mostra o que ficou gravado, os diálogos de exclusão que dizem a consequência, o bloqueio honesto de Publicar, e a loja que reflete fielmente o que foi configurado.

O que não faz sentido se concentra em quatro lugares. (1) **Dinheiro e dados gravados errado com "Alterações salvas."**: taxa de entrega digitada como "R$ 6,00" vira zero e a loja mostra "Grátis" (F01); "Por distância" sem ponto volta calado para bairro (F05); o grupo de complemento sem opção some (F07); o horário 18h–23h inventado no cadastro conta como passo concluído e a loja abre e fecha por ele sem o lojista nunca ver a aba (F03). (2) **O guia de configuração cobre a ação principal**: em todo desktop de 1024 a 1440px a janela fica sobre "Criar categoria"/"Adicionar ao cardápio", e no celular a pílula fica sobre "Salvar" (F02, F16) — o próprio passo obrigatório do guia é bloqueado pelo guia. (3) **Três regras de "próximo passo" que discordam**: o cadastro cai no cardápio (certo), o guia manda para Identidade (cosmético), "Salvar e continuar" pula duas abas sem confirmar que salvou, e ao completar 5/5 o guia some sem dizer "agora publique" (F11, F12, F13, F14). (4) **Erros que não apontam o campo ou saem em inglês** (F06, F18, F19, F20, F36, F37).

Veredito: a estrutura de telas está correta (uma tela, um objetivo, abas do negócio, cardápio em uma tela) e não precisa ser refeita. O que precisa é (a) corrigir quatro defeitos de dado gravado errado, todos pequenos; (b) fazer o guia reservar espaço em vez de flutuar por cima; (c) unificar a regra de próximo passo em `setupProgress().next` com o obrigatório primeiro; (d) passar os formulários do negócio e do cadastro para o `TextField` que já existe. Com isso a jornada até "No ar" cai de 8 telas em zigue-zague para 6 lineares, e o lojista com pressa nunca se pergunta por que está numa tela.

---

## 2. Mapa da jornada como está hoje

Fonte: `report/e2e.md` (tempo = duração do passo no script Playwright, não de um humano; cliques = contagem da lente persona a 1280×900). Em produção existe um passo a mais antes do 2: `/painel/assinatura` (Pix anual), porque `requireSubscription` roda antes de `/painel/comecar` — o teste rodou com `BILLING_MODE=off`.

| #   | Tela                                     | O que o lojista faz                                                                                                                           | O que vê                                                                                                                                                               | Tempo/cliques                                                                   |
| --- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | `/criar-conta` → código                  | E-mail, senha (15+ caracteres), código de 6 dígitos                                                                                           | Formulário do Clerk; "Código incorreto." em vermelho se errar                                                                                                          | 5,1 s · 2 cliques, 3 preenchimentos (`e2e.md:5-10`)                             |
| 2   | `/painel/comecar`                        | Nome, endereço do cardápio (derivado), WhatsApp, cidade (opcional)                                                                            | Texto "Três informações…" com quatro campos; erros em verde (F36); "Este endereço já está em uso"                                                                      | 0,3–0,9 s · 1 clique, 2–4 preenchimentos (`e2e.md:12-25`)                       |
| 3   | `/painel/cardapio` (vazio) + guia aberto | Chega no lugar certo, mas o guia por cima diz "2 de 5 concluídos" e "Continuar configuração" → Identidade                                     | "Comece pela primeira categoria"; guia cobre "Criar categoria" (F02); Horários já "concluído · 7 dias" (F03)                                                           | 0,1 s · 1 clique para recolher o guia (`e2e.md:27-31`, `shots/009`)             |
| 4   | `/painel/negocio` (Identidade)           | Descrição curta, sobre, logo, cor, capa; "Salvar e continuar"                                                                                 | "Imagem enviada. Salve para aplicar." ×2; salva sem confirmação e cai em Entrega, pulando Contato e Horários (F12)                                                     | 3,9 s · 4 cliques, 1–3 preenchimentos + 2 uploads (`e2e.md:33-41`)              |
| 5   | `/painel/negocio/contato`                | (Só se abrir à mão) WhatsApp já preenchido; Instagram                                                                                         | Erro persiste depois de corrigir (F20); "Salvar e continuar" → Entrega                                                                                                 | 4,2 s · 1 clique (`e2e.md:43-49`)                                               |
| 6   | `/painel/negocio/horarios`               | (Só se abrir à mão) Desliga domingo; deixa abertura em branco → erro                                                                          | "Preencha abertura e fechamento… ou deixe em branco" sem dia nem campo marcado (F18)                                                                                   | 4,4 s · 3 cliques (`e2e.md:51-57`)                                              |
| 7   | `/painel/negocio/entrega`                | Endereço (5 campos), mapa, liga entrega, bairros, retirada; troca para distância                                                              | Três mensagens para "sem modo" (F19); "Alterações salvas." e fica na aba; botão diz "Salvar alterações", sem próximo (F13)                                             | 2,2 + 2,6 + 4,2 s · ~8 cliques, 5–11 preenchimentos (`e2e.md:59-79`)            |
| 8   | guia → `/painel/cardapio`                | "Continuar configuração"; cria "Massas"; item com foto, 3 grupos, mais detalhes; segundo item e categoria; edita inline; esgota; move; exclui | Toast sobre a faixa de erro (F02); grupo sem opção some (F07); "Foto enviada. Salve para aplicar." sob "Adicionar ao cardápio" (F63); guia some ao salvar o item (F14) | 1,8 + 0,2 + 1,5 + 1,4 + 0,5 + 1,6 + 0,1 + 2,9 s · ~12 cliques (`e2e.md:81-134`) |
| 9   | `/painel` (Compartilhar)                 | Vê Rascunho, link, QR ativos; publica; copia; abre                                                                                            | Link responde 404 antes de publicar sem aviso (F15); "Link copiado" sem toast; "No ar" + "Abrir" + "Ver cardápio" depois                                               | 1,5 + 16,6 s · 3 cliques (`e2e.md:136-147`)                                     |
| 10  | `/painel/previa` e `/r/<slug>`           | Confere prato, complementos, entrega/retirada, checkout                                                                                       | Loja fiel: "Pedido mínimo R$ 25,00", grupo obrigatório trava "Adicionar", bairros com taxa e prazo                                                                     | 4,7 + 35,5 s (`e2e.md:149-164`)                                                 |
| 11  | Despublicar / publicar bloqueado         | Despublica em um clique; esgota tudo; tenta publicar                                                                                          | Sem confirmação nem toast ao despublicar (F32); "Adicione pelo menos um item disponível…" em tooltip                                                                   | 7,3 s · 2 cliques (`e2e.md:166-168`)                                            |
| 12  | Sair → `/entrar?proximo=` → volta        | Sai, tenta `/painel/cardapio` deslogado, entra                                                                                                | Volta exatamente à tela pedida                                                                                                                                         | 3,4 s (`e2e.md:170-174`)                                                        |
| 13  | Celular 390px                            | Percorre as cinco telas                                                                                                                       | Estouro horizontal 0 em todas; conta 5/5, então sem guia (ver F16 para conta nova)                                                                                     | 14,2 s (`e2e.md:176-187`)                                                       |
| 14  | `/painel/conta` → excluir                | Idioma inglês; digita a frase; exclui                                                                                                         | Três h1 "Conta" (F59); depois de excluir a landing ainda diz "Ir para o painel" e `/painel` dá 500 (F09)                                                               | 2,7 + 2,4 s (`e2e.md:189-200`)                                                  |

Caminho mínimo até ter um item (persona): 4 telas, 8 preenchimentos, 5 cliques (6 com foto). Até "No ar" seguindo o guia: 8 telas, 17–22 preenchimentos, ~14 cliques, com o caminho cardápio → identidade → entrega → guia → cardápio → compartilhar.

---

## 3. O que está bem resolvido

- **Cadastro em três campos com link derivado.** "Cantina da Nonna – Ração & Cia Ltda." → `cantina-da-nonna-racao-cia-ltda`; campo editado à mão também normalizado (`onboarding-form.tsx:16-24`; `report/shots/003-pos-cadastro.png`). WhatsApp com país, máscara, número colado com "+" reconhecido (`phone-input.tsx:55-66`; `report-cadastro/shots/007-seletor-pais-aberto.png`).
- **Chegada no cardápio com estado vazio que fala a língua do lojista.** `business.ts:150` redireciona para `/painel/cardapio`; "Comece pela primeira categoria — Hambúrgueres, Porções, Bebidas… os itens ficam dentro delas" (`report/shots/023-cardapio-vazio.png`).
- **Progresso do guia derivado do que está gravado, com resumo do que ficou salvo.** "Rua Augusta, 1500 • São Paulo • Entrega em 2 bairros • Retirada no local" (`setup-steps.ts:9-14`; `e2e.md:82`; `shots/022`). Ordem das abas e do guia vêm da mesma lista (`business-sections.ts:40-45`).
- **Cada aba salva sozinha e erro não apaga o que foi digitado.** Envio pelo `onSubmit` (`use-form-action.tsx:5-17`); retorno junto do botão numa barra grudada, com rolagem até o erro (`business-form.tsx:128-133`, `625-633`; `shots/013`).
- **Interruptor do dia guarda o horário ao desligar e devolve ao religar** (`business-form.tsx:95-104`; `shots/016`, domingo "Fechado").
- **Mapa procura o que está digitado e devolve por escrito.** "Encontramos: Rua Augusta, 1500, Consolação, São Paulo - SP. Arraste o pino se não for aqui." (`e2e.md:66`); roda do mouse não dá zoom porque a aba é longa (`delivery-radius-map.tsx:98`).
- **Formulário de item permanente, Enter envia, volta em branco.** `G_enter_envia = true`; "formulário do próximo item voltou em branco: true" (`e2e.md:106`; `shots/028`). Botão apagado com o formulário vazio (D24) evita envio acidental (`e2e.md:87,96`).
- **Editor de complementos esconde o que não faz sentido por tipo**: sem "Máximo" em "Escolher uma", sem "Acréscimo" em "Retirar ingredientes", placeholders por tipo (`item-form.tsx:391,436`; `shots/026`). Complementos e Mais detalhes recolhidos com resumo legível (`shots/028`: "serve, etiquetas, alérgenos, calorias").
- **Foto num quadro só, com erros escritos para o lojista** (HEIC do iPhone, acima de 12 MB — `image-field.tsx:26`; `painel.json imageField.errors`). Salvar fica desabilitado enquanto sobe (`business-form.tsx:76-79`).
- **Esgotar em um toque, otimista, com selo** (`shots/031`; `menu-editor.tsx:281-307`). Diálogos de exclusão dizem a consequência: "O item sai do cardápio publicado na hora. Isso não desfaz." / "O item dela sai do cardápio junto." (`e2e.md:130-131`; `shots/032`).
- **Publicar bloqueado é honesto e acessível**: `aria-disabled` + motivo em português; o servidor repete a checagem (`business.ts:577`; `shots/041`). Publicar/despublicar viram 404↔200 na hora (`e2e.md:137,144`).
- **Prévia é a mesma tela do cliente, com links presos em `/painel/previa`**, faixa que muda com o estado e "Voltar ao painel" caindo na tela de publicar (`preview-frame.tsx:12-17`; `shots/036-037`).
- **Loja reflete o configurado com as mesmas palavras**: "Pedido mínimo R$ 25,00", "Entrega grátis acima de R$ 80,00", "Consolação — R$ 6,00 · 30-40 min", "Meu bairro não está na lista" (`e2e.md:157-161`; `shots/038-040`).
- **Sessão e destino**: deslogado em `/painel/cardapio` → `/entrar?proximo=…` → volta à mesma tela (`e2e.md:172-173`). Sair cai na landing já deslogada.
- **Excluir conta bem protegido**: botão apagado até a frase; frase tolerante a maiúscula e ao idioma; dados somem antes do acesso; link 404 na hora (`e2e.md:196-199`; `shots/049,051`).
- **Celular**: estouro horizontal zero em todas as rotas (`e2e.md:177-181`); campos de 48px com `inputMode` certo (`item-form.tsx:334,398,445`); abas principais rolam até a ativa (`dashboard-nav.tsx:26-31`); toast sobe acima da pílula (`report/celular/07`).
- **Idioma troca tudo de uma vez**, inclusive o Clerk, sem sobras em português (`e2e.md:191`; `shots/050`).

---

## 4. Achados confirmados, por prioridade

Legenda: **DEFEITO** quebra ou grava errado · **ATRITO** funciona mas confunde/custa · **IDEIA** melhoria opcional. Quando as duas lentes discordaram na severidade, a escolha está justificada no item.

### 4.1 Prioridade ALTA

#### Entrega — dinheiro gravado errado com "Alterações salvas."

**F01 · DEFEITO · alta** — Taxa, pedido mínimo e frete grátis digitados como "R$ 6,00" ou "1.500,00" viram zero em silêncio.

- **Tela**: `/painel/negocio/entrega`.
- **O que acontece**: `parseNumber` (`server/actions/business.ts:189-193`) faz `Number(String(v).replace(',', '.'))` e devolve 0 para NaN; "R$ 6,00" → 0, "1.500,00" → 0. Usado em minOrder/freeAbove (:272-273), zone-fee (:238), raio (:209) e taxas por distância (:420-422). O schema aceita `min(0)`, então sai "Alterações salvas.". Ao recarregar, taxa "0" e a loja mostra "Grátis · Taxa de entrega". "9,50" volta como "9.5" (`business-form.tsx:110`).
- **Evidência**: `entrega-shots/G-gravado-apos-rs.png`, `G-previa-taxa-com-rs.png`; `report/shots/046-celular-entrega.png` ("9.5"). O item já resolve isso com `parsePriceInput` (`lib/format.ts:50-60`, comentário "não pode virar R$ 0,00 calado"), usado só em `menu.ts:182`.
- **Por que importa**: perda financeira silenciosa com confirmação de sucesso; a linha do bairro não tem "R$" (F41), o que convida a digitar "R$ 6,00".
- **Recomendação**: ler os campos de dinheiro com `parsePriceInput`; texto sem número válido devolve erro de campo ("Informe um valor válido. Ex.: 6,90"); vazio continua gravando 0 ("0 desativa"); reexibir com vírgula e duas casas.
- **Esforço**: pequeno. **Conflito**: nenhum.

**F05 · DEFEITO · alta** — "Por distância" sem ponto no mapa devolve "Alterações salvas." e volta calado para "Por bairro"; os bairros antigos reaparecem no checkout.

- **Tela**: `/painel/negocio/entrega`.
- **O que acontece**: `parseDistancePricing` (`business.ts:412-425`) grava `pricing: 'zones'` quando falta o ponto, sem erro; o fieldset de bairros fica `hidden` mas não desmontado (`business-form.tsx:536-546`), então `replaceZones` regrava a lista antiga e `activeZones` (`lib/delivery.ts:50-52`) a devolve ao cliente. A tela continua mostrando "Por distância" até recarregar.
- **Evidência**: `entrega-shots/D-distancia-sem-ponto-reload.png`, `H-voltou-para-bairro-reload.png` (Consolação R$6 / Bela Vista R$9,5 de volta). Comentários contraditórios: `delivery.ts:33-36` diz que sem ponto "volta a ser combinada na conversa"; `business.ts:408-410` diz que volta para bairros.
- **Por que importa**: o lojista recebe "salvo" e o cliente é cobrado por uma regra que ele acha que desligou.
- **Severidade**: a lente "vale" rebaixou para média (aviso amarelo existe antes; os bairros foram cadastrados pelo próprio lojista). Mantenho **alta** pela mesma razão de F01: gravar algo diferente do escolhido com mensagem de sucesso é a classe de erro mais cara para um dono pouco técnico, e o cenário H (marcou, salvou, removeu o ponto para reposicionar, salvou) é rotineiro.
- **Recomendação**: bloquear o salvar como no "sem modo": `fieldErrors.deliveryPricing` = "Marque o restaurante no mapa para cobrar por distância", destacar o segmento. Se mantiver o fallback, a confirmação precisa dizer o que foi gravado.
- **Esforço**: pequeno. **Conflito**: nenhum.

#### Horários — passo "concluído" com dado inventado

**F03 · DEFEITO · alta** — Horário nasce "concluído · 7 dias por semana" com 18h–23h inventado; o encadeamento pula a aba; a loja mostra "Abre hoje às 18:00".

- **Tela**: `/painel/negocio/horarios` e guia.
- **O que acontece**: `defaultHours()` grava 18:00–23:00 nos sete dias no `createBusinessAction` (`business.ts:82-86`, `:127`); `setup-steps.ts:135-138` conta `days > 0` como concluído; `nextPendingSection` (:181-190) pula o que está feito, então Identidade → Entrega direto. O mesmo módulo já ignora `DEFAULT_LOGO` na Identidade (:82-86) — o critério não é aplicado ao horário.
- **Evidência**: `e2e.md:28-29` ("2 de 5 passos já concluídos só com o cadastro"), `:37-38`; `shots/009-guia-inicial.png`, `015-horarios-padrao.png`, `038-loja-publica.png` ("Abre hoje às 18:00"); `report-cadastro/shots/006-horarios-nunca-vistos.png`.
- **Por que importa**: padaria, almoço ou pizzaria fechada na segunda publica com o guia verde e o cliente lê "Fechado agora · o pedido fica para quando abrir" na hora em que ela vende (`store.json:74`). Não bloqueia o pedido (screens-cliente "Nada trava"), mas mente sobre o negócio na função que o produto promete cumprir sozinho.
- **Recomendação**: criar o negócio com `hours` vazio e pré-preencher 18h–23h só no formulário ("Sugerimos 18h–23h; ajuste ao seu"); salvar grava e conclui o passo. A alternativa (comparar com `defaultHours()`) deixa pendente para sempre quem de fato abre 18h–23h — evitar.
- **Esforço**: pequeno. **Conflito**: nenhum (a regra "progresso derivado do gravado" continua respeitada).

#### Guia — cobre a ação principal

**F02 · DEFEITO · alta** — Guia flutuante e pílula cobrem "Criar categoria", "Adicionar ao cardápio" e "Salvar" em todo desktop de 1024 a 1440px e no celular; toast disputa o mesmo rodapé.

- **Tela**: `/painel/cardapio` (e `/painel/negocio` em 1024px).
- **O que acontece**: janela `fixed right-4` de 22rem (`setup-widget.tsx:79,102`) sobre a coluna de 64rem (`panel-page.tsx`): invade 344px a 1024, 192 a 1280, 112 a 1440; libera só a partir de 1536 (`report-guia/guia.json` 2.larguras). O clique em "Criar categoria" com o guia aberto estoura o timeout (guia.json 6). Reprodução da lente: com o formulário de item aberto, "Adicionar ao cardápio" falhou em 1280, 1440 **e 1536**. No celular (390px) a pílula "Configurar restaurante 3/5" (y602–648) fica sobre "Adicionar ao cardápio" (y604–652): `elementFromPoint` devolve a pílula. O toast cai sobre a faixa "Não foi salvo" (`toast.tsx:84` usa `--bottom-bar-height` da loja). `overSaveBar` (`setup-widget.tsx:67-82`) só existe para `/painel/negocio`.
- **Evidência**: `e2e.md:208` (observação [alta]); `shots/023-cardapio-vazio.png`, `025-item-erro-sem-preco.png`; `report-guia/04-1024-cardapio.png`, `05-1024-identidade.png`; `report/celular/06-item-barra-x-pilula.png`, `10-editor-inline.png`; `report/verifica-f02-{1280,1440,1536,mobile}.png`. O próprio `bootstrap.mjs` precisa recolher o guia antes de mexer no cardápio.
- **Por que importa**: é o passo obrigatório do guia bloqueado pelo guia, no estado padrão de quem acabou de cadastrar, na resolução mais comum de notebook e no celular.
- **Recomendação**: o guia não pode se sobrepor à coluna de conteúdo. Em ≥lg, `<main>` ganha `padding-right` de 22rem+1.5rem enquanto o guia está aberto (ou o guia vira coluna a partir de xl). No celular: publicar a altura da barra sticky do formulário em `--bottom-bar-height` para pílula e toast subirem (preferível a esconder a pílula, que carrega o "Continuar configuração"). Correção num lugar só (slot `floating` do PanelShell).
- **Esforço**: médio. **Conflito**: `screens-painel-plataforma.md §1` diz que o guia "flutua no canto… e por isso não disputa espaço" — a medição desmente a premissa, não a posição. Vale reabrir só a regra de reserva de espaço/`overSaveBar`; o formato Stripe fica.

#### Feedback — erros em inglês ou sem lugar

**F06 · DEFEITO · alta** — Limites de validação respondem em inglês ("Too big: expected number to be <=20") ou sem mensagem; vários campos não têm onde mostrar o erro e a aba não salva.

- **Tela**: `/painel/negocio/*` e `/painel/cardapio`.
- **O que acontece**: `.max()`/`.min()` sem mensagem e Zod 4 sem mapa pt-BR (`package.json` zod ^4.4.3, nenhum `z.config`). `fieldErrorsOf` devolve `issue.message` cru. O `Field` local do business-form só renderiza erro se receber `error`; tagline (:186), description, instagram (:295), rua/bairro/cidade/UF/CEP (:372-414), minOrder/freeAbove (:442-452), pickupEta não recebem. `menu.ts:200` manda `issues[0].message` ao banner do bloco sem índice do grupo. `CategoryForm` não renderiza `fieldErrors.description` (`menu-editor.tsx:398-406`).
- **Evidência**: `report/feedback/fb-01-tagline-longa.png` (130 chars → só "Não foi salvo: revise o campo destacado." com nada destacado); `fb-05-categoria-descricao-longa.png` (nada); `report/cardapio/C-erro-maximo-25.png`, `H-retirar-obrigatorio-maximo.png` (Zod cru); `e2e.md:99` ("L" → "Informe o nome do item.").
- **Por que importa**: quem cola uma descrição um pouco longa ou digita 25 no máximo trava num beco: inglês ou nada, e a aba inteira deixa de salvar.
- **Recomendação**: (1) mensagem por regra ("No máximo 120 caracteres", "O máximo vai de 1 a 20", "O acréscimo vai até R$ 10.000,00") — `z.locales.pt()` sozinho continua técnico; (2) `maxLength`/`min`/`max` nos inputs, hint "até 20" só onde o limite é realista; (3) passar `error` a todos os `Field` (ou migrar para `TextField`, ver F37) e, quando o erro vier de campo sem slot, mostrar a mensagem real na faixa; (4) `fieldErrors.description` na categoria; (5) índice do grupo; (6) "O nome precisa de pelo menos 2 letras".
- **Esforço**: médio. **Conflito**: nenhum (D17 e "erro em Banner" já pedem isso).

#### Conta — pós-exclusão e segundo caminho de exclusão

**F09 · DEFEITO · alta** — Depois de excluir a conta o site ainda trata o lojista como logado e `/painel` devolve 500 com "o que você já tinha feito continua salvo".

- **Tela**: `/painel/conta` → `/` → `/painel`.
- **O que acontece**: `account.ts:39-51` apaga dados e usuário no Clerk e faz `redirect('/')` sem `signOut`; `current-user.ts:30` chama `clerkCurrentUser()` para um id inexistente e lança `ClerkAPIResponseError: Not Found` em vez de devolver null; `requireUser` nunca chega ao redirect. Landing com "Ir para o painel" por ~8s; `/entrar` só ~70s depois (JWT expirado).
- **Evidência**: `pw/report/shots/010-semloja-landing-apos-excluir.png`, `011-semloja-painel-apos-excluir.png`; `pw/report/conta-sonda.json` S3; reproduzido três vezes.
- **Severidade**: "reproduz" deu média (fluxo raro, resolve sozinho em 60s); "vale" deu alta (100% das exclusões, mensagem falsa em momento de LGPD). Escolho **alta**: é determinístico, a última tela que o lojista vê ao sair do produto é um erro que contradiz o que ele pediu, e a correção é pequena.
- **Recomendação**: (1) `getCurrentUser` trata 404 do Clerk como "sem usuário"; (2) a ação devolve `{ success }` e o `DeleteAccountForm` chama `useClerk().signOut({ redirectUrl: '/?conta=excluida' })`; landing mostra "Sua conta foi excluída".
- **Esforço**: médio. **Conflito**: D14 só na execução — mexe em `src/server/auth/` e na sessão do Clerk, que são do dono. Encaminhar, não reabrir.

**F10 · DEFEITO · alta (condicional)** — O perfil do Clerk oferece um segundo "Excluir Conta" com promessa diferente e que depende de webhook para apagar o cardápio.

- **Tela**: `/painel/conta#/security`.
- **O que acontece**: seção "Perigo — Excluir Conta" do `<UserProfile>` a 60px do nosso bloco vermelho; o diálogo diz "Alguns dados associados podem ser mantidos… entre em contato com o suporte" (não existe suporte). Por esse caminho o Clerk apaga o acesso primeiro e os nossos dados dependem de `user.deleted` (`webhooks/clerk.ts:40-49`, `strict: false`). A rota do webhook responde 503 sem `CLERK_WEBHOOK_SIGNING_SECRET` (`api/webhooks/clerk/route.ts:30-34`); o `.env.local` não tem a variável.
- **Evidência**: `pw/report/shots/006-semloja-conta-seguranca.png`, `004-sonda-clerk-excluir-dialogo.png`; `conta-sonda.json` S2.
- **Severidade**: **alta** enquanto não se confirmar o webhook em produção (cardápio publicado sem dono, assinatura seguindo cobrada); média se estiver configurado (sobra a contradição de texto e o gancho não estrito). Detalhe refutado: "Excluir Conta" é title case do pacote, não caixa alta — não fere D21.
- **Recomendação**: um caminho só — desligar "Allow users to delete their accounts" na instância (decisão do dono, D14) ou esconder via `appearance.elements.profileSection__danger`. Se mantiver, trocar `userProfile.deletePage.messageLine1` na localização.
- **Esforço**: pequeno. **Conflito**: D14 só na execução.

### 4.2 Prioridade MÉDIA

#### Cadastro e chegada

**F11 · ATRITO · média** — Na chegada, dois "próximos passos" competem: a tela diz "Comece pela primeira categoria", o guia manda para Identidade, e o único passo obrigatório fica por último.

- **Tela**: `/painel/comecar` → `/painel/cardapio` → `/painel/negocio`.
- **O que acontece**: três regras de próximo — `redirect('/painel/cardapio')` (`business.ts:150`), `progress.next` = primeiro pendente da `SETUP_ORDER` sem olhar `required` (`setup-steps.ts:25-26,169`), `nextPendingSection` que exclui o cardápio (:181-190). Caminho real: cardápio → identidade → entrega → guia → cardápio. A copy do cadastro diz "Três informações… horários… no passo seguinte" com quatro campos e horários já concluídos.
- **Evidência**: `shots/009-guia-inicial.png` (na captura acima: passo atual Identidade, OBRIGATÓRIO no último); `persona/p01-cardapio-chegada.png`; `report-guia/guia.json` 1.continuar_href = `/painel/negocio` (a nota `e2e.md:30` "levou a /painel/cardapio" é falso-negativo do script: leu a URL antes da navegação).
- **Por que importa**: o dono com pressa sai da tela certa para preencher descrição, logo, cor e capa. Atenuante: no celular o guia nem aparece nessa rota.
- **Recomendação**: parte barata e suficiente — `next` prefere pendentes com `required` (uma linha em `setup-steps.ts:169`) e reescrever `painel.json:70`. Reordenar `SETUP_ORDER` e unificar as três regras é a proposta da seção 5.
- **Esforço**: pequeno (parte barata) / médio (reordenar). **Conflito**: ordem "sub-abas de negócio e, por último, o cardápio" está em `screens-painel-plataforma.md §1` e no comentário de `setup-steps.ts:25` — não é Dx; vale reabrir a ordem, o formato Stripe fica. A unificação com `nextPendingSection` contraria a justificativa de :181-186 (não trocar de assunto no meio do negócio), alinhada a D16 — ver seção 5 para a conciliação.

**F36 · DEFEITO · média** — O cadastro do restaurante mostra os erros em verde (cor de sucesso) e não destaca o endereço em uso.

- **Tela**: `/painel/comecar`.
- **O que acontece**: `text-flame-600`/`bg-flame-50` (`onboarding-form.tsx:51,70,99,119,138`) são aliases legados que hoje valem `#096b2e`/`#d9fdd3` — exatamente `--color-success` (`globals.css:703-710`, comentário "A auditoria falha enquanto este bloco existir"). O wrapper do slug fica `border-ink-200` fixo (:80).
- **Evidência**: `shots/005-comecar-erros.png` (três mensagens verdes com bordas vermelhas em Nome e WhatsApp), `006-comecar-slug-em-uso.png` (único erro da tela em verde, sem borda).
- **Por que importa**: primeira tela após criar a conta; o erro mais provável (slug em uso) não tem sinal visual. Contraria D2/D17.
- **Recomendação**: trocar por `TextField`/`FieldShell` (`ui/text-field.tsx`) e a faixa por `Alert tone="error"`; `border-error` no slug; apagar os aliases do formulário.
- **Esforço**: pequeno. **Conflito**: nenhum (a referência §1 já manda usar `TextField`).

**F38 · DEFEITO · baixa (rebaixado)** — Digitar antes de a página "acordar" apaga o que foi digitado e acusa WhatsApp inválido.

- **Tela**: `/painel/comecar`.
- **O que acontece**: o input visível do telefone não tem `name`; vai um `hidden` espelhado do estado React (`phone-input.tsx:107`). Enviar **antes da hidratação** é um POST nativo com WhatsApp vazio → página re-renderizada zerada + erro.
- **Evidência**: `report-cadastro/shots/006-comecar-corrida-hidratacao.png`; `pw/bootstrap.mjs` tem retry por isso. A lente "vale" reproduziu com CPU 6× que digitar cedo e **esperar** não perde nada (React reprocessa os eventos): só o envio pré-hidratação dispara.
- **Severidade**: as lentes divergiram (média/baixa). Escolho **baixa**: exige enviar em 1–3s da primeira pintura, o que um humano dificilmente faz; mas é um defeito real na primeira tela e a correção é pequena.
- **Recomendação**: mandar número visível e país como campos reais e montar o E.164 no servidor (libphonenumber já está lá) — vale para cadastro, Contato e configurações. Alternativa mínima: botão `disabled` no HTML do servidor e habilitar ao montar.
- **Esforço**: pequeno. **Conflito**: nenhum.

#### Dados do negócio (Identidade, Contato, Horários)

**F12 · ATRITO · média** — "Salvar e continuar" troca de aba sem confirmar que salvou, sem dizer para onde vai, e pula duas abas.

- **Tela**: `/painel/negocio`, `/contato`, `/horarios`.
- **O que acontece**: `router.push` no instante do `state.success` (`business-form.tsx:135-142`); o banner "Alterações salvas" mora no formulário desmontado. Reprodução medida: banner viveu ~70ms no desktop e ~40ms no celular. No celular o guia está escondido nessa rota e, na chegada em Entrega, a barra de sub-abas mostra "Identidade | Contato | Horários" sem nenhuma marcada (F17).
- **Evidência**: `e2e.md:37,46,54` ("retorno: (nada) → foi para /painel/negocio/entrega"), `:204`; `shots/012-identidade-salva.png`; `persona/p05-depois-identidade.png`; `pw/report/f12-celular-depois.png`.
- **Por que importa**: "isso salvou?" e "por que pulei Contato e Horários?" — o lojista volta para conferir e anula a economia do encadeamento.
- **Recomendação**: `toast({ message: state.success })` pelo `useToast` do PanelShell antes do push (sobrevive à navegação; o `ToastProvider` já envolve tudo, `painel/layout.tsx:49`), com o destino no texto: "Alterações salvas. Próximo: Endereço e entrega". Rótulo com destino é opcional (longo no celular). Com F03 corrigido, o salto deixa de pular abas.
- **Esforço**: pequeno. **Conflito**: o pulo de abas concluídas é o desenho registrado (§1 Guia) — não reabrir por este achado; a falta de confirmação não contraria nada.

**F13 · ATRITO · média** — O encadeamento desliga quando o guia é recolhido (inclusive por Esc do editor de item), termina num beco em Entrega e no celular roda sem guia nenhum.

- **Tela**: `/painel/negocio/*` e `/painel/cardapio`.
- **O que acontece**: `nextSection = setupCollapsed ? null : …` (`business-form.tsx:116-130`); rótulo vira "Salvar alterações" e persiste (localStorage). Guia escuta Esc na `window` (`setup-widget.tsx:53-60`); `item-form.tsx:286-289` não faz `stopPropagation`. `nextPendingSection` deixa o cardápio de fora (`setup-steps.ts:174-179`), então Entrega termina em "Salvar alterações". No celular `max-lg:hidden` esconde o guia mas o botão segue "Salvar e continuar".
- **Evidência**: `guia.json` 5.identidade_botao_recolhido, 6.guia_aberto_depois_esc=false; `report-guia/10-1280-depois-esc.png`; `e2e.md:61,68` ("Salvar alterações" em Entrega); `persona/p06-depois-entrega.png`.
- **Severidade**: "reproduz" média, "vale" baixa (parte 1 e 4 são decisão registrada; nada trava). Escolho **média** para as partes livres (Esc global; beco em Entrega) e trato o desacoplamento como consequência de F02.
- **Recomendação**: Esc do guia só com foco dentro dele; na última aba pendente do negócio, botão "Salvar e ir para o cardápio ›"; encadear enquanto `!progress.complete`, independente da pílula (recolher é "não quero ver a lista", não "não quero terminar"). No celular, pílula acima da barra de salvar (não linha sob as sub-abas, que §1 rejeita).
- **Esforço**: pequeno. **Conflito**: `screens-painel-plataforma.md §1` (encadeia só com guia aberto; some no celular em `/painel/negocio`). Vale reabrir porque a decisão não previu que F02 obriga a recolher.

**F17 · DEFEITO · média** — No celular a 4ª sub-aba "Endereço e entrega" fica fora da tela sem sinal, e ao chegar nela nenhuma aba aparece marcada.

- **Tela**: `/painel/negocio/*` (390px).
- **O que acontece**: 551px de abas em 358px, `scrollbar-none`, sem `mask-image`; o link ativo começa em x=380 e a lista não rola (`business-tabs.tsx:36-64`). `dashboard-nav.tsx:24-30` já tem o `scrollIntoView` no `aria-current` com o comentário sobre o mesmo problema.
- **Evidência**: `shots/046-celular-entrega.png` (três abas cinzas), `045-celular-identidade.png` (fileira termina limpa em "Horários"); reprodução da lente `pw/f17-entrega.png` com os mesmos números.
- **Por que importa**: no celular o guia está escondido nessa rota; é a aba que define se alguém consegue pedir, e o lojista não sabe que ela existe.
- **Recomendação**: replicar o `useEffect` de `dashboard-nav`; máscara de fade na borda direita ou última aba visivelmente cortada. Só encurtar o rótulo para "Entrega" não basta (~465px continuam passando de 358).
- **Esforço**: pequeno. **Conflito**: nenhum.

**F18 · ATRITO · média** — Erro de horário incompleto não diz o dia, não marca o campo, fica depois de 7 linhas e descreve um modelo ("deixe em branco") que a tela não tem.

- **Tela**: `/painel/negocio/horarios`.
- **O que acontece**: `parseHoursForm` devolve `null` sem o índice (`business.ts:214-228`); `type="time"` com `inputClass(false)` fixo (`business-form.tsx:333-352`); `FormError` único abaixo do `ul`; a rolagem centraliza a **mensagem**, não o campo (:128-133); "deixe os dois em branco" descreve o servidor — na tela fechar o dia é o interruptor.
- **Evidência**: `shots/016-horarios-erro.png` (segunda "--:--" com borda cinza); `report/celular/14-horarios-erro.png` (mensagem depois de Sábado, segunda duas telas acima); `e2e.md:53`.
- **Recomendação**: `fieldErrors["hours-2"]`; `border-error` + `aria-invalid` no campo vazio; mensagem na linha ("Terça-feira: informe a abertura e o fechamento, ou desligue o dia"); rolar até o input. Trocar a frase.
- **Esforço**: pequeno. **Conflito**: nenhum.

**F23 · ATRITO · média** — "Cor da marca" no fluxo principal da Identidade não muda nada no cardápio, nasce no laranja antigo e não explica para que serve.

- **Tela**: `/painel/negocio`.
- **O que acontece**: únicos consumidores na loja são `manifest.webmanifest/route.ts:24` e `opengraph-image.tsx:18` (D2). Padrão `#c2410c` em `business.ts:115,175` e `schema.ts:75`, contra `#0b8639` em `:464`. Campo sem hint, fora de `<details>` (`business-form.tsx:242-260`), sob o subtítulo "Como o restaurante aparece no topo do cardápio".
- **Evidência**: `shots/010-identidade-vazia.png`; `screens-painel-plataforma.md:32` já decidiu "Avançado" recolhido com hint — não implementado.
- **Recomendação**: fazer o que a referência decidiu; trocar o padrão para `#0b8639`.
- **Esforço**: pequeno. **Conflito**: nenhum (D2 e §1 pedem isso).

**F24 · ATRITO · média** — Na Identidade o "Endereço do cardápio" aceita maiúsculas até o envio (o cadastro formata ao digitar) e não avisa que mudar a URL quebra o QR impresso.

- **Tela**: `/painel/negocio`.
- **O que acontece**: `business-form.tsx:197-212` sem `slugify` no onChange (cadastro tem, `onboarding-form.tsx:86-90`); `business.ts:559-561` só revalida os dois slugs; `slug UNIQUE` sem histórico; `page.tsx:110` → `notFound()` para o antigo. O hint do cadastro diz "Dá para mudar depois", sem custo.
- **Evidência**: `report/shots-negocio/C-slug-maiusculas.png`; SKILL.md "O que não se toca: rotas (há QR codes impressos)".
- **Recomendação**: slugify ao digitar; com o cardápio publicado, hint "Mudar o endereço invalida o QR já impresso e os links compartilhados" (ou confirmação). Mover o campo para Compartilhar fica como ideia — toca D16 nos dois sentidos.
- **Esforço**: pequeno. **Conflito**: D16 só na parte de mover o campo.

**F25 · ATRITO · média** — Identidade só conta como concluída com descrição curta ou logo; "Sobre" e capa não contam, o guia não diz o que falta, e o 🍽️ padrão parece uma logo escolhida.

- **Tela**: `/painel/negocio` e guia.
- **O que acontece**: `identityDone = logo !== '🍽️' || tagline !== ''` (`setup-steps.ts:82-86`); passo pendente não tem linha de resumo (`setup-widget.tsx:135`); `image-upload.tsx:100-101` só considera vazio `''`, então o emoji ganha lápis e lixeira como uma logo real, e remover grava `'🍽️'` de novo (`business.ts:303`).
- **Evidência**: `report/shots-negocio/D-depois-de-salvar-identidade.png` (salvou só o "Sobre", caiu em Entrega com Identidade pendente).
- **Recomendação**: ampliar `identityDone` para capa (e "Sobre"); tratar `'🍽️'` como vazio no quadro da logo.
- **Esforço**: pequeno. **Conflito**: nenhum (D4 protege emoji como dado, mas o campo só aceita imagem).

#### Entrega

**F04 · DEFEITO · média** — No celular o mapa de 256px captura a rolagem de uma aba de 4 telas, e um toque simples move o pino sem confirmação.

- **Tela**: `/painel/negocio/entrega` (celular).
- **O que acontece**: só `scrollWheelZoom: false` (`delivery-radius-map.tsx:98`); `dragging`+`touchZoom` ligados → `touch-action: none` no contêiner (`leaflet.css:72-76`): um dedo sobre o mapa arrasta o mapa. `map.on('click')` seta o ponto (:141) sem confirmação nem endereço reverso. Detalhe corrigido pela lente "vale": o Leaflet suprime `click` depois de arrasto, então só um toque limpo move o pino.
- **Evidência**: `entrega-shots/J-celular-entrega.png` (endereço Consolação, pino em Santana); `shots/046-celular-entrega.png`; aba com 2.699px (4,1 telas).
- **Severidade**: "reproduz" alta, "vale" média. Escolho **média**: o pino e o círculo se movem visivelmente e "Marcar pelo endereço" desfaz com um toque; o dano de dinheiro (taxa por km) só acontece se o lojista não repara e salva. A armadilha de rolagem, porém, é a parte que atinge todo lojista no celular e é barata de resolver.
- **Recomendação**: em toque, `touch-action: pan-y` (mapa move com dois dedos) ou véu "Toque para mexer no mapa"; manter o toque para marcar, mas aumentar o alvo do pino (hoje 16px) e devolver o endereço aproximado do ponto novo (rota `/api/geocodificar`, 1 req/s) ou ao menos "Ponto marcado à mão — não é o endereço acima?". Sheet de tela cheia é demais.
- **Esforço**: médio. **Conflito**: nenhum (memória "raio só informativo" já foi superada pelo próprio código, que cobra por distância).

**F19 · ATRITO · média** — Erro "sem entrega nem retirada": a mesma regra dita três vezes com verbos diferentes, nenhum cartão destacado, e o erro fica na tela depois de corrigir.

- **Tela**: `/painel/negocio/entrega`.
- **O que acontece**: aviso amarelo (`modes.noneWarning`, "Ligue…"), erro vermelho (`actions.noOrderMode`, "Ative…") e faixa genérica (`business-form.tsx:609-627`); `OrderMode` (:710-735) não tem estado `invalid`; `fieldErrors` só muda no próximo envio.
- **Evidência**: `shots/018-entrega-erro-sem-modo.png` (as três); `entrega-shots/D-distancia-sem-ponto.png` (modos marcados, erro ainda na tela); `e2e.md:60-61`.
- **Recomendação**: um bloco só que troca de tom (amarelo → vermelho `role="alert"`); `border-error` nos cartões; limpar ao ligar qualquer modo (estado já é local); um verbo. A faixa genérica pode ficar com texto verdadeiro ("Não foi salvo: ligue a entrega ou a retirada").
- **Esforço**: pequeno. **Conflito**: nenhum (a favor do minimalismo registrado).

**F21 · ATRITO · média** — Dá para publicar sem entrega nem retirada, e a tag "Obrigatório" só aparece no último passo.

- **Tela**: `/painel`, guia, `/painel/negocio/entrega`.
- **O que acontece**: `publishBlocker` só olha WhatsApp e item (`lib/menu-utils.ts:66-70`); `REQUIRED = ['contato','cardapio']` mas Contato nunca fica pendente (cadastro exige WhatsApp); entrega e retirada nascem `enabled:false` (`business.ts:129-140`) — o mesmo estado que a aba recusa salvar. Nuance importante: com os dois desligados a loja **não** fica morta — o cliente cai em modo entrega com "A combinar" e precisa digitar endereço (`whatsapp.ts:29-31`, `store-identity.tsx:24-32`); a copy "não tem como concluir o pedido" está factualmente errada.
- **Evidência**: `shots/009` (tag só no último), `017-entrega-vazia.png`; `persona/p03-previa-vazia.png`.
- **Recomendação**: incluir `'entrega'` em `REQUIRED` e no `publishBlocker` ("Ligue a entrega ou a retirada antes de publicar"), no mesmo lugar onde o bloqueio já vive; tirar `'contato'` (código morto); corrigir `noneWarning` para o que acontece de verdade. Retirada ligada por padrão contraria o comentário "é o lojista quem diz o que faz" e exporia "Retirada" numa dark kitchen — não recomendo sozinha.
- **Esforço**: pequeno. **Conflito**: §1 diz "`contato` e `cardapio` levam a tag Obrigatório (espelham `publishBlocker`)" — a própria justificativa (espelhar) pede que os dois cresçam juntos; vale reabrir.

**F22 · ATRITO · média** — Entrega ligada sem bairro nem ponto salva com sucesso, o guia continua "pendente" sem dizer o que falta, e ninguém explica que o cliente verá "taxa a combinar".

- **Tela**: `/painel/negocio/entrega` e guia.
- **O que acontece**: servidor aceita zonas vazias; `deliveryDone` exige bairros ou raio (`setup-steps.ts:92-100`); passo pendente não tem caption; fieldset sem estado vazio (`business-form.tsx:539-583`); hint "O cliente escolhe o bairro ao finalizar" é enganoso com zero bairros (`use-checkout.ts:69` → `noZones`).
- **Evidência**: `entrega-shots/E-guia-entrega-sem-area.png`, `E-previa-sem-bairro.png`.
- **Recomendação**: motivo na linha do guia ("Falta: bairros atendidos ou área no mapa") e estado vazio de uma linha na lista ("Sem bairros, o cliente vê 'taxa a combinar' e você fecha o valor na conversa"). Banner amarelo ao salvar é dispensável. Aceitar "a combinar" como concluído é pergunta ao dono.
- **Esforço**: pequeno. **Conflito**: nenhum.

**F41 · ATRITO · média** — Linha do bairro sem unidade nem cabeçalho ("6", "30-40 min" soltos) e, no celular, quebrada em duas fileiras com a lixeira solta.

- **Tela**: `/painel/negocio/entrega`.
- **O que acontece**: inputs só com `placeholder`/`aria-label` (`business-form.tsx:544-576`); os campos irmãos dizem "(R$)" no rótulo, a taxa do bairro não. Em 390px `flex-wrap` gera 120px em duas fileiras.
- **Evidência**: `shots/020-entrega-salva.png` ("Consolação | 6 | 30-40 min"); `046-celular-entrega.png`; `report/celular/16-entrega-bairros.png`. É a porta de entrada de F01.
- **Recomendação**: adorno dentro do campo ("R$" à esquerda da taxa, "min" à direita do prazo); no celular, mini-cartão com rótulos pequenos via `TextField` e lixeira no canto. Cabeçalho de colunas fica redundante com o adorno.
- **Esforço**: pequeno. **Conflito**: nenhum.

**F43 · IDEIA · média** — Ordem do bloco de entrega: mínimo, frete grátis e mapa vêm antes da decisão principal ("Como você cobra"); para quem cobra por bairro o mapa só acrescenta uma linha no "Sobre a loja".

- **Tela**: `/painel/negocio/entrega`.
- **O que acontece**: `business-form.tsx:441-486`: mínimo/frete → mapa → cobrança → bairros/distância. O aviso `noPointWarning` diz "Marque o restaurante no mapa **acima**" — admite que a condição vem antes do controle. Raio só aparece ao cliente em `store-about-sheet.tsx:52` (e no JSON-LD).
- **Evidência**: `shots/019-entrega-preenchida.png`; `entrega-shots/F-previa-sobre.png`; `046-celular-entrega.png` (mapa ocupa quase uma tela entre "Frete grátis" e "Como você cobra").
- **Recomendação**: reordenar no mesmo cartão: 1) como cobra + campos da opção; 2) mínimo e frete grátis; 3) área de entrega — obrigatória e aberta em "Por distância", recolhida como opção em "Por bairro". Só trocar a ordem (JSX) é a parte segura; o toggle de recolher é opcional.
- **Esforço**: médio. **Conflito**: nenhum (mapa continua na aba; raio continua informativo).

**F44 · IDEIA · média** — Um único horário por dia: almoço e jantar não cabem.

- **Tela**: `/painel/negocio/horarios`.
- **O que acontece**: formulário lê `hours[day]?.[0]` (`business-form.tsx:99-105`) e o servidor grava uma faixa (`business.ts:214-228`); `WeeklyHours` e `getOpeningStatus` (`lib/hours.ts:181,200`) já aceitam várias. O "apagar a segunda faixa" é latente — hoje nenhum caminho cria duas.
- **Evidência**: `shots/015-horarios-padrao.png`.
- **Recomendação**: AddButton "Adicionar horário" por dia (D23), até duas faixas, lixeira por faixa; `parseHoursForm` lê `hours-{dia}-{n}-open/close`.
- **Esforço**: médio. **Conflito**: nenhum.

#### Cardápio

**F07 · DEFEITO · média** — Grupo de complementos com nome e sem opção some em silêncio ao salvar; o resumo ainda conta o grupo.

- **Tela**: `/painel/cardapio` (Complementos).
- **O que acontece**: `item-form.tsx:179-181` filtra `group.name.trim() && choices.some(...)` antes do envio; o resumo (:252-255) conta só pelo nome; `menu.ts:118` tem `min(1, 'Cada grupo precisa de pelo menos uma opção.')` inalcançável.
- **Evidência**: `shots/026-item-complementos.png` ("4 grupos · … Grupo sem opções") → `028-item-salvo.png` ("3 complementos", captura acima); `e2e.md:105,209`.
- **Severidade**: as duas lentes rebaixaram de alta para **média** — o item salva e a linha mostra "3 complementos"; recuperável reabrindo. Mas é dado perdido sem aviso.
- **Recomendação**: descartar só grupo totalmente vazio; grupo com nome e sem opção vai ao servidor e volta com o erro no bloco (o `open={error('options')}` já existe, :352); resumo conta só o que vai ser salvo.
- **Esforço**: pequeno. **Conflito**: nenhum.

**F08 · ATRITO · média** — Alterações não salvas se perdem sem aviso: trocar de linha, Esc ou Cancelar no editor de item; trocar de aba ou seguir o guia com foto "enviada, salve para aplicar".

- **Tela**: `/painel/cardapio`, `/painel/negocio`.
- **O que acontece**: `openEditor` só faz `setEditing` (`menu-editor.tsx:88-92`) e desmonta o formulário anterior; Esc chama `onClose` direto (`item-form.tsx:283-290`); nenhum `beforeunload|isDirty|dirty` em `src/`; foto enviada e não salva vira órfã (apagada no dia seguinte, `image-cleanup.ts`).
- **Evidência**: `report/cardapio/E-troca-de-linha-perde-edicao.png`; `shots/011-identidade-preenchida.png` (dois "Salve para aplicar." com abas e guia a um toque).
- **Severidade**: "reproduz" média (Esc e Cancelar são intenção explícita), "vale" alta (item completo leva minutos). Escolho **média**: o caso forte é o toque acidental em linha vizinha no celular e a foto na Identidade; Salvar é proeminente.
- **Recomendação**: `dirty` comparando com valores iniciais (o `syncTyped` já observa o form); `ConfirmDialog` "Descartar alterações em “X”?" ao trocar de linha, Esc e nos links internos (abas, guia) com foto enviada; `beforeunload`. Não abrir dois editores (pioraria o celular); não gravar foto no upload (muda "cada aba salva sozinha"). Cancelar explícito pode continuar descartando (D24).
- **Esforço**: médio. **Conflito**: nenhum.

**F26 · ATRITO · média** — Depois de "Adicionar ao cardápio" o foco some: cada item a mais custa um clique extra (e o teclado fecha no celular).

- **Tela**: `/painel/cardapio` (formulário permanente).
- **O que acontece**: `restart` troca a `key` e remonta o form (`menu-editor.tsx:215-224`); `autoFocus={inline && !standing}` (`item-form.tsx:326`) desliga o foco. Reproduzido 3 itens seguidos em desktop e iPhone: `activeElement` = BODY nos três; teclas digitadas depois do salvar foram para o body. O "pulo de rolagem 605→209" só acontece com grupos de complemento abertos (form encolhe).
- **Evidência**: `report/cardapio/verifica-f26-{desktop,mobile}-{1,2,3}.png`, `D-depois-de-salvar.png`.
- **Recomendação**: ao salvar com sucesso no form permanente, `focus({ preventScroll: true })` + `scrollIntoView({ block: 'nearest' })` no Nome recém-montado — dentro do handler do submit (`flushSync`), porque no iOS foco fora do toque não reabre o teclado (SKILL.md armadilha 21).
- **Esforço**: pequeno. **Conflito**: nenhum (§1 registra "nome em foco").

**F27 · ATRITO · média** — "Obrigatório" no tipo "Retirar ingredientes" trava o pedido do cliente.

- **Tela**: `/painel/cardapio` → loja.
- **O que acontece**: checkbox para todos os tipos (`item-form.tsx:391-410`); servidor grava `required` sem distinguir (`menu.ts:236-243`, só zera o preço); `firstMissing` bloqueia "Adicionar" com `chosen.length === 0` (`item-order-panel.tsx:36-42`); helper mostra "escolha pelo menos 1" no grupo de retirar. Agravante: `hasRequiredOptions` tira o quick-add "+" da lista (D5).
- **Evidência**: `report/cardapio/H-retirar-obrigatorio-maximo.png`.
- **Recomendação**: esconder/desabilitar "Obrigatório" para `remove` e forçar `required: false` no servidor (mesmo padrão do preço).
- **Esforço**: pequeno. **Conflito**: nenhum.

**F28 · ATRITO · média** — Não há como reordenar itens dentro da categoria; o item esquecido fica no fim para sempre.

- **Tela**: `/painel/cardapio`.
- **O que acontece**: só `moveCategoryAction` (`menu.ts:98-103`); `ORDER BY position, rowid` com `position` definida só no INSERT (`repositories/menu.ts:21,177`); `updateItem` não toca `position` — trocar de categoria carrega a posição antiga. Contorno (excluir e recriar) perde foto e complementos.
- **Evidência**: `menu-editor.tsx:271-330`; `e2e.md:128` (⋯ só da categoria).
- **Recomendação**: "Mover para cima/baixo" no item reaproveitando `moveCategory`; setas dentro do editor inline é a versão mais enxuta para o celular (a linha já carrega miniatura, nome, preço, Switch e chevron). Arrastar fica para depois.
- **Esforço**: pequeno. **Conflito**: nenhum.

**F42 · ATRITO · média** — Um formulário "Novo item" inteiro aberto em cada categoria vira uma parede de campos vazios.

- **Tela**: `/painel/cardapio`.
- **O que acontece**: `<ItemForm inline standing first>` incondicional por categoria (`menu-editor.tsx:213-225`) + `CategoryForm standing` no fim; ~600px cada. O rodapé `sticky bottom-0` do form em branco flutua sobre Nome/Preço dele mesmo no celular (`shots/044`).
- **Evidência**: `shots/029-cardapio-duas-categorias.png` (2 categorias, 3 itens, duas telas de campos vazios), `030-item-editor-inline.png`, `044-celular-cardapio.png`.
- **Recomendação**: form aberto só na categoria recém-criada (0 itens) e na última que recebeu item; nas demais o AddButton "Adicionar item" que abre no lugar; título "Novo item em Bebidas".
- **Esforço**: médio. **Conflito**: é a **implementação** que diverge de D23 e de `screens-painel-plataforma.md §1` (AddButton no rodapé do card), sem decisão que sustente o form permanente (mesmo commit d53ce39). O dono escolhe: alinhar ao registrado (com a exceção proposta) ou registrar o form permanente — e nesse caso tirar o sticky do form em branco.

**F45 · IDEIA · média** — Complementos iguais precisam ser redigitados item a item: sem "Duplicar item".

- **Tela**: `/painel/cardapio`.
- **O que acontece**: `groups` nasce de `toDrafts(item)` (`item-form.tsx:140`); `replaceItemOptions` por item; nenhum "duplicar" no código. O próprio `sample-menu.json` repete "Ponto da carne" em 5 de 12 itens.
- **Recomendação**: "Duplicar item" no rodapé do editor inline (ao lado de Excluir, item já salvo), criando "… (cópia)" com foto e grupos e abrindo no Nome. Atenção: cópia compartilha `/img/<id>`, `cleanupOrphanImagesLater` precisa contar referências.
- **Esforço**: médio. **Conflito**: nenhum.

**F29 · ATRITO · média** — No celular a barra fixa do formulário de item ocupa duas linhas (133px); com o teclado aberto sobram 128px.

- **Tela**: `/painel/cardapio` (390px).
- **O que acontece**: `flex-wrap` + botões `h-12 px-5` sem variante abaixo de `sm` (`item-form.tsx:542-591`); "Excluir item" cai numa linha própria no editor inline; cabeçalho grudado 103px + barra 133px; `interactiveWidget: resizes-content` (`layout.tsx:446`) encolhe a viewport no Android.
- **Evidência**: `report/celular/08-criar-categoria-x-pilula.png`, `27-teclado-item-descricao.png`; `report/cardapio/N-celular-editor-rodape.png` (Salvar atrás da pílula).
- **Recomendação**: abaixo de `sm`, uma linha: Cancelar/Limpar `size="sm"` (não só ícone, porque "✕" pode ler como fechar), "Excluir item" só lixeira com `sr-only`, principal com `flex-1`. Mantém D24.
- **Esforço**: médio. **Conflito**: nenhum.

**F30 · ATRITO · média** — Alvos de toque pequenos: interruptor "Disponível" de 24px numa linha que abre o editor; "X" de remover opção com 32px.

- **Tela**: `/painel/cardapio` (celular).
- **O que acontece**: `h-6 w-11` sem área extra (`switch.tsx:34`); a linha abre o editor fora de `[role=switch]` (`menu-editor.tsx:288-291`) e foca o nome (teclado sobe); `IconButton size="sm"` sem `hit` (`item-form.tsx:448-454`).
- **Evidência**: `shots/044-celular-cardapio.png`; `elementFromPoint` 4px acima/abaixo → a linha.
- **Recomendação**: `::before` invisível no `Switch` com `inset:-10px 0` (o `hit-44` existente é `inset:-6px`, dá só 36px); `hit` no X. A faixa de 56px excluída é redundante (o `closest` já cobre).
- **Esforço**: pequeno. **Conflito**: nenhum (D5 já manda `hit-44`).

#### Guia (transições)

**F14 · ATRITO · média** — O guia some em silêncio ao completar 5/5 e ninguém diz "agora publique".

- **Tela**: `/painel/cardapio` → `/painel`.
- **O que acontece**: `if (progress.complete || onPreview) return null` (`setup-widget.tsx:62`); `complete` não olha `published`; aba Cardápio não mostra "Rascunho"; "Ver cardápio" só publicado (`layout.tsx:58`). Único lugar que diz que a loja não existe é Compartilhar.
- **Evidência**: `shots/028-item-salvo.png` (captura acima: só o toast, sem guia, sem Rascunho), `034-compartilhar-rascunho.png`; `e2e.md:137` (404 antes de publicar).
- **Recomendação**: estado final do widget enquanto `complete && !published`: "Tudo pronto — Publicar cardápio ›" (leva a `/painel`), some com `published`. Complemento: toast do primeiro item com ação "Publicar" (o `ToastProvider` já aceita `action`).
- **Esforço**: pequeno. **Conflito**: §1 "Publicar não é passo dele" — a lista de cinco continua; reabrir só o estado final.

**F16 · ATRITO · média** — No celular o guia nasce expandido, de margem a margem, cobrindo 58–63% da tela sem scrim nem arrastar-para-fechar.

- **Tela**: `/painel/cardapio` e `/painel` (390px).
- **O que acontece**: `left-4` no celular + `max-h-[min(40rem,80dvh)]` (`setup-widget.tsx:79-82,102`); nasce aberto sem condição de largura (`setup-collapsed.ts:55-59`); único fechamento é o chevron de 36px; tocar num passo não recolhe. Efeito colateral: recolher desliga o "Salvar e continuar" (F13). O E2E mediu "guia visível: false" porque a conta estava 5/5.
- **Evidência**: `report-cadastro/shots/004-primeira-tela-celular.png` (só o título "Cardápio" sobra); `report/celular/02-painel-guia-aberto.png` (cobre "Publicar cardápio"); `guia.json` 4.cardapio.guia_cobre_pct_viewport=58.
- **Recomendação**: abaixo de `lg`, nascer como pílula (por breakpoint, hidratação-segura — o servidor renderiza aberto) e abrir como `BottomSheet` nativo (já existe em `ui/bottom-sheet.tsx`) com scrim e arrastar; recolher ao tocar num passo. Desacoplar o encadeamento do estado recolhido no celular.
- **Esforço**: médio. **Conflito**: §1 "Flutua, não ocupa" — em 390px ocupa; o dono já abriu exceção para `/painel/negocio`; reabrir só abaixo de `lg`.

#### Publicar e loja

**F15 · ATRITO · média** — Em rascunho, Compartilhar entrega link, botão de compartilhar e QR ativos sem avisar que o endereço responde 404.

- **Tela**: `/painel`.
- **O que acontece**: só "Abrir" depende de `published` (`share-panel.tsx:69-89`); a frase "Publique para liberar o link público" existe só na prévia (`painel.json:87`); texto de apoio incentiva "Para a bio do Instagram…".
- **Evidência**: `shots/034-compartilhar-rascunho.png`; `e2e.md:137`.
- **Recomendação**: `Banner neutral` de uma linha em rascunho ("O link e o QR só abrem depois de publicar"); Copiar/Compartilhar podem continuar ativos (uso legítimo: arte da embalagem) com o mesmo aviso. Tag diz o estado, a frase diz a consequência (D13).
- **Esforço**: pequeno. **Conflito**: nenhum.

**F31 · DEFEITO · média** — No celular, o motivo do bloqueio de "Publicar cardápio" aparece cortado pela borda esquerda.

- **Tela**: `/painel` (390px).
- **O que acontece**: `align="end"` (`publish-toggle.tsx:42`) → `right-0` + `max-w-64` (`tooltip.tsx:17,81`); botão em x=16, bolha nasce em x≈−52: "…ne pelo menos um item disponível / …dápio antes de publicar." Único uso de Tooltip no app.
- **Evidência**: `report/shots-publicar/05-bloqueado-celular.png`.
- **Recomendação**: `max-w-[calc(100vw-2rem)]` e alinhar ao início abaixo de `sm` (ou `align="start"` no PublishToggle). Se o plano de §1:36 (Switch + texto de estado) for adiante, o motivo vira texto fixo e o tooltip some — decidir antes.
- **Esforço**: pequeno. **Conflito**: nenhum.

**F32 · ATRITO · média** — "Despublicar" é um clique, sem confirmação nem retorno, e derruba o QR das mesas na hora.

- **Tela**: `/painel` publicado.
- **O que acontece**: `<form action={togglePublishAction}>` direto (`publish-toggle.tsx:50-56`); ação devolve `void` (`business.ts:570-583`). Excluir um item (dano menor) confirma e explica; despublicar não. Agravante: com itens esgotados, republicar fica bloqueado (`e2e.md:167`) — o QR fica em 404 até resolver o cardápio.
- **Evidência**: `shots/043-celular-painel.png`; sonda: dialog=0, toasts=[], status 404.
- **Recomendação**: `ConfirmDialog` "Despublicar “{nome}”? O link e o QR param de abrir na hora. Dá para publicar de novo quando quiser." (D24); ação devolve `{ success }` e toast nos dois sentidos (disparar depois do `onClose`, armadilha 8).
- **Esforço**: pequeno. **Conflito**: nenhum (`components.md:186` registra que ficou Button).

**F33 · ATRITO · média** — Cliente que abre um cardápio despublicado cai num 404 genérico que vende o Menu Online.

- **Tela**: `/r/<slug>` despublicado.
- **O que acontece**: `!published` → `missing` (`store-data.ts:41`), igual a slug inventado → 404 com "Criar meu cardápio no Menu Online". `StoreUnavailable` (assinatura vencida) já é a tela irmã certa, com nome do negócio e sem CTA de venda.
- **Evidência**: `report/shots-publicar/10-404-despublicado-celular.png`, `03-404-rascunho.png`.
- **Recomendação**: status `unpublished` no `lookupStore` (ou reaproveitar `unavailable`) → tela irmã "Cardápio fora do ar no momento", `noIndex`; 404 genérico só para slug inexistente.
- **Esforço**: médio (pequeno na prática: tela e copy prontas). **Conflito**: nenhum.

**F34 · DEFEITO · média** — No desktop, o "‹" da página do prato cobre o título quando o painel rola por dentro (loja e prévia); sem foto, cobre já no topo.

- **Tela**: `/r/<slug>/item/<item>`, `/painel/previa/item/<item>` (≥lg).
- **O que acontece**: botão `lg:absolute lg:left-4 lg:top-4` no `<article>` (`item-hero.tsx:78`), quem rola é o filho (`item-detail.tsx:48`); barra com o nome é `lg:hidden` (:60); sem foto o espaçador é `lg:h-4`, então o h1 nasce sob o círculo.
- **Evidência**: `shots/039-loja-item.png` ("…asanha à Bolonhesa"), `report/shots-publicar/11-prato-desktop-titulo-sob-o-voltar.png`, `12-previa-prato-rolado.png` ("…do agora").
- **Recomendação**: barra compacta com o nome também no desktop (`sticky top-0` dentro da coluna que rola) — só `sticky` no botão não resolve o caso rolado; ou espaçador `lg:h-16` sem foto e botão rolando junto.
- **Esforço**: pequeno. **Conflito**: nenhum (completa D27 no desktop).

**F35 · ATRITO · média** — "Baixar QR code" entrega um .svg, que o lojista no celular não consegue abrir, mandar por WhatsApp nem imprimir com facilidade.

- **Tela**: `/painel`.
- **O que acontece**: `QRCode.toString(url, { type: 'svg' })` e `download="cardapio-qrcode.svg"` (`qr-code.tsx:9-27`; `painel.json:101`). Nenhum PNG/PDF no app.
- **Evidência**: `shots/035-compartilhar-publicado.png` ("para imprimir nas mesas e embalagens").
- **Recomendação**: PNG 1024px por rota `/painel/qr.png` como download padrão; SVG como opção discreta. PDF A5 "Peça pelo QR" fica como ideia.
- **Esforço**: pequeno. **Conflito**: nenhum.

**F37 · DEFEITO · média** — Formulários de negócio sem `aria-invalid`/`aria-describedby`, erro anunciado duas vezes, foco de texto quase invisível, "Link copiado" fora de região viva.

- **Tela**: `/painel/negocio/*`, `/painel/comecar`, `/painel`.
- **O que acontece**: `Field` local (`business-form.tsx:645-674`) não liga erro ao input; cada erro é `role="alert"` e a faixa também (N+1 anúncios); `inputClass` zera `outline` e só troca borda de 1px (:766-770); `copy-link.tsx:24-33` troca só o rótulo; §1:30 pede toast "Link copiado" e `e2e.md:143` confirma que não apareceu. `FieldShell` já faz tudo certo (`ui/text-field.tsx:117-119`).
- **Recomendação**: migrar business-form (e cadastro, F36) para `TextField`/`FieldShell` — resolve F06, F36 e F37 de uma vez; `role="alert"` só na faixa; `focus-visible:ring-2 ring-primary/40` (o `soft` já usa; só teclado, não muda o toque); toast no copiar.
- **Esforço**: médio. **Conflito**: nenhum (comentário "Sem anel difuso" não é decisão; SKILL.md lista foco visível como conquista a preservar).

**F55 · IDEIA · média (parte) / baixa (parte)** — Os três tipos de complemento pedem uma linha de explicação, e "Escolher uma" deveria nascer obrigatório.

- **Tela**: `/painel/cardapio`.
- **O que acontece**: `addGroup` cria `type:'single', required:false` (`item-form.tsx:200-211`); select sem ajuda (:380-390); todo `multi` vira `StepperRow` (`option-group.tsx:109-119`) — não existe "várias sem repetir".
- **Severidade**: "reproduz" baixa, "vale" média. **Média** para o padrão obrigatório: por D5 um "Tamanho" opcional ganha quick-add "+" e o cliente pede a pizza sem tamanho sem nem ver o grupo — erro de pedido no coração do produto, uma linha de correção. **Baixa** para a linha de ajuda (os placeholders por tipo já explicam; contraria o minimalismo, SKILL.md:26). Quarto tipo "várias sem contador" fica para depois.
- **Recomendação**: `required: true` ao criar/trocar para "Escolher uma"; se houver ajuda, dentro do rótulo do select ("Escolher uma (tamanho, ponto)").
- **Esforço**: pequeno. **Conflito**: minimalismo só para a linha de ajuda.

### 4.3 Prioridade BAIXA

- **F20 · ATRITO · média→baixa como item isolado** — Erro do envio anterior (e "Alterações salvas") continuam na tela depois de mexer no formulário, em todos os formulários. `state` do `useActionState` só muda no próximo envio (`onboarding-form.tsx:99-103`; `business-form.tsx:124-127,627-633`; `item-form.tsx:160`). Evidência: `report/feedback/fb-03-erro-persistente.png`, `shots/007` (slug novo + erro antigo), `026` (nome válido com erro), `report/shots-negocio/F-horarios-corrigido-sem-salvar.png`; `e2e.md:205-207`. O "Alterações salvas" persistente é só no business-form (item usa toast; cadastro redireciona). Recomendação: esconder erro do campo e faixa ao primeiro `input` (o `syncTyped` já existe); esconder o sucesso ao primeiro `input`. Checar slug no blur com `isSlugAvailable` fica como ideia. Esforço pequeno. As duas lentes deram média; classifico aqui porque a migração para `TextField` (F37) é o momento natural de resolver.
- **F47 · ATRITO · baixa** — "Endereço" quer dizer link no cadastro e na Identidade, rua na aba de entrega, e Compartilhar chama de "Link do cardápio" (`painel.json:70,73,119,147,170,365-368,107`; `shots/007`, `017`). Atenuante: o prefixo `/r/` dentro do input e a derivação do nome evitam digitar a rua. Recomendação: "Link do cardápio" em todo lugar, erros "Este link já está em uso"; sem repetir o prefixo na dica (D13). Esforço pequeno.
- **F48 · ATRITO · baixa** — Três nomes para a mesma aba ("Endereço e entrega" / "Endereço, entrega e retirada" / "Endereço e formas de entrega", mais "Entrega e retirada — dados do negócio" no metadata) e "frete" no painel contra "entrega" na loja (`painel.json:12,49,50,119,191-192`; `store.json:42,102`; também `platform.json:105`). Um nome só e "Entrega grátis acima de (R$)". Esforço pequeno.
- **F49 · ATRITO · baixa** — Cadastro vazio devolve dois erros para uma omissão (nome e endereço derivado); `business.ts:96` faz `slugify('')`. `shots/005`. Suprimir o erro do slug quando veio vazio e o nome falhou. Esforço pequeno.
- **F50 · ATRITO · baixa** — Endereço apagado no cadastro é aceito em silêncio (`slugTouched` nunca volta, `onboarding-form.tsx:44-46`; servidor cai em `slugify(nome)`, `business.ts:96`); nomes >40 chars cortados no meio da palavra (`repositories/businesses.ts:20-28`). Voltar a derivar ao esvaziar; cortar no último hífen. Esforço pequeno.
- **F51 · ATRITO · baixa** — "Cidade (opcional)" sem explicação é o quarto campo de um cadastro que se anuncia com três (`onboarding-form.tsx:125-131`; sem `cityHint`). Alimenta título/keywords/OG da loja (`r/[slug]/page.tsx:69-95`, `opengraph-image.tsx:22`). Não cortar (perde SEO para quem publica sem endereço); hint "Aparece no Google e no link compartilhado" e corrigir o "três". Esforço pequeno.
- **F52 · ATRITO · baixa** — "Pedido mínimo R$ 25,00" no topo da loja também com Retirada selecionada (`store-status.tsx:22,47` não lê o modo; `use-checkout.ts:65` só aplica à entrega; a sacola já diz "Pedido mínimo para entrega", `store.json:119,158`). Usar a mesma copy no topo. Esforço pequeno. Conflito: nenhum (D25 fixa a linha; só refina a copy).
- **F56 · ATRITO · baixa** — Três convenções para "opcional" no mesmo formulário ("_", "(opcional)", "Opcional.") (`painel.json:263,315`; `shots/027`). Deixar só o "_". A metade "Esgotado vs Indisponível" **não vale**: D5 fixa "Indisponível" na loja e §1 a Tag "Esgotado" no painel, com lógica (ação do lojista vs estado neutro para o cliente) — não reabrir.
- **F57 · ATRITO · baixa** — Em rascunho, Compartilhar não tem caminho para a prévia (só a aba Cardápio; "Ver cardápio" só publicado, `layout.tsx:58`; `share-panel.tsx` só tem "Abrir" publicado). `CustomerViewLink` secundário ao lado de "Publicar cardápio" em rascunho, sumindo depois. Esforço pequeno. Conflito: nenhum (D16: ver o que vai ser publicado serve ao objetivo da tela).
- **F58 · ATRITO · baixa** — Abas do painel no celular: "Conta" e metade de "Dados do negócio" fora da tela sem sinal (548px em 374, `scrollbar-none`, sem `mask-image`, `dashboard-nav.tsx:38-40`; `shots/043`). Degradê de saída + "Negócio" abaixo de `sm`. Barra inferior contraria §1 Casca e disputaria o rodapé com guia e barra de salvar — não reabrir.
- **F59 · ATRITO · baixa** — Três h1 "Conta" (nosso + `userProfile.navbar.title` + `headerTitle__account`, `@clerk/localizations pt-BR:2092,2164`; `shots/049`, `047`). Renomear as chaves do Clerk na localização já sobrescrita (`layout.tsx:143-156`); **não** esconder o `navbar` inteiro (leva a Segurança). Correção: o menu "≡" tem duas opções (Perfil, Segurança), não uma. Auth é do dono (D14) — combinar.
- **F60 · ATRITO · baixa** — `.cl-cardBox` com 704px fixos e ~380px em branco antes de Assinatura, Idioma e Excluir conta (`conta-sonda.json` S1; `shots/049`; com a altura solta o perfil fica em 353px). Soltar `cardBox/scrollBox/pageScrollBox` para `auto` — no `appearance` global de `layout.tsx` (padrão da casa, D14), numa chave específica do perfil para não afetar entrar/criar conta.
- **F61 · IDEIA · baixa** — Foto do item ocupa uma linha inteira no celular, com ~200px vazios (`item-form.tsx:303`, `sm:grid-cols-[8rem_…]`; `report/celular/03`). Foto ao lado só do Nome no celular, Preço abaixo (a 390px, `6rem` + Nome + Preço na mesma linha aperta demais).
- **F63 · ATRITO · baixa** — "Foto enviada. Salve para aplicar." sob um botão que diz "Adicionar ao cardápio" (texto único em `painel.json:245-246`, `image-field.tsx:177`; `shots/026`). Variante por contexto que ainda diga que não está gravada ("entra quando você adicionar o item") — protege do Cancelar. Na Identidade o verbo bate.
- **F64 · ATRITO · baixa** — Conta isenta lê "Sua assinatura é cancelada" e "Gerenciar assinatura" leva a "Nada a fazer por aqui" (`account-forms.tsx:57`; `conta/page.tsx:52-56`). Só ocorre com `BILLING_MODE=off` ou `billing_exempt=1` — contas do dono. Condicionar bullet e botão a `!access.exempt`.
- **F66 · ATRITO · baixa** — O seletor diz "o painel", mas o cookie `NEXT_LOCALE` muda o site inteiro, inclusive `/r/<slug>` para o lojista (`account.json:12`; `pw/report/shots/006-completa-loja-en.png`). Ajustar a linha de apoio; não fixar a prévia em pt-BR.
- **F67 · ATRITO · baixa** — `/entrar` do Clerk diz "Registre-se" onde o produto diz "Criar conta" (`pw/report/shots/008`). Sobrescrever `signIn.start.actionText/actionLink` em `clerkLocalization['pt-BR']` — mesmo padrão das sobrescritas já existentes.
- **F68 · IDEIA · baixa** — `/entrar?proximo=…` já logado ignora o destino (`entrar/page.tsx:33-35` redireciona antes de ler `searchParams`; `conta-completa.json` B5). Ler antes e `redirect(next ?? '/painel')` com a mesma validação. Só acontece por aba antiga/histórico. D14: deixar para o dono aplicar.

### 4.4 IDEIAS (sem prioridade de correção)

- **F53 · baixa** — Não existe "taxa única": quem cobra R$ 5 para a cidade inteira lista bairros (e o cliente ainda escolhe num select com "Meu bairro não está na lista") ou usa distância com 0/km (mapa + CEP obrigatórios). O ramo `flatPricing` (`delivery.ts:90`, `ui.json:64`) já existe. Terceira opção no SegmentedControl gravada como bairro padrão, pulando o select no checkout. Esforço médio.
- **F54 · baixa** — CEP não preenche o endereço do restaurante, embora `/api/cep` (ViaCEP + Nominatim) já devolva rua/bairro/cidade/UF + lat/lng para o cliente. CEP como primeiro campo, autopreencher deixando o número (é "Rua e número" num campo só), mapa/"Marcar pelo endereço" como já é; rota tem limite de 20/10min por IP, folgado para o painel. Esforço médio.
- F43, F44, F45 (acima, em média) são ideias com impacto real e entraram na fila por isso.

---

## 5. A disposição ideal do fluxo

Princípio: ordenar pelo que **bloqueia o cliente de pedir**, não pela ordem das abas. E uma regra só de "próximo passo" — `setupProgress().next` — que decide o redirect pós-cadastro, o passo atual do guia e o destino de "Salvar e continuar".

### O que fica

- Cadastro em `/painel/comecar` com nome, link e WhatsApp (cidade com hint, F51). Em produção, a assinatura antes (decisão registrada, F40 refutado).
- Chegada em `/painel/cardapio` (`business.ts:150` já está certo).
- As quatro abas de Dados do negócio e o cardápio em uma tela (D16, "Cardápio em uma tela").
- O guia em formato Stripe, flutuante no desktop, com progresso derivado do gravado.
- Publicar fora da lista contada, morando em Compartilhar.

### O que muda

| Ordem hoje (`SETUP_ORDER`) | Ordem proposta                                           | Por quê                                                                                                                                                   |
| -------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Identidade              | 1. **Primeiro item no cardápio** (obrigatório)           | É o que o lojista veio fazer, o único bloqueio de publicar, e é onde ele já está. O CTA "Continuar configuração" passa a apontar para a tela atual (F11). |
| 2. WhatsApp                | 2. **Endereço e formas de entrega**                      | Sem um modo ligado o pedido não fecha (F21); entra em `REQUIRED` e no `publishBlocker`.                                                                   |
| 3. Horários                | 3. **Horário de funcionamento — confira o sugerido**     | Nasce pendente com 18h–23h pré-preenchido no formulário, não gravado (F03). A loja abre e fecha por ele.                                                  |
| 4. Entrega                 | 4. **Identidade** (logo, descrição, capa)                | Polimento; pode vir depois de estar no ar; é o que mais consome tempo (uploads). Cor da marca vai para "Avançado" (F23).                                  |
| 5. Cardápio                | 5. **Estado final: "Tudo pronto — Publicar cardápio ›"** | Some com `published` (F14).                                                                                                                               |
| —                          | WhatsApp sai da lista                                    | Já vem do cadastro e nunca fica pendente (F21). Se um dia faltar, o `publishBlocker` cobre.                                                               |

Encadeamento resultante, linear e sem beco:

1. Cadastro → `/painel/cardapio`, guia **recolhido em pílula** no celular (F16) e sem cobrir a coluna no desktop (F02). O estado vazio já diz "Comece pela primeira categoria".
2. Primeiro item salvo → toast "Item adicionado. Próximo: Endereço e entrega" com ação, e o guia avança.
3. Entrega → "Salvar e ir para Horários ›" (rótulo ou toast com destino, F12), confirmação que sobrevive à navegação.
4. Horários → "Salvar e ir para Identidade ›".
5. Identidade → "Salvar e publicar ›" leva a `/painel` (Compartilhar), onde o guia mostra o estado final e o botão "Publicar cardápio" está ao lado de "Ver como o cliente vê" (F57).
6. Publicar com confirmação/toast (F32); copiar link; baixar QR em PNG (F35).

Com isso a persona com pressa chega ao "No ar" em **6 telas** (hoje 8, em zigue-zague), e quem quiser pular Identidade pode — ela não bloqueia.

### Conciliação com D16 e com `nextPendingSection`

`setup-steps.ts:181-186` exclui o cardápio do encadeamento para "não trocar de assunto no meio do negócio". A proposta respeita isso: dentro de Dados do negócio o encadeamento continua entre abas (Entrega → Horários → Identidade); o salto para fora do bloco acontece só nas pontas (entrada pelo cardápio, saída para Compartilhar). O encadeamento passa a valer enquanto `!progress.complete`, independente da pílula (F13), porque recolher a lista não é desistir de terminar.

### O que custa

- `SETUP_ORDER` reordenada e `next` preferindo `required` — pequeno (`setup-steps.ts`).
- `hours` vazio no cadastro + pré-preenchimento no form — pequeno.
- `'entrega'` em `REQUIRED`/`publishBlocker` + copy — pequeno.
- Estado final do widget + toast com ação — pequeno.
- Guia reservando espaço (desktop) e pílula/BottomSheet (celular) — médio, um lugar só (slot `floating`).
- Toast antes do `router.push` + rótulo com destino — pequeno.
- Reabrir duas linhas de `screens-painel-plataforma.md §1` (ordem "negócio primeiro, cardápio por último"; "encadeia só com guia aberto") e registrar a nova ordem. O formato Stripe, o guia no canto e "uma tela, um objetivo" ficam.

Se o dono preferir manter Dados do negócio antes do cardápio: ao menos inverter dentro do bloco (Entrega → Horários → Identidade), incluir o cardápio como último salto do "Salvar e continuar" e dar ao guia o estado final.

---

## 6. O que foi descartado na verificação

- **F39** (senha exige 15+ sem avisar) — o Clerk mostra "Sua senha deve conter 15 ou mais caracteres" ao vivo na primeira tecla (`report-cadastro/shots/verifica-f39-blur.png`); a régua de 15 é configuração da instância (D14) — pergunta ao dono, não defeito.
- **F40** (cobrança antes do nome do restaurante em produção) — é a decisão registrada de 2026-09-22 ("paywall na entrada do painel", "sem grátis nem trial"); a landing já vende o preço. Sobra só a meta description "Sem cartão de crédito" (verdadeira, mas soa a trial) — ajuste de copy.
- **F46** (raiz do painel é Compartilhar, "tela morta") — o cadastro cai em `/painel/cardapio`, o guia flutua também em `/painel` e o botão apagado tem o motivo; hospedar a lista inline duplicaria o widget e contraria D16.
- **F62** (aba Contato "sem nada a fazer") — o encadeamento pula a aba já concluída e o rótulo já diz "WhatsApp que recebe os pedidos"; wa.me consigo mesmo não prova nada — o teste real é um pedido pela prévia.
- **F65** (sem restaurante, só o logo volta ao cadastro) — em produção `/painel/assinatura` já mostra "Cadastrar meu restaurante" no estado ativo; o furo é só no ramo isento (`BILLING_MODE=off`), contas do dono.
- **F69** ("Excluir conta definitivamente" em verde) — a frase digitada é o guarda, não a cor; `danger` cria estilo para um botão e reabre D2 sem argumento novo.
- **F70** (e-mail truncado na barra; nome do restaurante "em lugar nenhum") — o nome está no título de Compartilhar e em Conta; §1 já decide e-mail na casca e nome no conteúdo; o corte feio é artefato do e-mail de teste.

---

## 7. O que o teste não cobriu

- **Cobrança**: `BILLING_MODE=off` em todo o teste. Nada de `/painel/assinatura`, Pix, webhook do Asaas, cartão, assinatura vencida (`StoreUnavailable`), cancelamento. A ordem real em produção (criar conta → pagar → cadastrar) não foi percorrida com cobrança ligada — vale rodar uma vez.
- **Webhook do Clerk** (`user.deleted`): não verificado se `CLERK_WEBHOOK_SIGNING_SECRET` está na Vercel (F10 depende disso).
- **E-mail real**: contas `+clerk_test`, código fixo; nenhum e-mail de verificação, recuperação de senha ou OAuth Google.
- **Drag-and-drop** de imagem e **HEIC** do iPhone (só a mensagem de erro existe no código); fotos grandes (>12 MB) e a redução no navegador com conexão lenta.
- **Android real / iOS real**: celular foi emulação a 390px no Chromium; teclado virtual simulado por viewport de 364px; toque longo, arrastar o pino no mapa e gesto de dois dedos não testados; foco programático no iOS (F26) só previsto.
- **Zoom/tamanho de fonte do sistema**, leitor de tela real (VoiceOver/TalkBack) — a11y foi só por atributos no DOM.
- **Cardápio grande**: máximo de 2 categorias e 2 itens; nada de 30 itens, 8 categorias, muitas fotos (peso da página do painel e da loja).
- **Concorrência**: duas abas do painel editando o mesmo item; edição enquanto um cliente pede.
- **Pedido de ponta a ponta no WhatsApp**: o E2E chegou ao checkout, não ao envio da mensagem nem ao número do lojista.
- **Múltiplas faixas de horário, fuso e virada de meia-noite** na loja (só o texto "aceitos" foi lido).
- **Cobrança por distância no checkout do cliente** (CEP → Nominatim → taxa) e endereço fora do raio.
- **Idioma inglês na loja pública para clientes** (só o lojista foi visto em inglês).
- **SEO/OG**: imagem de compartilhamento com a cor da marca, manifest, instalação como app.
- **Tempo humano**: os tempos do relatório são do script; não houve teste com lojista real.
