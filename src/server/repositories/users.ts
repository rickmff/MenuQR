import 'server-only';
import { randomUUID } from 'node:crypto';
import { db, isUniqueViolation } from '../db/client';
import { ensureSchema } from '../db/migrate';
import { mapUser } from './mappers';
import type { User } from '@/lib/types';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserById(id: string): Promise<User | null> {
  await ensureSchema();
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE id = ? LIMIT 1', args: [id] });
  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

/** O dono do negócio a partir do id que o Clerk dá a quem está logado. */
export async function getUserByClerkId(clerkUserId: string): Promise<User | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE clerk_user_id = ? LIMIT 1',
    args: [clerkUserId],
  });
  const row = result.rows[0];
  return row ? mapUser(row) : null;
}

/**
 * Primeira vez que uma conta do Clerk aparece por aqui: acha ou cria a linha
 * do dono. É ela que o negócio referencia, então precisa existir antes de o
 * lojista cadastrar o restaurante.
 *
 * Adotar pelo e-mail cobre quem já tinha conta antes do Clerk: entrando com o
 * mesmo endereço, reencontra o cardápio em vez de começar do zero. O
 * `clerk_user_id IS NULL` é o que impede alguém de assumir uma linha que já
 * pertence a outra conta.
 */
export async function linkClerkUser(input: {
  clerkUserId: string;
  name: string;
  email: string;
}): Promise<User> {
  await ensureSchema();
  const email = normalizeEmail(input.email);
  const name = input.name.trim() || email;

  const adopted = await db.execute({
    sql: 'UPDATE users SET clerk_user_id = ?, name = ? WHERE email = ? AND clerk_user_id IS NULL',
    args: [input.clerkUserId, name, email],
  });
  if (adopted.rowsAffected > 0) {
    const user = await getUserByClerkId(input.clerkUserId);
    if (user) return user;
  }

  const id = randomUUID();
  try {
    await db.execute({
      sql: 'INSERT INTO users (id, clerk_user_id, name, email) VALUES (?, ?, ?, ?)',
      args: [id, input.clerkUserId, name, email],
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    // Duas abas do mesmo lojista recém-cadastrado chegando juntas: a outra
    // ganhou a corrida e a linha já está lá.
    const user = await getUserByClerkId(input.clerkUserId);
    if (user) return user;
    // O e-mail está preso a outra conta do Clerk — só acontece com dado
    // herdado, porque o Clerk não deixa dois logins com o mesmo endereço.
    throw new Error(`Já existe uma conta com o e-mail ${email} ligada a outro acesso.`);
  }

  const user = await getUserById(id);
  if (!user) throw new Error('Falha ao criar a conta.');
  return user;
}

/** Espelha no banco o nome e o e-mail que o lojista mudou lá no Clerk. */
export async function updateUserProfile(id: string, input: { name: string; email: string }): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: 'UPDATE users SET name = ?, email = ? WHERE id = ?',
    args: [input.name.trim(), normalizeEmail(input.email), id],
  });
}

/**
 * Apaga a conta. O `ON DELETE CASCADE` leva junto o negócio, o cardápio e tudo
 * o que pendura neles. Devolve os endereços dos cardápios que existiam: depois
 * do DELETE não há mais de onde tirar, e quem chama precisa deles para derrubar
 * o cache das páginas públicas.
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
