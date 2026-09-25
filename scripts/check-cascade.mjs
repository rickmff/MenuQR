/**
 * Garante que apagar uma conta leva junto TUDO o que pendura nela — sem contar
 * com o ON DELETE CASCADE do banco.
 *
 * No Turso o `PRAGMA foreign_keys = ON` não persiste entre consultas, então a
 * cascata declarada no schema simplesmente não roda lá. Este script cria um
 * dono com negócio, bairro, categoria, item, complementos e foto, apaga o dono
 * pelo mesmo código que a tela de conta usa, e confere tabela por tabela.
 *
 * Em arquivo local, ele desliga o PRAGMA na conexão para reproduzir o Turso.
 * Contra um banco remoto (DATABASE_URL=libsql://…) usa o banco de verdade, com
 * ids próprios, e limpa o que criou ao final mesmo se falhar.
 *
 * Uso: npm run check:cascata
 */
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';

const LOCAL_DB = 'data/.check-cascata.db';
const remote = Boolean(process.env.DATABASE_URL) && !process.env.DATABASE_URL.startsWith('file:');

function cleanupFile() {
  for (const suffix of ['', '-shm', '-wal']) rmSync(`${LOCAL_DB}${suffix}`, { force: true });
}

if (!remote) {
  cleanupFile();
  process.env.DATABASE_URL = `file:./${LOCAL_DB}`;
  delete process.env.DATABASE_AUTH_TOKEN;
}

const { db } = await import('../src/server/db/client.ts');
const { ensureSchema } = await import('../src/server/db/migrate.ts');
const { deleteUser } = await import('../src/server/repositories/users.ts');

await ensureSchema();
if (!remote) await db.execute('PRAGMA foreign_keys = OFF');

const ids = {
  user: randomUUID(),
  business: randomUUID(),
  zone: randomUUID(),
  category: randomUUID(),
  item: randomUUID(),
  group: randomUUID(),
  choice: randomUUID(),
  image: randomUUID(),
  subscription: randomUUID().replace(/-/g, ''),
  payment: `pay_${randomUUID().slice(0, 12)}`,
};
const slug = `check-cascata-${ids.business.slice(0, 8)}`;

const TABLES = [
  ['users', 'id', ids.user],
  ['businesses', 'id', ids.business],
  ['business_covers', 'business_id', ids.business],
  ['delivery_zones', 'id', ids.zone],
  ['categories', 'id', ids.category],
  ['items', 'id', ids.item],
  ['option_groups', 'id', ids.group],
  ['option_choices', 'id', ids.choice],
  ['images', 'id', ids.image],
  ['rate_limits', 'key', `upload:${ids.business}`],
  ['subscriptions', 'id', ids.subscription],
  ['billing_payments', 'id', ids.payment],
];

async function countLeftovers() {
  const leftovers = [];
  for (const [table, column, value] of TABLES) {
    const result = await db.execute({ sql: `SELECT COUNT(*) AS total FROM ${table} WHERE ${column} = ?`, args: [value] });
    if (Number(result.rows[0]?.total ?? 0) > 0) leftovers.push(table);
  }
  return leftovers;
}

async function removeLeftovers() {
  for (const [table, column, value] of [...TABLES].reverse()) {
    await db.execute({ sql: `DELETE FROM ${table} WHERE ${column} = ?`, args: [value] });
  }
}

try {
  await db.batch(
    [
      { sql: 'INSERT INTO users (id, name, email) VALUES (?, ?, ?)', args: [ids.user, 'Conta de teste', `${ids.user}@check.menuqr`] },
      {
        sql: 'INSERT INTO businesses (id, owner_id, slug, name, whatsapp) VALUES (?, ?, ?, ?, ?)',
        args: [ids.business, ids.user, slug, 'Negócio de teste', '5511999999999'],
      },
      {
        sql: 'INSERT INTO delivery_zones (id, business_id, name, fee, eta, position) VALUES (?, ?, ?, ?, ?, ?)',
        args: [ids.zone, ids.business, 'Centro', 5, '30 min', 0],
      },
      {
        sql: 'INSERT INTO categories (id, business_id, slug, name, position) VALUES (?, ?, ?, ?, ?)',
        args: [ids.category, ids.business, 'pratos', 'Pratos', 0],
      },
      {
        sql: 'INSERT INTO items (id, business_id, category_id, slug, name, price, image, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [ids.item, ids.business, ids.category, 'prato', 'Prato', 10, `/img/${ids.image}`, 0],
      },
      {
        sql: 'INSERT INTO option_groups (id, item_id, name, type, required, position) VALUES (?, ?, ?, ?, ?, ?)',
        args: [ids.group, ids.item, 'Tamanho', 'single', 1, 0],
      },
      {
        sql: 'INSERT INTO option_choices (id, group_id, name, price, position) VALUES (?, ?, ?, ?, ?)',
        args: [ids.choice, ids.group, 'Grande', 2, 0],
      },
      {
        sql: 'INSERT INTO images (id, business_id, content_type, bytes, size) VALUES (?, ?, ?, ?, ?)',
        args: [ids.image, ids.business, 'image/webp', new Uint8Array(1024), 1024],
      },
      {
        sql: 'INSERT INTO business_covers (business_id, image) VALUES (?, ?)',
        args: [ids.business, `/img/${ids.image}`],
      },
      { sql: 'INSERT INTO rate_limits (key, count, reset_at) VALUES (?, ?, ?)', args: [`upload:${ids.business}`, 1, Date.now() + 60_000] },
      {
        sql: 'INSERT INTO subscriptions (id, user_id, asaas_customer_id, asaas_subscription_id, status, cycle, amount_cents, paid_until) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        args: [ids.subscription, ids.user, 'cus_teste', 'sub_teste', 'active', 'YEARLY', 58800, '2027-01-01'],
      },
      {
        sql: 'INSERT INTO billing_payments (id, subscription_id, status, value_cents, due_date) VALUES (?, ?, ?, ?, ?)',
        args: [ids.payment, ids.subscription, 'RECEIVED', 58800, '2026-01-01'],
      },
    ],
    'write',
  );

  const slugs = await deleteUser(ids.user);
  if (!slugs.includes(slug)) {
    throw new Error(`deleteUser devolveu ${JSON.stringify(slugs)}, sem o endereço ${slug}.`);
  }

  const leftovers = await countLeftovers();
  if (leftovers.length > 0) {
    console.error(`✗ Apagar a conta deixou linha para trás em: ${leftovers.join(', ')}.`);
    console.error('  A cascata do banco não pode ser a garantia: veja src/server/repositories/cascade.ts.');
    process.exitCode = 1;
  } else {
    console.log(`✓ Exclusão de conta limpa: ${TABLES.length} tabelas conferidas${remote ? ' no banco remoto' : ' (com foreign_keys OFF)'}.`);
  }
} finally {
  await removeLeftovers().catch(() => undefined);
  if (!remote) cleanupFile();
}
