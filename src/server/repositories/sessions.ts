import 'server-only';
import { db } from '../db/client';
import { ensureSchema } from '../db/migrate';
import { mapUser } from './mappers';
import type { User } from '@/lib/types';

export async function createSession(tokenHash: string, userId: string, expiresAt: Date): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: 'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    args: [tokenHash, userId, expiresAt.toISOString()],
  });
}

/** Devolve o usuário da sessão, já descartando sessões vencidas. */
export async function getUserBySessionToken(tokenHash: string): Promise<User | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: `SELECT users.* FROM sessions
          JOIN users ON users.id = sessions.user_id
          WHERE sessions.token_hash = ? AND sessions.expires_at > datetime('now')
          LIMIT 1`,
    args: [tokenHash],
  });
  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await ensureSchema();
  await db.execute({ sql: 'DELETE FROM sessions WHERE token_hash = ?', args: [tokenHash] });
}

/** Limpeza oportunista de sessões vencidas. */
export async function deleteExpiredSessions(): Promise<void> {
  await ensureSchema();
  await db.execute("DELETE FROM sessions WHERE expires_at <= datetime('now')");
}
