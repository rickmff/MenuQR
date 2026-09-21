import 'server-only';
import { createHash, randomBytes } from 'node:crypto';

/**
 * Tokens de uso único que viajam por e-mail (redefinir senha, confirmar e-mail).
 * Mesma regra das sessões: o token em claro só existe no link; o banco guarda o
 * SHA-256, então um vazamento do banco não entrega nenhum link que funcione.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 32 bytes aleatórios em base64url: cabe num link e não dá para adivinhar. */
export function createToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}
