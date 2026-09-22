# Telas do cliente — loja, item, sacola, finalizar, enviado

Anatomia do app do consumidor do iFood aplicada ao fluxo do MenuQR. A estrutura vem de conhecimento público do app (ver `sources.md`); os primitivos citados estão em `components.md` e os textos em `copy.md`.

## Sumário
1. Loja / cardápio
2. Busca no cardápio
3. Linha de item e quick-add
4. Página do item
5. Sacola
6. Finalizar pedido
7. Pedido enviado
8. Estados (fechada, indisponível, vazio, carregando, erro)
9. Desktop

## 1. Loja / cardápio — `/r/[slug]`

De cima para baixo:

1. **App bar** (56px, branca, sticky). Direita: `IconButton` de busca, de compartilhar e da sacola (com badge). No centro, o nome da loja — invisível enquanto o cabeçalho grande está na tela, aparece com fade quando ele sai. Sem blur, sem sombra; só `border-b` depois de rolar.
2. **Cabeçalho da loja** (`px-4 pt-4`):
   - capa opcional em 16:9, sem raio, colada no topo;
   - `Avatar` de 56px + nome em `text-h6 font-bold` + `ChevronRight` — a linha inteira abre o sheet "Sobre a loja";
   - tagline em `text-caption text-gray-600`, sempre visível;
   - "Pedido mínimo R$ 25,00" em `text-caption text-gray-600` quando houver;
   - faixa de entrega num `Card` fino: `Bike` "Entrega • 30-45 min • R$ 5,00" (a zona mais barata; "Grátis" em `text-positive`) e `Store` "Retirada • 20-30 min" quando a retirada está ligada;
   - status: ponto `bg-positive` + "Aberto • Fecha às 23:00", ou cinza "Fechado • Abre às 18:00". Enquanto não hidrata, um `Skeleton` de uma linha.
3. **Banner promocional** quando `freeAbove > 0`: `Banner tone="promo"` com `Bike` — "Entrega grátis em pedidos acima de R$ 90,00".
4. **Tabs de categoria**, sticky logo abaixo da app bar: só texto (o emoji da categoria não entra aqui), ativa em vermelho com traço deslizante, sempre centralizada, sincronizada com a rolagem.
5. **Destaques** (opcional, se houver itens com tag de destaque): carrossel horizontal `snap-x scrollbar-none` de cards verticais de 140px — foto 1:1 `rounded-sm`, nome em duas linhas, preço.
6. **Seções**: título `text-subtitle font-bold` (com o emoji da categoria antes do nome, se o lojista definiu), descrição `text-body2 text-gray-600`, lista de linhas de item. Entre seções, `Divider thick`. Sem contagem de itens.
7. **Informações da loja** no fim, sobre `bg-gray-50`: Endereço, Horário de funcionamento, Entrega, Formas de pagamento, em `text-body2`; crédito da plataforma em `text-caption`.
8. **Barra da sacola** fixa no rodapé quando há itens.

Sheet "Sobre a loja": `BottomSheet title="Sobre a loja"` com descrição, endereço (`MapPin`), horários da semana (`Clock`, o dia de hoje em `font-semibold`), formas de pagamento e contato (`Phone` para telefone e WhatsApp, `AtSign` para o Instagram — o Lucide não tem ícones de marca). É o mesmo conteúdo do rodapé, ao alcance do topo.

## 2. Busca no cardápio

- O ícone de busca da app bar liga `searchOpen`. A linha das tabs dá lugar à `SearchBar` com foco automático e um "Cancelar" em texto vermelho.
- O filtro é o `normalize()` que já existe; o parâmetro `?busca=` continua funcionando.
- Resultados numa lista única de linhas de item, dentro da região `aria-live="polite"` atual, com "{n} itens encontrados" em `text-caption`.
- Sem resultado: `EmptyState` com `SearchX` — "Nenhum item encontrado para “{termo}”".

## 3. Linha de item e quick-add

A unidade mais repetida da interface; é ela que dá a cara de iFood.

- Linha inteira clicável (`Link`), `flex items-start gap-3 py-4`, `border-b border-gray-200`, `active:bg-gray-50`.
- Esquerda: nome `text-body1 font-semibold text-gray-700 line-clamp-2`; descrição `text-body2 text-gray-600 line-clamp-2`; `Price` em `text-body2 font-semibold`; tags com `Tag`.
- Direita: foto de 88px (`sm:` 96) `rounded-sm object-cover`. Se a imagem do item for emoji, tile `bg-gray-100` com o emoji centralizado. Se não houver imagem nenhuma, a coluna some e a linha fica só texto — é assim no iFood.
- **Quick-add** (funcionalidade mantida, no padrão do iFood Mercado): `IconButton variant="raised" size="sm"` com `Plus` vermelho, sobreposto ao canto inferior direito da foto (ou alinhado à direita do texto quando não há foto). Depois de adicionar, o "+" vira um `Stepper size="sm"` no mesmo lugar, ligado à linha da sacola daquele item sem opções; a lixeira aparece na quantidade 1.
- Item com opção obrigatória: o "+" leva à página do item (regra atual, `hasRequiredOptions`). Item com opções não obrigatórias: helper "personalizável" em `text-caption text-gray-600` ao lado do preço.
- O "+" fica fora do `Link` (irmão absoluto dentro do `<li>`), como hoje, para o clique não navegar.

