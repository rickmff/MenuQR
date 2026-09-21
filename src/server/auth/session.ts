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
import { LOGGED_HINT_COOKIE, SESSION_COOKIE as COOKIE_NAME } from './cookie-name';
import type { User } from '@/lib/types';

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
  // Dica para o cabeçalho da página inicial, que é estática e não enxerga o cookie
  // acima. Sem `httpOnly` de propósito, e por isso sem nada dentro: vale `1` e não
  // autoriza nada. Se ficar velha, o clique em "Ir para o painel" cai no login.
  store.set(LOGGED_HINT_COOKIE, '1', {
    httpOnly: false,
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
  store.delete(LOGGED_HINT_COOKIE);
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
