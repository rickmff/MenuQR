import 'server-only';
import { createClient, type Client } from '@libsql/client';

/**
 * Cliente do banco. Em desenvolvimento aponta para um arquivo SQLite local;
 * em produção aceita a mesma API apontando para um banco gerenciado
 * (Turso/libSQL), bastando definir DATABASE_URL e DATABASE_AUTH_TOKEN.
 */
const globalForDb = globalThis as unknown as { __menuqrClient?: Client };

function createDbClient(): Client {
  const url = process.env.DATABASE_URL ?? 'file:./data/menuqr.db';
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  return createClient(authToken ? { url, authToken } : { url });
}

// Reaproveita a conexão entre recarregamentos do dev server.
export const db: Client = globalForDb.__menuqrClient ?? createDbClient();
if (process.env.NODE_ENV !== 'production') globalForDb.__menuqrClient = db;
