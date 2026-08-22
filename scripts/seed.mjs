/**
 * Popula o banco com um restaurante de demonstração.
 * Uso: npm run db:seed
 */
import { readFileSync } from 'node:fs';
import { randomUUID, randomBytes, scryptSync } from 'node:crypto';
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL ?? 'file:./data/menuqr.db';
const authToken = process.env.DATABASE_AUTH_TOKEN;
const db = createClient(authToken ? { url, authToken } : { url });

// O schema vive em src/server/db/schema.ts (string literal sem interpolação).
const schemaModule = readFileSync('src/server/db/schema.ts', 'utf8');
const schemaStart = schemaModule.indexOf('export const SCHEMA_SQL = `') + 'export const SCHEMA_SQL = `'.length;
const schemaSql = schemaModule.slice(schemaStart, schemaModule.indexOf('`;', schemaStart));
const statements = schemaSql
  .split('\n')
  .map((line) => line.replace(/--.*$/, ''))
  .join('\n')
  .split(';')
  .map((statement) => statement.trim())
  .filter(Boolean);
for (const statement of statements) {
  await db.execute(statement);
}

function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}

const DEMO_EMAIL = 'demo@menuqr.app';
const DEMO_PASSWORD = 'demo1234';
const SLUG = 'sabor-e-brasa';

const hours = {
  0: [{ open: '18:00', close: '23:00' }],
  1: [],
  2: [{ open: '18:00', close: '23:30' }],
  3: [{ open: '18:00', close: '23:30' }],
  4: [{ open: '18:00', close: '23:30' }],
  5: [{ open: '18:00', close: '23:59' }],
  6: [{ open: '12:00', close: '23:59' }],
};

const zones = [
  { name: 'Centro', fee: 5, eta: '30-45 min' },
  { name: 'República', fee: 6, eta: '35-50 min' },
  { name: 'Jardim América', fee: 7, eta: '40-55 min' },
  { name: 'Vila Nova', fee: 9, eta: '45-60 min' },
];

