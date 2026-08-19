/*
 * data.js — Dados padrão do restaurante e do cardápio.
 *
 * O dono do restaurante pode editar tudo por aqui (ou pelo painel em admin.html,
 * que salva as alterações no navegador e permite exportar este arquivo em JSON).
 */
(function (global) {
  'use strict';

  var DEFAULT_RESTAURANT = {
    name: 'Sabor & Brasa',
    tagline: 'Hamburgueria artesanal e petiscos',
    logo: '🔥',
    // Número do WhatsApp que vai RECEBER os pedidos.
    // Formato internacional, somente dígitos: 55 (Brasil) + DDD + número.
    whatsapp: '5511987654321',
    address: 'Rua das Palmeiras, 120 — Centro',
    instagram: '@saborebrasa',
    // Horário de funcionamento. 0 = domingo ... 6 = sábado.
    // Use uma lista vazia para dias fechados. Horários que viram a madrugada
    // (ex.: 18:00 às 00:30) são aceitos.
    hours: {
      0: [{ open: '18:00', close: '23:00' }],
      1: [],
      2: [{ open: '18:00', close: '23:30' }],
      3: [{ open: '18:00', close: '23:30' }],
      4: [{ open: '18:00', close: '23:30' }],
      5: [{ open: '18:00', close: '00:30' }],
      6: [{ open: '12:00', close: '00:30' }]
    },
    // Aceita pedidos mesmo com a loja fechada (vira "pedido agendado")?
    acceptOrdersWhenClosed: false,
    delivery: {
      enabled: true,
      minOrder: 25,
      freeAbove: 90, // frete grátis acima deste valor (0 = desativado)
      zones: [
        { id: 'centro', name: 'Centro', fee: 5, eta: '30-45 min' },
        { id: 'jardins', name: 'Jardim América', fee: 7, eta: '40-55 min' },
        { id: 'vila-nova', name: 'Vila Nova', fee: 9, eta: '45-60 min' },
        { id: 'industrial', name: 'Distrito Industrial', fee: 12, eta: '50-70 min' }
      ]
    },
    pickup: { enabled: true, eta: '20-30 min' },
    payments: ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Vale-refeição'],
    pixKey: 'contato@saborebrasa.com.br'
  };

  var DEFAULT_MENU = [
    {
      id: 'destaques',
      name: 'Mais pedidos',
      icon: '⭐',
      items: [
        {
          id: 'brasa-classic',
          name: 'Brasa Classic',
          description: 'Pão brioche, 160g de blend bovino, queijo prato, alface, tomate e maionese da casa.',
          price: 29.9,
          image: '🍔',
          tags: ['Mais vendido'],
          available: true,
          options: [
            {
              id: 'ponto',
              name: 'Ponto da carne',
              type: 'single',
              required: true,
              choices: [
                { id: 'mal', name: 'Mal passada', price: 0 },
                { id: 'ao-ponto', name: 'Ao ponto', price: 0 },
                { id: 'bem', name: 'Bem passada', price: 0 }
              ]
            },
            {
              id: 'adicionais',
              name: 'Adicionais',
              type: 'multi',
              max: 4,
              choices: [
                { id: 'bacon', name: 'Bacon crocante', price: 5 },
                { id: 'cheddar', name: 'Cheddar extra', price: 4 },
                { id: 'burger-extra', name: 'Mais um hambúrguer 160g', price: 12 },
                { id: 'cebola', name: 'Cebola caramelizada', price: 3.5 }
              ]
            }
          ]
        },
        {
          id: 'costela-bbq',
          name: 'Costela BBQ',
          description: 'Costela desfiada 12h no defumador, cheddar, cebola crispy e molho barbecue artesanal.',
          price: 38.9,
          image: '🍖',
          tags: ['Chef'],
          available: true,
          options: [
            {
              id: 'adicionais',
              name: 'Adicionais',
              type: 'multi',
              max: 3,
              choices: [
                { id: 'bacon', name: 'Bacon crocante', price: 5 },
                { id: 'cheddar', name: 'Cheddar extra', price: 4 },
                { id: 'onion', name: 'Anéis de cebola', price: 6 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'hamburgueres',
      name: 'Hambúrgueres',
      icon: '🍔',
      items: [
        {
          id: 'cheddar-bacon',
          name: 'Cheddar & Bacon',
          description: 'Blend de 180g, cheddar inglês derretido, bacon artesanal e maionese defumada.',
          price: 34.9,
          image: '🥓',
          tags: [],
          available: true,
          options: [
            {
              id: 'ponto',
              name: 'Ponto da carne',
              type: 'single',
              required: true,
              choices: [
                { id: 'mal', name: 'Mal passada', price: 0 },
                { id: 'ao-ponto', name: 'Ao ponto', price: 0 },
                { id: 'bem', name: 'Bem passada', price: 0 }
              ]
            },
            {
              id: 'adicionais',
              name: 'Adicionais',
              type: 'multi',
              max: 4,
              choices: [
                { id: 'bacon', name: 'Bacon extra', price: 5 },
                { id: 'ovo', name: 'Ovo frito', price: 3 },
                { id: 'burger-extra', name: 'Mais um hambúrguer 180g', price: 14 }
              ]
            }
          ]
        },
        {
          id: 'veggie',
          name: 'Verde que te quero Verde',
          description: 'Hambúrguer de grão-de-bico e beterraba, queijo vegano, rúcula e maionese de castanha.',
          price: 31.9,
          image: '🥬',
          tags: ['Vegetariano'],
          available: true,
          options: [
            {
              id: 'adicionais',
              name: 'Adicionais',
              type: 'multi',
              max: 3,
              choices: [
                { id: 'guacamole', name: 'Guacamole', price: 6 },
                { id: 'cogumelo', name: 'Cogumelos salteados', price: 7 }
              ]
            }
          ]
        },
        {
          id: 'frango-crispy',
          name: 'Frango Crispy',
          description: 'Filé de frango empanado, coleslaw, picles e molho ranch.',
          price: 32.9,
          image: '🍗',
          tags: [],
          available: true,
          options: []
        }
      ]
    },
    {
      id: 'porcoes',
      name: 'Porções',
      icon: '🍟',
      items: [
        {
          id: 'fritas',
          name: 'Batata frita rústica',
          description: 'Batata rústica com alecrim e sal marinho.',
          price: 22.9,
          image: '🍟',
          tags: [],
          available: true,
          options: [
            {
              id: 'tamanho',
              name: 'Tamanho',
              type: 'single',
              required: true,
              choices: [
                { id: 'p', name: 'Individual (250g)', price: 0 },
                { id: 'g', name: 'Para dividir (500g)', price: 12 }
              ]
            },
            {
              id: 'cobertura',
              name: 'Cobertura',
              type: 'multi',
              max: 2,
              choices: [
                { id: 'cheddar-bacon', name: 'Cheddar e bacon', price: 8 },
                { id: 'parmesao', name: 'Parmesão e alho', price: 6 }
              ]
            }
          ]
        },
        {
          id: 'onion-rings',
          name: 'Anéis de cebola',
          description: '10 unidades empanadas na cerveja, com molho da casa.',
          price: 24.9,
          image: '🧅',
          tags: [],
          available: true,
          options: []
        },
        {
          id: 'iscas-frango',
          name: 'Iscas de frango',
          description: '400g de iscas crocantes com limão siciliano e molho barbecue.',
          price: 39.9,
          image: '🍤',
          tags: [],
          available: true,
          options: []
        }
      ]
    },
    {
      id: 'bebidas',
      name: 'Bebidas',
      icon: '🥤',
      items: [
        {
          id: 'refri',
          name: 'Refrigerante lata 350ml',
          description: 'Coca-Cola, Coca Zero, Guaraná ou Sprite.',
          price: 7.5,
          image: '🥤',
          tags: [],
          available: true,
          options: [
            {
              id: 'sabor',
              name: 'Sabor',
              type: 'single',
              required: true,
              choices: [
                { id: 'coca', name: 'Coca-Cola', price: 0 },
                { id: 'coca-zero', name: 'Coca-Cola Zero', price: 0 },
                { id: 'guarana', name: 'Guaraná', price: 0 },
                { id: 'sprite', name: 'Sprite', price: 0 }
              ]
            }
          ]
        },
        {
          id: 'suco',
          name: 'Suco natural 400ml',
          description: 'Feito na hora, sem açúcar adicionado.',
          price: 12.9,
          image: '🍹',
          tags: [],
          available: true,
          options: [
            {
              id: 'sabor',
              name: 'Sabor',
              type: 'single',
              required: true,
              choices: [
                { id: 'laranja', name: 'Laranja', price: 0 },
                { id: 'abacaxi', name: 'Abacaxi com hortelã', price: 0 },
                { id: 'morango', name: 'Morango', price: 2 }
              ]
            }
          ]
        },
        {
          id: 'cerveja',
          name: 'Cerveja artesanal 500ml',
          description: 'IPA, Pilsen ou Weiss da cervejaria parceira.',
          price: 19.9,
          image: '🍺',
          tags: ['+18'],
          available: true,
          options: [
            {
              id: 'estilo',
              name: 'Estilo',
              type: 'single',
              required: true,
              choices: [
                { id: 'ipa', name: 'IPA', price: 0 },
                { id: 'pilsen', name: 'Pilsen', price: 0 },
                { id: 'weiss', name: 'Weiss', price: 0 }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'sobremesas',
      name: 'Sobremesas',
      icon: '🍰',
      items: [
        {
          id: 'brownie',
          name: 'Brownie com sorvete',
          description: 'Brownie de chocolate meio amargo, sorvete de creme e calda quente.',
          price: 21.9,
          image: '🍫',
          tags: [],
          available: true,
          options: []
        },
        {
          id: 'petit',
          name: 'Petit gâteau',
          description: 'Bolinho quente de chocolate com sorvete de baunilha.',
          price: 23.9,
          image: '🍰',
          tags: [],
          available: false,
          options: []
        }
      ]
    }
  ];

  global.MenuQRData = {
    restaurant: DEFAULT_RESTAURANT,
    menu: DEFAULT_MENU
  };
})(window);
