# Cardápio online com pedido pelo WhatsApp

Site pronto para restaurantes: o cliente navega pelo cardápio, monta o pedido,
informa endereço e telefone e **a finalização acontece no WhatsApp do restaurante**,
com o pedido já escrito na conversa.

Não precisa de servidor, banco de dados nem cadastro: são arquivos estáticos
(HTML, CSS e JavaScript) que rodam em qualquer hospedagem — inclusive grátis.

## Como funciona o pedido

1. O cliente abre o cardápio (link ou QR code na mesa/embalagem).
2. Escolhe os itens, complementos (ponto da carne, adicionais…) e a quantidade.
3. Clica no carrinho e preenche **nome, WhatsApp, endereço e forma de pagamento**.
4. Ao tocar em **“Enviar pedido pelo WhatsApp”**, abre a conversa com o
   restaurante já com o resumo do pedido — é só apertar enviar.
5. O restaurante recebe uma mensagem assim:

```
*NOVO PEDIDO — Sabor & Brasa*
Pedido #1908-1814 · 19/08/2026 às 18:14

*🧾 Itens*
2x Brasa Classic — R$ 69,80
   • Ponto da carne: Mal passada
   • Adicionais: Bacon crocante
   • Obs.: sem picles

*💰 Valores*
Subtotal: R$ 69,80
Entrega: R$ 5,00
*Total: R$ 74,80*

*👤 Cliente*
Nome: Maria Souza
WhatsApp: (11) 98765-4321

*🛵 Entrega*
Endereço: Rua das Acácias, 250 — Apto 12
Bairro: Centro
Previsão: 30-45 min

*💳 Pagamento*
Dinheiro
Troco para R$ 150,00 (levar R$ 75,20)
```

## O que já vem pronto

- Cardápio por categorias, com busca e navegação rápida.
- Itens com foto (emoji ou imagem), descrição, etiquetas e disponibilidade.
- Complementos por item: escolha única (obrigatória) e múltipla escolha com limite.
- Observações por item e observação geral do pedido.
- Carrinho persistente (o cliente pode fechar o site e voltar depois).
- Entrega com **taxa por bairro**, prazo estimado, pedido mínimo e frete grátis
  acima de um valor — ou **retirada no local**.
- Formas de pagamento configuráveis, campo de troco e envio da chave Pix.
- Horário de funcionamento com aviso de aberto/fechado (aceita horários que
  passam da meia-noite) e opção de aceitar pedidos agendados fora do horário.
- Layout responsivo (feito pensando no celular), modo escuro automático.
- Painel do dono em `admin.html` para editar tudo sem mexer em código.

## Colocando no ar

1. **Configure o WhatsApp que recebe os pedidos.**
   Abra `admin.html` e preencha o campo *WhatsApp*, ou edite direto em
   `assets/js/data.js`:

   ```js
   whatsapp: '5511987654321'  // 55 (Brasil) + DDD + número, só dígitos
   ```

2. **Ajuste o cardápio, os bairros e os horários** pelo painel `admin.html`.

3. **Publique as alterações.** O painel salva no navegador (ótimo para testar).
   Para valer para todos os clientes, clique em **“Exportar cardápio”**, copie o
   JSON e substitua os objetos `DEFAULT_RESTAURANT` e `DEFAULT_MENU` em
   `assets/js/data.js` — ou peça para alguém fazer isso por você.

4. **Suba os arquivos** em qualquer hospedagem estática:
   GitHub Pages, Netlify, Vercel, Cloudflare Pages ou a hospedagem que já usa.

5. **Divulgue.** Em `admin.html` você copia o link do cardápio e gera o QR code
   para imprimir nas mesas, no balcão e nas embalagens.

Para testar na sua máquina:

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Estrutura dos arquivos

```
index.html            cardápio, carrinho e checkout do cliente
admin.html            painel do dono do restaurante
assets/css/styles.css estilos (claro e escuro)
assets/js/data.js     dados padrão: restaurante + cardápio
assets/js/store.js    estado, carrinho e localStorage
assets/js/utils.js    moeda, telefone, horários e mensagem do WhatsApp
assets/js/app.js      telas do cliente
assets/js/admin.js    telas do painel
```

## Como cadastrar um item

```js
{
  id: 'brasa-classic',                 // único no cardápio inteiro
  name: 'Brasa Classic',
  description: 'Pão brioche, 160g de blend bovino…',
  price: 29.9,
  image: '🍔',                          // emoji ou URL de uma foto
  tags: ['Mais vendido'],
  available: true,                      // false esgota o item no cardápio
  options: [
    {
      id: 'ponto',
      name: 'Ponto da carne',
      type: 'single',                   // 'single' = escolher uma
      required: true,
      choices: [
        { id: 'mal', name: 'Mal passada', price: 0 },
        { id: 'ao-ponto', name: 'Ao ponto', price: 0 }
      ]
    },
    {
      id: 'adicionais',
      name: 'Adicionais',
      type: 'multi',                    // 'multi' = pode marcar várias
      max: 4,
      choices: [
        { id: 'bacon', name: 'Bacon crocante', price: 5 }
      ]
    }
  ]
}
```

## Observações

- O painel `admin.html` é uma ferramenta local de edição: ele **não tem senha**
  e não guarda nada em servidor. Quem abrir o link só altera o cardápio do
  próprio navegador — mas, se preferir, remova o arquivo do site publicado e
  edite o cardápio direto em `assets/js/data.js`.
- Os pedidos não ficam salvos em lugar nenhum: o histórico é a própria conversa
  do WhatsApp do restaurante.
- O botão de QR code usa um gerador externo apenas para criar a imagem a partir
  do link do cardápio.