## 4. Página do item — `/r/[slug]/item/[item]`

**Referência: captura do app real de 2026-09-22 (ver `sources.md`).** O que está abaixo foi conferido contra ela; o que o modelo de dados do MenuQR não tem (miniatura por opção, quantidade por opção, preço promocional, avaliação, "Denunciar item") fica de fora até existir.

- Foto hero `aspect-4/3` de borda a borda, sem raio. Sobre ela, no canto superior esquerdo, o botão de voltar: círculo escuro (`bg-gray-800/80 text-white`) — sobre foto o iFood usa escuro, não branco. Sem foto: só a app bar comum com voltar.
- **Chip da loja** sobreposto ao pé da foto (`-mt-6 mx-4`): `Card padding="sm"` com `shadow-medium`, `Avatar` 40 + nome `text-body2 font-semibold` + linha `text-caption text-gray-600` "57-72 min • Grátis" (prazo da zona mais barata; taxa zero ou entrega grátis em `text-positive font-semibold`). Sem avaliação: o MenuQR não tem.
- **App bar que aparece ao rolar** (`lg:hidden`): branca, 56px, `ChevronLeft` + nome do item truncado; entra com fade quando a foto sai da tela (sentinela + `IntersectionObserver`).
- **Cabeçalho de grupo é uma faixa cinza sticky** (`sticky top-(--app-bar-height) bg-gray-50 px-4 py-3`), não um título solto: nome `text-body1 font-semibold` + helper `text-caption text-gray-600` embaixo; à direita `Tag tone="dark"` OBRIGATÓRIO enquanto falta escolher, `CircleCheck` em `text-positive` quando satisfeito, nada quando é opcional e vazio.
- **Controle da opção fica à direita**, não à esquerda: múltipla escolha mostra um `Plus` vermelho (24px) que vira círculo vermelho com check quando marcada; escolha única mostra o rádio (22px, borda `gray-300`, marcado `border-primary` com ponto vermelho). O preço da opção vai em `text-caption text-gray-600` **abaixo** do nome ("+ R$ 3,99"), não ao lado. A linha inteira é o `<label>`, `min-h-14`, divisor `border-gray-200`. Ao atingir o máximo, as não marcadas ficam `opacity-40`.
- "Alguma observação?": título `text-body1 font-semibold` com `MessageSquare` 20px à esquerda e o contador `0/140` em `text-caption text-gray-600` à direita, na mesma linha; `textarea` com borda `gray-300`, raio 8, `min-h-24`, placeholder "Ex: tirar a cebola, maionese à parte etc.".
- **Sem cabeçalho nem rodapé da loja no celular** (`HideOnItem` e o `hidden lg:block` do `StoreHeader`): a foto começa no topo, a barra de adicionar fecha a tela. No desktop o cabeçalho da loja fica e o item vira um painel centrado.
- **Barra inferior**: `Stepper` (mínimo 1, menos cinza e mais vermelho) + `Button className="min-w-0 flex-1"` "Adicionar" com o total à direita (não use `fullWidth` ao lado do stepper: `w-full` dentro de flex estoura a barra). **Desabilitado fica cinza mas continua mostrando o preço** — é o selo OBRIGATÓRIO no grupo que explica o porquê, sem texto extra.
- Nome `text-subtitle font-bold` (o `h1`), descrição `text-body2 text-gray-600`; entrega: "Entrega grátis" em `text-caption font-semibold text-positive` + "em pedidos acima de R$ 90,00" em `text-caption text-gray-600` (ou "Pedido mínimo R$ 25,00" quando não há grátis); `Price` em `text-subtitle font-bold`; uma linha `text-caption text-gray-600` com "Serve 1 pessoa • 720 kcal • Contém: glúten, leite".
- Helpers dos grupos: escolha única "Escolha 1 opção"; múltipla obrigatória "Escolha de 1 a N" ("Escolha pelo menos 1" sem máximo); múltipla opcional "Escolha até N opções" ("Escolha quantas quiser" sem máximo).
- Grupo obrigatório **não vem pré-selecionado**: a escolha é da pessoa, e o botão só libera quando ela escolhe.
- Ao adicionar: volta ao cardápio, toast "Adicionado à sacola" e a barra da sacola sobe. (Alternativa, se o usuário preferir o comportamento atual: abrir a sacola.)
- O bloco "Também em {categoria}" sai: o iFood não tem, e os itens já estão todos ligados no cardápio.

