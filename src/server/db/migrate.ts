import 'server-only';
import { db } from './client';
import { SCHEMA_STATEMENTS } from './schema';

let migration: Promise<void> | null = null;

async function runMigrations(): Promise<void> {
  for (const statement of SCHEMA_STATEMENTS) {
    await db.execute(statement);
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
