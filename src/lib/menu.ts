import type { MenuCategory, MenuCategoryCard, MenuItem, MenuItemCard } from './types';

/** Cardápio publicado. Cada item vira uma página própria em /cardapio/[categoria]/[item]. */
export const menu: MenuCategory[] = [
  {
    id: 'hamburgueres',
    slug: 'hamburgueres',
    name: 'Hambúrgueres artesanais',
    icon: '🍔',
    description:
      'Blend bovino moído no dia, pão brioche assado na casa e montagem na hora. Servidos individualmente.',
    items: [
      {
        id: 'brasa-classic',
        slug: 'brasa-classic',
        name: 'Brasa Classic',
        description:
          'Pão brioche, 160 g de blend bovino, queijo prato, alface americana, tomate e maionese da casa.',
        price: 29.9,
        image: '🍔',
        imageAlt: 'Hambúrguer Brasa Classic com queijo prato, alface e tomate no pão brioche',
        tags: ['Mais vendido'],
        available: true,
        serves: '1 pessoa',
        calories: 720,
        allergens: ['Glúten', 'Leite', 'Ovo'],
        options: [
          {
            id: 'ponto',
            name: 'Ponto da carne',
            type: 'single',
            required: true,
            choices: [
              { id: 'mal', name: 'Mal passada', price: 0 },
              { id: 'ao-ponto', name: 'Ao ponto', price: 0 },
              { id: 'bem', name: 'Bem passada', price: 0 },
            ],
          },
          {
            id: 'adicionais',
            name: 'Adicionais',
            type: 'multi',
            max: 4,
            choices: [
              { id: 'bacon', name: 'Bacon crocante', price: 5 },
              { id: 'cheddar', name: 'Cheddar extra', price: 4 },
              { id: 'burger-extra', name: 'Mais um hambúrguer de 160 g', price: 12 },
              { id: 'cebola', name: 'Cebola caramelizada', price: 3.5 },
            ],
          },
        ],
      },
      {
        id: 'cheddar-bacon',
        slug: 'cheddar-e-bacon',
        name: 'Cheddar & Bacon',
        description:
          'Blend de 180 g, cheddar inglês derretido, bacon artesanal defumado e maionese de páprica.',
        price: 34.9,
        image: '🥓',
        imageAlt: 'Hambúrguer com cheddar derretido e fatias de bacon crocante',
        tags: [],
        available: true,
        serves: '1 pessoa',
        calories: 890,
        allergens: ['Glúten', 'Leite', 'Ovo'],
        options: [
          {
            id: 'ponto',
            name: 'Ponto da carne',
            type: 'single',
            required: true,
            choices: [
              { id: 'mal', name: 'Mal passada', price: 0 },
              { id: 'ao-ponto', name: 'Ao ponto', price: 0 },
              { id: 'bem', name: 'Bem passada', price: 0 },
            ],
          },
          {
            id: 'adicionais',
            name: 'Adicionais',
            type: 'multi',
            max: 4,
            choices: [
              { id: 'bacon', name: 'Bacon extra', price: 5 },
              { id: 'ovo', name: 'Ovo frito', price: 3 },
              { id: 'burger-extra', name: 'Mais um hambúrguer de 180 g', price: 14 },
            ],
          },
        ],
      },
      {
        id: 'costela-bbq',
        slug: 'costela-bbq',
        name: 'Costela BBQ',
        description:
          'Costela bovina desfiada por 12 horas no defumador, cheddar, cebola crispy e barbecue artesanal.',
        price: 38.9,
        image: '🍖',
        imageAlt: 'Sanduíche de costela desfiada com cebola crispy e molho barbecue',
        tags: ['Especial do chef'],
        available: true,
        serves: '1 pessoa',
        calories: 940,
        allergens: ['Glúten', 'Leite'],
        options: [
          {
            id: 'adicionais',
            name: 'Adicionais',
            type: 'multi',
            max: 3,
            choices: [
              { id: 'bacon', name: 'Bacon crocante', price: 5 },
              { id: 'cheddar', name: 'Cheddar extra', price: 4 },
              { id: 'onion', name: 'Anéis de cebola', price: 6 },
            ],
          },
        ],
      },
      {
        id: 'veggie',
        slug: 'verde-que-te-quero-verde',
        name: 'Verde que te quero Verde',
        description:
          'Hambúrguer de grão-de-bico e beterraba, queijo vegetal, rúcula e maionese de castanha-de-caju.',
        price: 31.9,
        image: '🥬',
        imageAlt: 'Hambúrguer vegetariano de grão-de-bico e beterraba com rúcula',
        tags: ['Vegetariano'],
        available: true,
        serves: '1 pessoa',
        calories: 610,
        allergens: ['Glúten', 'Castanhas'],
        suitableForDiet: ['VegetarianDiet'],
        options: [
          {
            id: 'adicionais',
            name: 'Adicionais',
            type: 'multi',
            max: 3,
            choices: [
              { id: 'guacamole', name: 'Guacamole', price: 6 },
              { id: 'cogumelo', name: 'Cogumelos salteados', price: 7 },
            ],
          },
        ],
      },
      {
        id: 'frango-crispy',
        slug: 'frango-crispy',
        name: 'Frango Crispy',
        description: 'Filé de frango empanado na hora, coleslaw, picles de pepino e molho ranch.',
        price: 32.9,
        image: '🍗',
        imageAlt: 'Sanduíche de filé de frango empanado com coleslaw e picles',
        tags: [],
        available: true,
        serves: '1 pessoa',
        calories: 780,
        allergens: ['Glúten', 'Leite', 'Ovo'],
        options: [],
      },
    ],
  },
  {
    id: 'porcoes',
    slug: 'porcoes',
    name: 'Porções e entradas',
    icon: '🍟',
    description: 'Para começar bem ou dividir com a mesa. Fritura em óleo trocado diariamente.',
    items: [
      {
        id: 'fritas',
        slug: 'batata-frita-rustica',
        name: 'Batata frita rústica',
        description: 'Batata com casca, alecrim fresco e sal marinho. Acompanha maionese da casa.',
        price: 22.9,
        image: '🍟',
        imageAlt: 'Porção de batata frita rústica com alecrim',
        tags: [],
        available: true,
        serves: '1 a 2 pessoas',
        calories: 540,
        allergens: ['Ovo'],
        suitableForDiet: ['VegetarianDiet'],
        options: [
          {
            id: 'tamanho',
            name: 'Tamanho',
            type: 'single',
            required: true,
            choices: [
              { id: 'p', name: 'Individual (250 g)', price: 0 },
              { id: 'g', name: 'Para dividir (500 g)', price: 12 },
            ],
          },
          {
            id: 'cobertura',
            name: 'Cobertura',
            type: 'multi',
            max: 2,
            choices: [
              { id: 'cheddar-bacon', name: 'Cheddar e bacon', price: 8 },
              { id: 'parmesao', name: 'Parmesão e alho', price: 6 },
            ],
          },
        ],
      },
      {
        id: 'onion-rings',
        slug: 'aneis-de-cebola',
        name: 'Anéis de cebola',
        description: '10 unidades empanadas na cerveja, com molho da casa.',
        price: 24.9,
        image: '🧅',
        imageAlt: 'Anéis de cebola empanados servidos com molho',
        tags: [],
        available: true,
        serves: '2 pessoas',
        calories: 620,
        allergens: ['Glúten', 'Ovo'],
        suitableForDiet: ['VegetarianDiet'],
        options: [],
      },
      {
        id: 'iscas-frango',
        slug: 'iscas-de-frango',
        name: 'Iscas de frango',
        description: '400 g de iscas crocantes com limão-siciliano e molho barbecue.',
        price: 39.9,
        image: '🍤',
        imageAlt: 'Porção de iscas de frango crocantes com limão',
        tags: [],
        available: true,
        serves: '2 a 3 pessoas',
        calories: 830,
        allergens: ['Glúten', 'Ovo'],
        options: [],
      },
    ],
  },
  {
    id: 'bebidas',
    slug: 'bebidas',
    name: 'Bebidas',
    icon: '🥤',
    description: 'Sucos feitos na hora, refrigerantes gelados e cervejas de cervejaria parceira.',
    items: [
      {
        id: 'refri',
        slug: 'refrigerante-lata',
        name: 'Refrigerante lata 350 ml',
        description: 'Coca-Cola, Coca-Cola Zero, Guaraná Antarctica ou Sprite.',
        price: 7.5,
        image: '🥤',
        imageAlt: 'Lata de refrigerante gelada',
        tags: [],
        available: true,
        serves: '1 pessoa',
        options: [
          {
            id: 'sabor',
            name: 'Sabor',
            type: 'single',
            required: true,
            choices: [
              { id: 'coca', name: 'Coca-Cola', price: 0 },
              { id: 'coca-zero', name: 'Coca-Cola Zero', price: 0 },
              { id: 'guarana', name: 'Guaraná Antarctica', price: 0 },
              { id: 'sprite', name: 'Sprite', price: 0 },
            ],
          },
        ],
      },
      {
        id: 'suco',
        slug: 'suco-natural',
        name: 'Suco natural 400 ml',
        description: 'Fruta batida na hora, sem açúcar adicionado e sem conservantes.',
        price: 12.9,
        image: '🍹',
        imageAlt: 'Copo de suco natural feito na hora',
        tags: ['Sem açúcar'],
        available: true,
        serves: '1 pessoa',
        suitableForDiet: ['VeganDiet', 'GlutenFreeDiet'],
        options: [
          {
            id: 'sabor',
            name: 'Sabor',
            type: 'single',
            required: true,
            choices: [
              { id: 'laranja', name: 'Laranja', price: 0 },
              { id: 'abacaxi', name: 'Abacaxi com hortelã', price: 0 },
              { id: 'morango', name: 'Morango', price: 2 },
            ],
          },
        ],
      },
      {
        id: 'cerveja',
        slug: 'cerveja-artesanal',
        name: 'Cerveja artesanal 500 ml',
        description: 'IPA, Pilsen ou Weiss da cervejaria parceira. Venda proibida para menores de 18 anos.',
        price: 19.9,
        image: '🍺',
        imageAlt: 'Copo de cerveja artesanal',
        tags: ['+18'],
        available: true,
        serves: '1 pessoa',
        allergens: ['Glúten'],
        options: [
          {
            id: 'estilo',
            name: 'Estilo',
            type: 'single',
            required: true,
            choices: [
              { id: 'ipa', name: 'IPA', price: 0 },
              { id: 'pilsen', name: 'Pilsen', price: 0 },
              { id: 'weiss', name: 'Weiss', price: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'sobremesas',
    slug: 'sobremesas',
    name: 'Sobremesas',
    icon: '🍰',
    description: 'Feitas na casa, para fechar a refeição.',
    items: [
      {
        id: 'brownie',
        slug: 'brownie-com-sorvete',
        name: 'Brownie com sorvete',
        description: 'Brownie de chocolate meio amargo, sorvete de creme e calda quente.',
        price: 21.9,
        image: '🍫',
        imageAlt: 'Brownie de chocolate servido com bola de sorvete',
        tags: [],
        available: true,
        serves: '1 a 2 pessoas',
        calories: 560,
        allergens: ['Glúten', 'Leite', 'Ovo'],
        suitableForDiet: ['VegetarianDiet'],
        options: [],
      },
      {
        id: 'petit',
        slug: 'petit-gateau',
        name: 'Petit gâteau',
        description: 'Bolinho quente de chocolate com sorvete de baunilha.',
        price: 23.9,
        image: '🍰',
        imageAlt: 'Petit gâteau com sorvete de baunilha',
        tags: [],
        available: false,
        serves: '1 pessoa',
        calories: 610,
        allergens: ['Glúten', 'Leite', 'Ovo'],
        suitableForDiet: ['VegetarianDiet'],
        options: [],
      },
    ],
  },
];

export const allItems: MenuItem[] = menu.flatMap((category) => category.items);

/**
 * Remove os complementos antes de mandar os itens para componentes de cliente:
 * as listagens só precisam saber quantos grupos existem, e o payload enviado
 * ao navegador fica bem menor.
 */
export function toCardItem(item: MenuItem): MenuItemCard {
  const { options, ...rest } = item;
  return { ...rest, optionCount: options?.length ?? 0 };
}

export function toCardCategory(category: MenuCategory): MenuCategoryCard {
  return { ...category, items: category.items.map(toCardItem) };
}

export function getCategoryBySlug(slug: string): MenuCategory | undefined {
  return menu.find((category) => category.slug === slug);
}

export function getItemBySlug(categorySlug: string, itemSlug: string) {
  const category = getCategoryBySlug(categorySlug);
  const item = category?.items.find((entry) => entry.slug === itemSlug);
  return category && item ? { category, item } : undefined;
}

export function getItemById(id: string) {
  for (const category of menu) {
    const item = category.items.find((entry) => entry.id === id);
    if (item) return { category, item };
  }
  return undefined;
}

/** Itens em destaque na home. */
export function getHighlights(limit = 4): { category: MenuCategory; item: MenuItem }[] {
  return menu
    .flatMap((category) => category.items.map((item) => ({ category, item })))
    .filter(({ item }) => item.available && (item.tags?.length || item.price > 30))
    .slice(0, limit);
}

/** Menor preço do cardápio — usado no schema.org e nas chamadas comerciais. */
export const priceFrom = Math.min(...allItems.filter((item) => item.available).map((item) => item.price));
