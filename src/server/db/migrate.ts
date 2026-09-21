import 'server-only';
import { db } from './client';
import { SCHEMA_STATEMENTS } from './schema';

let migration: Promise<void> | null = null;

/**
 * Duas idas ao banco em vez de uma por comando. Em serverless isto roda a cada
 * instância nova, e com o banco em outra região cada ida custa ~100 ms: os
 * ~25 comandos do schema em sequência viravam segundos de espera na primeira
 * página. O PRAGMA vai sozinho porque o batch é uma transação, e dentro de
 * transação o SQLite ignora `foreign_keys`.
 */
async function runMigrations(): Promise<void> {
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
  await db.batch(SCHEMA_STATEMENTS.filter(isIndex), 'write');
}

/**
 * Bancos criados antes do Clerk. `CREATE TABLE IF NOT EXISTS` não toca em
 * tabela que já existe, então a `users` deles continuaria sem `clerk_user_id`
 * (nenhum login novo acharia o dono) e com `password_hash NOT NULL` sem valor
 * padrão (todo cadastro novo esbarraria na coluna). Os dois ALTER resolvem, e
 * repetir não custa nada: depois do primeiro, a conferência já sai vazia.
 */
async function alignUsersTable(): Promise<void> {
  const columns = await db.execute('PRAGMA table_info(users)');
  const names = new Set(columns.rows.map((row) => String(row.name)));

  if (!names.has('clerk_user_id')) {
    await db.execute('ALTER TABLE users ADD COLUMN clerk_user_id TEXT');
  }
  // A senha virou responsabilidade do Clerk; guardar o hash antigo seria só
  // risco parado no banco.
  if (names.has('password_hash')) {
    await db.execute('ALTER TABLE users DROP COLUMN password_hash');
  }
}

/**
 * Garante que as tabelas existem antes da primeira consulta.
 * Idempotente: todo o schema usa CREATE ... IF NOT EXISTS.
 */
export function ensureSchema(): Promise<void> {
  migration ??= runMigrations().catch((error) => {
    migration = null;
    throw error;
  });
  return migration;
}