const menu = [
  {
    name: 'Hambúrgueres artesanais',
    slug: 'hamburgueres',
    icon: '🍔',
    description:
      'Blend bovino moído no dia, pão brioche assado na casa e montagem na hora.',
    items: [
      {
        slug: 'brasa-classic',
        name: 'Brasa Classic',
        description:
          'Pão brioche, 160 g de blend bovino, queijo prato, alface americana, tomate e maionese da casa.',
        price: 29.9,
        image: '🍔',
        imageAlt: 'Hambúrguer Brasa Classic com queijo prato, alface e tomate',
        tags: ['Mais vendido'],
        allergens: ['Glúten', 'Leite', 'Ovo'],
        serves: '1 pessoa',
        calories: 720,
        options: [
          {
            name: 'Ponto da carne',
            type: 'single',
            required: 1,
            max: null,
            choices: [
              { name: 'Mal passada', price: 0 },
              { name: 'Ao ponto', price: 0 },
              { name: 'Bem passada', price: 0 },
            ],
          },
          {
            name: 'Adicionais',
            type: 'multi',
            required: 0,
            max: 4,
            choices: [
              { name: 'Bacon crocante', price: 5 },
              { name: 'Cheddar extra', price: 4 },
              { name: 'Mais um hambúrguer de 160 g', price: 12 },
              { name: 'Cebola caramelizada', price: 3.5 },
            ],
          },
        ],
      },
      {
        slug: 'cheddar-e-bacon',
        name: 'Cheddar & Bacon',
        description: 'Blend de 180 g, cheddar inglês derretido, bacon artesanal e maionese de páprica.',
        price: 34.9,
        image: '🥓',
        imageAlt: 'Hambúrguer com cheddar derretido e bacon crocante',
        tags: [],
        allergens: ['Glúten', 'Leite', 'Ovo'],
        serves: '1 pessoa',
        calories: 890,
        options: [
          {
            name: 'Ponto da carne',
            type: 'single',
            required: 1,
            max: null,
            choices: [
              { name: 'Mal passada', price: 0 },
              { name: 'Ao ponto', price: 0 },
              { name: 'Bem passada', price: 0 },
            ],
          },
        ],
      },
      {
        slug: 'costela-bbq',
        name: 'Costela BBQ',
        description: 'Costela desfiada 12 h no defumador, cheddar, cebola crispy e barbecue artesanal.',
        price: 38.9,
        image: '🍖',
        imageAlt: 'Sanduíche de costela desfiada com cebola crispy',
        tags: ['Especial do chef'],
        allergens: ['Glúten', 'Leite'],
        serves: '1 pessoa',
        calories: 940,
        options: [],
      },
      {
        slug: 'verde-que-te-quero-verde',
        name: 'Verde que te quero Verde',
        description: 'Hambúrguer de grão-de-bico e beterraba, queijo vegetal, rúcula e maionese de castanha.',
        price: 31.9,
        image: '🥬',
        imageAlt: 'Hambúrguer vegetariano de grão-de-bico e beterraba',
        tags: ['Vegetariano'],
        allergens: ['Glúten', 'Castanhas'],
        serves: '1 pessoa',
        calories: 610,
        options: [],
      },
    ],
  },
  {
    name: 'Porções',
    slug: 'porcoes',
    icon: '🍟',
    description: 'Para começar bem ou dividir com a mesa.',
    items: [
      {
        slug: 'batata-frita-rustica',
        name: 'Batata frita rústica',
        description: 'Batata com casca, alecrim fresco e sal marinho. Acompanha maionese da casa.',
        price: 22.9,
        image: '🍟',
        imageAlt: 'Porção de batata frita rústica com alecrim',
        tags: [],
        allergens: ['Ovo'],
        serves: '1 a 2 pessoas',
        calories: 540,
        options: [
          {
            name: 'Tamanho',
            type: 'single',
            required: 1,
            max: null,
            choices: [
              { name: 'Individual (250 g)', price: 0 },
              { name: 'Para dividir (500 g)', price: 12 },
            ],
          },
          {
            name: 'Cobertura',
            type: 'multi',
            required: 0,
            max: 2,
            choices: [
              { name: 'Cheddar e bacon', price: 8 },
              { name: 'Parmesão e alho', price: 6 },
            ],
          },
        ],
      },
      {
        slug: 'aneis-de-cebola',
        name: 'Anéis de cebola',
        description: '10 unidades empanadas na cerveja, com molho da casa.',
        price: 24.9,
        image: '🧅',
        imageAlt: 'Anéis de cebola empanados',
        tags: [],
        allergens: ['Glúten', 'Ovo'],
        serves: '2 pessoas',
        calories: 620,
        options: [],
      },
    ],
  },
  {
    name: 'Bebidas',
    slug: 'bebidas',
    icon: '🥤',
    description: 'Sucos feitos na hora, refrigerantes gelados e cervejas artesanais.',
    items: [
      {
        slug: 'refrigerante-lata',
        name: 'Refrigerante lata 350 ml',
        description: 'Coca-Cola, Coca-Cola Zero, Guaraná ou Sprite.',
        price: 7.5,
        image: '🥤',
        imageAlt: 'Lata de refrigerante gelada',
        tags: [],
        allergens: [],
        serves: '1 pessoa',
        calories: null,
        options: [
          {
            name: 'Sabor',
            type: 'single',
            required: 1,
            max: null,
            choices: [
              { name: 'Coca-Cola', price: 0 },
              { name: 'Coca-Cola Zero', price: 0 },
              { name: 'Guaraná', price: 0 },
              { name: 'Sprite', price: 0 },
            ],
          },
        ],
      },
      {
        slug: 'suco-natural',
        name: 'Suco natural 400 ml',
        description: 'Fruta batida na hora, sem açúcar adicionado.',
        price: 12.9,
        image: '🍹',
        imageAlt: 'Copo de suco natural',
        tags: ['Sem açúcar'],
        allergens: [],
        serves: '1 pessoa',
        calories: null,
        options: [],
      },
    ],
  },
  {
    name: 'Sobremesas',
    slug: 'sobremesas',
    icon: '🍰',
    description: 'Feitas na casa, para fechar a refeição.',
    items: [
      {
        slug: 'brownie-com-sorvete',
        name: 'Brownie com sorvete',
        description: 'Brownie de chocolate meio amargo, sorvete de creme e calda quente.',
        price: 21.9,
        image: '🍫',
        imageAlt: 'Brownie com bola de sorvete',
        tags: [],
        allergens: ['Glúten', 'Leite', 'Ovo'],
        serves: '1 a 2 pessoas',
        calories: 560,
        options: [],
      },
    ],
  },
];

