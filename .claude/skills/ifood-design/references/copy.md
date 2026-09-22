# Copy — glossário e tom de voz

O iFood mantém um guia interno de design de conteúdo organizado por público (consumidor, parceiro, entregador), com regras de faça/não faça e orientação própria sobre emoji. O guia não é público; o que segue é o vocabulário observável do app do consumidor. As tabelas por tela estão em `screens-cliente.md`.

## Regras

- **"Sacola", nunca "Carrinho".** O código hoje mistura os dois (`store-header.tsx`, `cart-drawer.tsx`). Unifique: é a palavra mais reconhecível do iFood.
- Trate por "você". Frases curtas, voz ativa, sem jargão.
- Sentence case em tudo: "Finalizar pedido", não "Finalizar Pedido". A exceção é o badge `OBRIGATÓRIO`, que é caixa alta por estilo (CSS `uppercase`), não por texto.
- Botão começa com verbo e diz o que acontece: "Adicionar", "Continuar", "Fazer pedido pelo WhatsApp". Nada de "OK" ou "Enviar".
- Rótulos sem ponto final. Exclamação só na confirmação ("Pedido enviado!").
- Emoji nunca no chrome da interface. Em dado do lojista (logo, ícone de categoria, imagem) continua valendo.
- Erro diz o que houve e o que fazer: "Não foi possível copiar o link. Tente novamente." Nunca culpe a pessoa.
- Preço com `formatPrice` (`R$ 29,90`, com espaço). Faixas com hífen: "30-40 min". "a partir de R$ 12,00" em minúsculas.
- Separador de metadados: ponto médio com espaços ("Entrega • 30-45 min • R$ 5,00").
- Grafia da marca: "iFood". O MenuQR não usa o nome nem o logo do iFood na interface: copiamos o padrão visual, não a marca.

## Glossário

| Contexto | Texto |
|---|---|
| Sacola | Sacola · Ver sacola · Sua sacola está vazia · Limpar · Limpar sacola? · Adicionar mais itens · Total sem a entrega |
| Adicionar | Adicionar (com o preço à direita) · Adicionado à sacola · Escolha as opções obrigatórias |
| Opções | Escolha 1 opção · Escolha de 1 a {n} · Escolha pelo menos 1 · Escolha até {n} opções · Escolha quantas quiser · OBRIGATÓRIO · + R$ 3,00 |
| Observação | Alguma observação? · Ex: tirar a cebola, maionese à parte etc. · 0/140 |
| Entrega | Entrega · Retirada · Taxa de entrega · Grátis · Pedido mínimo R$ 25,00 · Hoje, 30-40 min · Entrega grátis em pedidos acima de R$ 90,00 · a calcular · a combinar · Meu bairro não está na lista · Prefiro retirar no local |
| Loja | Aberto · Fecha às 23:00 · Fechado · Abre às 18:00 · Abre amanhã às 18:00 · Loja fechada no momento · Fechado agora · Sobre a loja · Informações da loja · Horário de funcionamento · Formas de pagamento |
| Busca | Buscar no cardápio · Cancelar · Nenhum item encontrado para “{termo}” |
| Checkout | Finalizar pedido · Seus dados · Endereço de entrega · Pagamento · Troco para? · Observações · Subtotal · Total · Continuar · Fazer pedido pelo WhatsApp |
| Enviado | Pedido enviado! · Abrir o WhatsApp novamente · Voltar ao cardápio |
| Estados | Indisponível · Esgotado · Não foi possível {ação}. Tente novamente. · Link copiado |
| Painel | Visão geral · Cardápio · Dados do negócio · Publicado · Rascunho · Salvar alterações · Ver cardápio · Baixar QR · Avançado |

## O que não muda

As mensagens de validação do checkout (`validate()` em `cart-drawer.tsx`) e o texto da mensagem do WhatsApp (`src/lib/whatsapp.ts`) são regra de negócio testada pelo dono do produto. Restilize onde aparecem; não reescreva.
