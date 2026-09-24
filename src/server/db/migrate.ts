import 'server-only';
import { db } from './client';
import { SCHEMA_STATEMENTS, SCHEMA_VERSION } from './schema';

let migration: Promise<void> | null = null;

/**
 * Versão gravada no banco pela última migração (0 em banco novo ou antigo —
 * em banco novo a tabela nem existe ainda, e "no such table" também é zero).
 */
export async function readSchemaVersion(): Promise<number> {
  try {
    const result = await db.execute('SELECT version FROM schema_version WHERE id = 1 LIMIT 1');
    return Number(result.rows[0]?.version ?? 0);
  } catch (error) {
    if (error instanceof Error && /no such table/i.test(error.message)) return 0;
    throw error;
  }
}

/**
 * Duas idas ao banco em vez de uma por comando. Em serverless isto roda a cada
 * instância nova, e com o banco em outra região cada ida custa ~100 ms: os
 * ~25 comandos do schema em sequência viravam segundos de espera na primeira
 * página. O PRAGMA vai sozinho porque o batch é uma transação, e dentro de
 * transação o SQLite ignora `foreign_keys`.
 *
 * No Turso o PRAGMA nem persiste (cada consulta pode ir por outra conexão);
 * ele fica aqui pelo modo em arquivo e para documentar a intenção. A
 * integridade ao apagar vem dos DELETEs explícitos de `repositories/cascade.ts`.
 */
export async function runMigrations(): Promise<void> {
  const isPragma = (statement: string) => /^PRAGMA\b/i.test(statement);
  const isIndex = (statement: string) => /^CREATE\s+(UNIQUE\s+)?INDEX\b/i.test(statement);
  for (const pragma of SCHEMA_STATEMENTS.filter(isPragma)) {
    await db.execute(pragma);
  }
  // Tabelas antes dos índices, com o ajuste de `users` no meio: o índice de
  // `clerk_user_id` só pode ser criado depois que a coluna existe.
  await db.batch(
    SCHEMA_STATEMENTS.filter((statement) => !isPragma(statement) && !isIndex(statement)),
    'write',
  );
  await alignUsersTable();
  await alignBusinessesTable();
  await alignCategoriesTable();
  await db.batch(SCHEMA_STATEMENTS.filter(isIndex), 'write');
}

/**
 * Aplica o schema quando a versão gravada é menor que a do código, e grava a
 * nova. `force` reaplica mesmo com a versão igual ou maior (útil depois de
 * restaurar um backup).
 *
 * Tirar coluna é o passo perigoso: o deploy que ainda estava no ar continua
 * gravando nela. Uma coluna só sai daqui depois que o código que parou de
 * usá-la está publicado — e a build precisa passar, senão a Vercel segue
 * servindo o commit anterior contra um banco que já mudou.
 */
export async function migrateNow(options: { force?: boolean } = {}): Promise<{
  from: number;
  to: number;
  applied: boolean;
}> {
  const from = await readSchemaVersion();
  if (from === SCHEMA_VERSION && !options.force) return { from, to: SCHEMA_VERSION, applied: false };
  // Banco à frente do código: uma versão antiga ainda no ar (a build da nova
  // falhou, um preview velho) não pode "migrar" para trás. As migrações dela o
  // banco já passou, e gravar o número menor faria a versão nova reaplicar tudo
  // no próximo arranque — os dois ficariam se revezando no mesmo banco
  // (aconteceu entre o dev local e a Vercel). Ela roda com o que tem.
  if (from > SCHEMA_VERSION && !options.force) {
    console.warn(`[db] banco na versão ${from}, código na ${SCHEMA_VERSION}: migração ignorada.`);
    return { from, to: from, applied: false };
  }
  await runMigrations();
  await db.execute({
    sql: `INSERT INTO schema_version (id, version, applied_at) VALUES (1, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET version = excluded.version, applied_at = excluded.applied_at`,
    args: [SCHEMA_VERSION],
  });
  return { from, to: SCHEMA_VERSION, applied: true };
}

/**
 * Acrescenta a coluna se ela não existe. Duas instâncias frias podem migrar ao
 * mesmo tempo: a segunda esbarra em "duplicate column name" e segue, porque o
 * resultado é o mesmo.
 */