// --------------------------------------------------------------- execução

const existing = await db.execute({
  sql: 'SELECT id FROM users WHERE email = ?',
  args: [DEMO_EMAIL],
});

let userId = existing.rows[0]?.id;
if (userId) {
  // Recria o negócio de demonstração do zero (cascata apaga cardápio e bairros).
  await db.execute({ sql: 'DELETE FROM businesses WHERE owner_id = ?', args: [userId] });
  console.log('Conta de demonstração já existia — cardápio recriado.');
} else {
  userId = randomUUID();
  await db.execute({
    sql: 'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    args: [userId, 'Equipe Sabor & Brasa', DEMO_EMAIL, hashPassword(DEMO_PASSWORD)],
  });
}

const businessId = randomUUID();
await db.execute({
  sql: `INSERT INTO businesses (
          id, owner_id, slug, name, tagline, description, logo, brand_color, whatsapp, email,
          instagram, street, district, city, state, postal_code, hours, accept_orders_when_closed,
          delivery_enabled, min_order, free_above, pickup_enabled, pickup_eta, payments, pix_key, published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
  args: [
    businessId,
    userId,
    SLUG,
    'Sabor & Brasa',
    'Hamburgueria artesanal e petiscos',
    'Hamburgueria artesanal no centro de São Paulo desde 2015. Blend bovino moído no dia, pão brioche assado na casa e ingredientes de produtores locais.',
    '🔥',
    '#c2410c',
    '5511987654321',
    'contato@saborebrasa.com.br',
    '@saborebrasa',
    'Rua das Palmeiras, 120',
    'Centro',
    'São Paulo',
    'SP',
    '01013-000',
    JSON.stringify(hours),
    0,
    1,
    25,
    90,
    1,
    '20-30 min',
    JSON.stringify(['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Vale-refeição']),
    'contato@saborebrasa.com.br',
  ],
});

for (const [index, zone] of zones.entries()) {
  await db.execute({
    sql: 'INSERT INTO delivery_zones (id, business_id, name, fee, eta, position) VALUES (?, ?, ?, ?, ?, ?)',
    args: [randomUUID(), businessId, zone.name, zone.fee, zone.eta, index],
  });
}

let itemCount = 0;
for (const [categoryIndex, category] of menu.entries()) {
  const categoryId = randomUUID();
  await db.execute({
    sql: 'INSERT INTO categories (id, business_id, slug, name, icon, description, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [categoryId, businessId, category.slug, category.name, category.icon, category.description, categoryIndex],
  });

  for (const [itemIndex, item] of category.items.entries()) {
    const itemId = randomUUID();
    await db.execute({
      sql: `INSERT INTO items (
              id, business_id, category_id, slug, name, description, price, image, image_alt,
              tags, allergens, serves, calories, available, position
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      args: [
        itemId,
        businessId,
        categoryId,
        item.slug,
        item.name,
        item.description,
        item.price,
        item.image,
        item.imageAlt,
        JSON.stringify(item.tags),
        JSON.stringify(item.allergens),
        item.serves,
        item.calories,
        itemIndex,
      ],
    });
    itemCount += 1;

    for (const [groupIndex, group] of item.options.entries()) {
      const groupId = randomUUID();
      await db.execute({
        sql: 'INSERT INTO option_groups (id, item_id, name, type, required, max_choices, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [groupId, itemId, group.name, group.type, group.required, group.max, groupIndex],
      });
      for (const [choiceIndex, choice] of group.choices.entries()) {
        await db.execute({
          sql: 'INSERT INTO option_choices (id, group_id, name, price, position) VALUES (?, ?, ?, ?, ?)',
          args: [randomUUID(), groupId, choice.name, choice.price, choiceIndex],
        });
      }
    }
  }
}

console.log(`Pronto: ${menu.length} categorias e ${itemCount} itens em /r/${SLUG}`);
console.log(`Login de demonstração: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
