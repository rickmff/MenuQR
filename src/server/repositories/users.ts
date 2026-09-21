import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '../db/client';
import { ensureSchema } from '../db/migrate';
import { mapUser } from './mappers';
import type { User } from '@/lib/types';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ? LIMIT 1',
    args: [normalizeEmail(email)],
  });
  const row = result.rows[0];
  if (!row) return null;
  return { ...mapUser(row), passwordHash: String(row.password_hash) };
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureSchema();
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ? LIMIT 1', args: [id] });
  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

export async function createUser(input: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<User> {
  await ensureSchema();
  const id = randomUUID();
  await db.execute({
    sql: 'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
    args: [id, input.name.trim(), normalizeEmail(input.email), input.passwordHash],
  });
  const user = await getUserById(id);
  if (!user) throw new Error('Falha ao criar a conta.');
  return user;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<void> {
  await ensureSchema();
  await db.execute({ sql: 'UPDATE users SET password_hash = ? WHERE id = ?', args: [passwordHash, id] });
}

/**
 * Hash da senha de quem já está logado. A sessão carrega o `User` sem o hash de
 * propósito; as telas de conta buscam aqui só na hora de conferir a senha atual.
 */
export async function getUserPasswordHash(id: string): Promise<string | null> {
  await ensureSchema();
  const result = await db.execute({ sql: 'SELECT password_hash FROM users WHERE id = ? LIMIT 1', args: [id] });
  const row = result.rows[0];
  return row ? String(row.password_hash) : null;
}

/**
 * Atualiza nome e e-mail. Se o e-mail mudou, a confirmação do endereço antigo
 * não vale para o novo: a linha de `email_verifications` sai na mesma transação,
 * e o usuário volta a "não confirmado". O DELETE vem antes do UPDATE porque é
 * ele que compara com o e-mail ainda gravado; se o UPDATE esbarrar no UNIQUE, o
 * lote inteiro é desfeito e a confirmação antiga continua lá.
 */
export async function updateUserProfile(id: string, input: { name: string; email: string }): Promise<void> {
  await ensureSchema();
  const email = normalizeEmail(input.email);
  await db.batch(
    [
      {
        sql: `DELETE FROM email_verifications
              WHERE user_id = ? AND (SELECT email FROM users WHERE id = ?) <> ?`,
        args: [id, id, email],
      },
      { sql: 'UPDATE users SET name = ?, email = ? WHERE id = ?', args: [input.name.trim(), email, id] },
    ],
    'write',
  );
}

/**
 * Apaga a conta. O `ON DELETE CASCADE` leva junto sessões, negócio, cardápio e
 * tudo o que pendura neles. Devolve os endereços dos cardápios que existiam:
 * depois do DELETE não há mais de onde tirar, e quem chama precisa deles para
 * derrubar o cache das páginas públicas.
 */
export async function deleteUser(id: string): Promise<string[]> {
  await ensureSchema();
  const [owned] = await db.batch(
    [
      { sql: 'SELECT slug FROM businesses WHERE owner_id = ?', args: [id] },
      { sql: 'DELETE FROM users WHERE id = ?', args: [id] },
    ],
    'write',
  );
  return (owned?.rows ?? []).map((row) => String(row.slug));
}
