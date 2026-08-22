/**
 * Popula o banco com o restaurante de demonstração.
 *
 * Os dados vêm de src/lib/demo/sample-menu.json — o MESMO arquivo usado pelo
 * modo demonstração no navegador. É o que garante que o cardápio de exemplo
 * seja idêntico nos dois modos.
 *
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

const { business, menu } = JSON.parse(readFileSync('src/lib/demo/sample-menu.json', 'utf8'));

function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}

const DEMO_EMAIL = 'demo@menuqr.app';
const DEMO_PASSWORD = 'demo1234';

// --------------------------------------------------------------- execução

const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [DEMO_EMAIL] });

let userId = existing.rows[0]?.id;
if (userId) {
  // Recria o negócio do zero (a cascata apaga cardápio e bairros).
  await db.execute({ sql: 'DELETE FROM businesses WHERE owner_id = ?', args: [userId] });
  console.log('Conta de demonstração já existia — cardápio recriado.');
} else {
  userId = randomUUID();
  await db.execute({
    sql: 'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    args: [userId, `Equipe ${business.name}`, DEMO_EMAIL, hashPassword(DEMO_PASSWORD)],
  });
}

await db.execute({
  sql: `INSERT INTO businesses (
          id, owner_id, slug, name, tagline, description, logo, brand_color, whatsapp, email,
          instagram, street, district, city, state, postal_code, hours, accept_orders_when_closed,
          delivery_enabled, min_order, free_above, pickup_enabled, pickup_eta, payments, pix_key, published
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  args: [
    business.id,
    userId,
    business.slug,
    business.name,
    business.tagline,
    business.description,
    business.logo,
    business.brandColor,
    business.whatsapp,
    business.email,
    business.instagram,
    business.address.street,
    business.address.district,
    business.address.city,
    business.address.state,
    business.address.postalCode,
    JSON.stringify(business.hours),
    business.acceptOrdersWhenClosed ? 1 : 0,
    business.delivery.enabled ? 1 : 0,
    business.delivery.minOrder,
    business.delivery.freeAbove,
    business.pickup.enabled ? 1 : 0,
    business.pickup.eta,
    JSON.stringify(business.payments),
    business.pixKey,
    business.published ? 1 : 0,
  ],
});

for (const [index, zone] of business.delivery.zones.entries()) {
  await db.execute({
    sql: 'INSERT INTO delivery_zones (id, business_id, name, fee, eta, position) VALUES (?, ?, ?, ?, ?, ?)',
    args: [zone.id, business.id, zone.name, zone.fee, zone.eta, index],
  });
}

let itemCount = 0;
for (const [categoryIndex, category] of menu.entries()) {
  await db.execute({
    sql: `INSERT INTO categories (id, business_id, slug, name, icon, description, position)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      category.id,
      business.id,
      category.slug,
      category.name,
      category.icon,
      category.description,
      categoryIndex,
    ],
  });

  for (const [itemIndex, item] of category.items.entries()) {
    await db.execute({
      sql: `INSERT INTO items (
              id, business_id, category_id, slug, name, description, price, image, image_alt,
              tags, allergens, serves, calories, available, position
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        item.id,
        business.id,
        category.id,
        item.slug,
        item.name,
        item.description,
        item.price,
        item.image,
        item.imageAlt,
        JSON.stringify(item.tags ?? []),
        JSON.stringify(item.allergens ?? []),
        item.serves ?? '',
        item.calories ?? null,
        item.available ? 1 : 0,
        itemIndex,
      ],
    });
    itemCount += 1;

    for (const [groupIndex, group] of (item.options ?? []).entries()) {
      await db.execute({
        sql: `INSERT INTO option_groups (id, item_id, name, type, required, max_choices, position)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          group.id,
          item.id,
          group.name,
          group.type,
          group.required ? 1 : 0,
          group.max ?? null,
          groupIndex,
        ],
      });
      for (const [choiceIndex, choice] of group.choices.entries()) {
        await db.execute({
          sql: 'INSERT INTO option_choices (id, group_id, name, price, position) VALUES (?, ?, ?, ?, ?)',
          args: [choice.id, group.id, choice.name, choice.price, choiceIndex],
        });
      }
    }
  }
}

console.log(`Pronto: ${menu.length} categorias e ${itemCount} itens em /r/${business.slug}`);
console.log(`Login de demonstração: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
