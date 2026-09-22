import 'server-only';
import { db } from './client';
import { SCHEMA_STATEMENTS, SCHEMA_VERSION } from './schema';

let migration: Promise<void> | null = null;

/** Versão gravada no banco pela última migração (0 em banco novo ou antigo). */
export async function readSchemaVersion(): Promise<number> {
  const result = await db.execute('PRAGMA user_version');
  return Number(result.rows[0]?.user_version ?? 0);
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
  await db.batch(SCHEMA_STATEMENTS.filter(isIndex), 'write');
}

/**
 * Aplica o schema quando a versão gravada não é a do código, e grava a nova.
 * `force` reaplica mesmo com a versão igual (útil depois de restaurar um
 * backup). A versão vai como constante no SQL porque PRAGMA não aceita
 * parâmetro — e é a constante do código, nunca entrada de fora.
 */
export async function migrateNow(options: { force?: boolean } = {}): Promise<{
  from: number;
  to: number;
  applied: boolean;
}> {
  const from = await readSchemaVersion();
  if (from === SCHEMA_VERSION && !options.force) return { from, to: SCHEMA_VERSION, applied: false };
  await runMigrations();
  await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
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

  // O pagamento é combinado entre cliente e restaurante fora do sistema: as
  // colunas saíram do cadastro e não fazem falta em banco antigo.
  for (const name of ['payments', 'pix_key']) await dropColumn('businesses', names, name);
}

/**
 * Garante que as tabelas existem antes da primeira consulta. Idempotente: todo
 * o schema usa CREATE ... IF NOT EXISTS, e com a versão gravada igual à do
 * código a única ida ao banco é a leitura do PRAGMA.
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
