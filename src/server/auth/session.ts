import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import {
  createSession,
  deleteExpiredSessions,
  deleteSession,
  getUserBySessionToken,
} from '../repositories/sessions';
import type { User } from '@/lib/types';

const COOKIE_NAME = 'menuqr_session';
const SESSION_DAYS = 30;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Cria a sessão e grava o cookie. O token em claro só existe no navegador. */
export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await createSession(hashToken(token), userId, expiresAt);
  void deleteExpiredSessions().catch(() => {
    /* limpeza oportunista: falhar aqui não pode derrubar o login */
  });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) await deleteSession(hashToken(token));
  store.delete(COOKIE_NAME);
}

/**
 * Usuário da requisição atual. `cache` garante uma única consulta por request,
 * mesmo que vários componentes peçam o usuário.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(hashToken(token));
});