## 5. Sacola — passo `cart`

`BottomSheet snap="full" enterFrom="right"`, com `labelledBy` apontando para o título da app bar.

- App bar: `X` à esquerda, "Sacola" no centro, "Limpar" (`Button variant="text" size="sm"`) à direita → `ConfirmDialog` "Limpar sacola?" → `clearCart()`.
- Linha da loja: `Avatar` 40 + nome + link "Adicionar mais itens" em vermelho (fecha a sacola).
- Avisos no topo, em `Banner`: loja fechada (warning), revisão do cardápio (info, com as listas `soldOut`, `removed` e `repriced`), abaixo do pedido mínimo (warning, dizendo quanto falta).
- Linha de item: nome `text-body1 font-semibold`; resumo das opções e "Obs.: …" em `text-caption text-gray-600`; `Stepper size="sm"` com `onRemove`; `Price` à direita em `tabular-nums`. `border-b border-gray-200`.
- Resumo: "Subtotal", "Taxa de entrega — a calcular", e "Total" em `font-bold`.
- Barra inferior: `Button fullWidth` "Continuar" com o total à direita; "Fechado agora", desabilitado, quando a loja não aceita pedidos fechada.
- Vazia: `EmptyState` com `ShoppingBag` — "Sua sacola está vazia" + `Button variant="secondary"` "Ver cardápio".

## 6. Finalizar pedido — passo `checkout`

- App bar: `ChevronLeft` (volta para a Sacola) + "Finalizar pedido".
- `SegmentedControl` Entrega | Retirada com `Bike` e `Store`. Com um só modo habilitado, um rótulo estático no lugar.
- Seções com título `text-body1 font-semibold` e `Divider thick` entre elas:
  - **Seus dados**: nome; WhatsApp com máscara.
  - **Endereço de entrega**: bairro como `ListRow` com `ChevronRight`, abrindo um `BottomSheet` de `RadioRow`s ("Centro" + "R$ 5,00 • 30-45 min" à direita) e a opção "Meu bairro não está na lista", que mostra o bloco atual de fora de área com "Prefiro retirar no local"; depois rua, número, complemento e referência. Na retirada, o endereço da loja num `Card`.
  - **Pagamento**: `RadioRow` por forma, com ícone; "Troco para?" aparece quando a forma é Dinheiro.
  - **Observações**: `TextArea`.
- Resumo: Subtotal, Taxa de entrega ("Grátis" em `text-positive`, "a combinar", "a calcular") e Total em `font-bold`.
- Barra inferior: `Button fullWidth` com `MessageCircle` — "Fazer pedido pelo WhatsApp" — vermelho. O verde do WhatsApp sai: o CTA principal é sempre vermelho, e o rótulo avisa para onde a pessoa vai.
- Erros inline sob cada campo; ao enviar com erro, foco no primeiro campo inválido.

## 7. Pedido enviado — passo `done`

Centralizado: círculo `bg-success-bg` com `CircleCheck` em `text-success`, "Pedido enviado!" em `text-h6 font-bold`, uma frase em `text-body2 text-gray-600` explicando que a conversa abriu no WhatsApp, `Button variant="secondary"` "Abrir o WhatsApp novamente" e `Button variant="text"` "Voltar ao cardápio".

## 8. Estados

| Estado | Comportamento |
|---|---|
| Loja fechada e sem aceitar pedidos | status cinza no cabeçalho; "+" e "Adicionar" desabilitados ("Loja fechada"); `Banner` de aviso na página do item e na sacola; ao tentar, toast "Loja fechada no momento" |
| Loja fechada aceitando pedidos | status cinza; tudo funciona; `Banner` informando que o pedido fica para a reabertura |
| Item indisponível | linha em `opacity-60`, `Tag` "Indisponível", sem "+"; na página, `Banner tone="neutral"` no lugar da barra de compra |
| Cardápio vazio | `EmptyState` com `Utensils` |
| Carregando | `loading.tsx` com `StoreSkeleton`; o modo demo usa o mesmo |
| Erro | `EmptyState` com `TriangleAlert`, "Não foi possível carregar o cardápio. Tente novamente." + botão |

## 9. Desktop (`lg:`)

- Conteúdo em `max-w-page`; o cardápio vira grade de duas colunas de linhas (cada linha com seu `border-b`).
- A página do item vira um painel `max-w-narrow rounded-lg shadow-highest` centrado sobre `bg-gray-50` — o equivalente em rota ao modal de item do site do iFood. A barra de compra vira o rodapé do painel. As migalhas aparecem só aqui; no celular ficam `sr-only` (o JSON-LD de breadcrumb precisa de um par visível).
- A sacola vira dialog centrado `max-w-md` com `animate-pop-in`.
- A barra da sacola continua no rodapé, com `max-w-lg` centralizado.