async function addColumn(table: string, names: Set<string>, name: string, type: string): Promise<void> {
  if (names.has(name)) return;
  try {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  } catch (error) {
    if (!(error instanceof Error) || !/duplicate column name/i.test(error.message)) throw error;
  }
}

async function dropColumn(table: string, names: Set<string>, name: string): Promise<void> {
  if (!names.has(name)) return;
  try {
    await db.execute(`ALTER TABLE ${table} DROP COLUMN ${name}`);
  } catch (error) {
    if (!(error instanceof Error) || !/no such column/i.test(error.message)) throw error;
  }
}

async function columnNames(table: string): Promise<Set<string>> {
  const columns = await db.execute(`PRAGMA table_info(${table})`);
  return new Set(columns.rows.map((row) => String(row.name)));
}

/**
 * Bancos criados antes do Clerk. `CREATE TABLE IF NOT EXISTS` não toca em
 * tabela que já existe, então a `users` deles continuaria sem `clerk_user_id`
 * (nenhum login novo acharia o dono) e com `password_hash NOT NULL` sem valor
 * padrão (todo cadastro novo esbarraria na coluna). Os dois ALTER resolvem, e
 * repetir não custa nada: depois do primeiro, a conferência já sai vazia.
 */
async function alignUsersTable(): Promise<void> {
  const names = await columnNames('users');
  await addColumn('users', names, 'clerk_user_id', 'TEXT');
  // Cobrança (versão 2 do schema).
  await addColumn('users', names, 'cpf_cnpj', 'TEXT');
  await addColumn('users', names, 'asaas_customer_id', 'TEXT');
  await addColumn('users', names, 'billing_exempt', 'INTEGER NOT NULL DEFAULT 0');
  // A senha virou responsabilidade do Clerk; guardar o hash antigo seria só
  // risco parado no banco.
  await dropColumn('users', names, 'password_hash');
}

/**
 * Bancos criados antes da área de entrega no mapa. Mesma história da `users`:
 * a tabela já existe, então o `CREATE TABLE IF NOT EXISTS` passa por ela sem
 * acrescentar as colunas novas. Latitude e longitude aceitam NULL (o lojista
 * ainda não marcou o ponto); o raio entra zerado, que é "sem raio definido".
 */
async function alignBusinessesTable(): Promise<void> {
  const names = await columnNames('businesses');

  const columnsToAdd: [name: string, type: string][] = [
    ['latitude', 'REAL'],
    ['longitude', 'REAL'],
    ['delivery_radius_km', 'REAL NOT NULL DEFAULT 0'],
    // Bancos anteriores à entrega por distância: 'zones' com taxas zeradas é
    // exatamente como eles cobram hoje, então nada muda para quem já estava lá.
    ['delivery_pricing', "TEXT NOT NULL DEFAULT 'zones'"],
    ['delivery_base_fee', 'REAL NOT NULL DEFAULT 0'],
    ['delivery_base_km', 'REAL NOT NULL DEFAULT 0'],
    ['delivery_per_km_fee', 'REAL NOT NULL DEFAULT 0'],
  ];
  for (const [name, type] of columnsToAdd) await addColumn('businesses', names, name, type);

  // Colunas que o painel não preenche mais. O pagamento é combinado entre
  // cliente e restaurante fora do sistema; o e-mail saiu da aba "Contato"
  // (o pedido chega pelo WhatsApp); e "aceitar pedidos fechado" saiu junto com
  // o interruptor — a loja fechada avisa e continua aceitando.
  for (const name of ['payments', 'pix_key', 'email', 'accept_orders_when_closed']) {
    await dropColumn('businesses', names, name);
  }
}

/**
 * Bancos criados quando a categoria ainda tinha ícone. O campo saiu do
 * formulário (a categoria é um título entre os itens, não um botão com emoji),
 * e a coluna que sobrou só guardaria emoji que ninguém mais mostra.
 */
async function alignCategoriesTable(): Promise<void> {
  const names = await columnNames('categories');
  await dropColumn('categories', names, 'icon');
}

/**
 * Garante que as tabelas existem antes da primeira consulta. Idempotente: todo
 * o schema usa CREATE ... IF NOT EXISTS, e com a versão gravada igual à do
 * código a única ida ao banco é a leitura de `schema_version`.
 */
export function ensureSchema(): Promise<void> {
  migration ??= migrateNow()
    .then(() => undefined)
    .catch((error) => {
      migration = null;
      throw error;
    });
  return migration;
}
