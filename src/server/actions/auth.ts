'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../auth/password';
import { endSession, startSession } from '../auth/session';
import { rateLimit, resetRateLimit } from '../rate-limit';
import { createUser, getUserByEmail, normalizeEmail } from '../repositories/users';

export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: { name?: string; email?: string };
}

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(80, 'Nome muito longo.'),
  email: z.string().trim().email('Informe um e-mail válido.').max(160),
  password: z
    .string()
    .min(8, 'A senha precisa de pelo menos 8 caracteres.')
    .max(200, 'Senha muito longa.'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
});

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}

/** Destino seguro após o login: só caminhos internos são aceitos. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/painel';
}

export async function signupAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values: { name: raw.name, email: raw.email } };
  }

  const limit = rateLimit(`signup:${normalizeEmail(parsed.data.email)}`, 5, 15 * 60 * 1000);
  if (!limit.allowed) {
    return { error: 'Muitas tentativas seguidas. Tente novamente em alguns minutos.' };
  }

  const existing = await getUserByEmail(parsed.data.email);
  if (existing) {
    return {
      fieldErrors: { email: 'Já existe uma conta com este e-mail. Faça login.' },
      values: { name: raw.name, email: raw.email },
    };
  }

  const user = await createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash: await hashPassword(parsed.data.password),
  });

  await startSession(user.id);
  redirect('/painel/comecar');
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    email: String(formData.get('email') ?? ''),
    password: String(formData.get('password') ?? ''),
  };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsOf(parsed.error), values: { email: raw.email } };
  }

  const key = `login:${normalizeEmail(parsed.data.email)}`;
  const limit = rateLimit(key, 8, 15 * 60 * 1000);
  if (!limit.allowed) {
    return { error: 'Muitas tentativas de acesso. Aguarde alguns minutos e tente de novo.' };
  }

  const user = await getUserByEmail(parsed.data.email);
  // Mensagem única para e-mail inexistente e senha errada: não revela quem tem conta.
  const genericError = { error: 'E-mail ou senha incorretos.', values: { email: raw.email } };
  if (!user) return genericError;

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return genericError;

  resetRateLimit(key);
  await startSession(user.id);
  redirect(safeNext(formData.get('proximo')));
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect('/');
}
