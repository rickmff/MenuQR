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
