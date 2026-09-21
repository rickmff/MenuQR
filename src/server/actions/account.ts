'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import { sendVerificationEmail } from '../auth/email-verification';
import { requireUser } from '../auth/guards';
import { hashPassword, verifyPassword } from '../auth/password';
import { endSession, startSession } from '../auth/session';
import { isUniqueViolation } from '../db/client';
import { emailAvailable } from '../email';
import { rateLimit, resetRateLimit } from '../rate-limit';
import { deletePasswordResets } from '../repositories/password-resets';
import { deleteUserSessions } from '../repositories/sessions';
import {
  deleteUser,
  getUserByEmail,
  getUserPasswordHash,
  normalizeEmail,
  updateUserPassword,
  updateUserProfile,
} from '../repositories/users';
import { revalidateStore } from '../revalidate';
import { matchesDeleteAccountPhrase } from '@/lib/account';
import type { FormState } from './business';

const ACCOUNT_PATH = '/painel/conta';

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}

/**
 * Confere a senha atual antes de qualquer mudança sensível. Devolve o estado de
 * erro pronto para o formulário, ou `null` quando a senha confere.
 *
 * O contador é um só para as três ações: separado por formulário, quem achou um
 * painel aberto teria o triplo de tentativas. E é por usuário, não por IP —
 * aqui já existe sessão, então ninguém de fora consegue travar a conta alheia,
 * e trocar de rede não zera as tentativas de quem está dentro.
 */
async function checkCurrentPassword(userId: string, password: string): Promise<FormState | null> {
  const key = `account-password:${userId}`;
  const limit = await rateLimit(key, 8, 15 * 60 * 1000);
  if (!limit.allowed) {
    const minutes = Math.ceil(limit.retryInSeconds / 60);
    return { error: `Muitas tentativas com a senha incorreta. Tente de novo em ${minutes} min.` };
  }

  const hash = await getUserPasswordHash(userId);
  if (!hash || !(await verifyPassword(password, hash))) {
    return { fieldErrors: { currentPassword: 'Senha atual incorreta.' } };
  }

  await resetRateLimit(key);
  return null;
}

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome.').max(80, 'Nome muito longo.'),
  email: z.string().trim().email('Informe um e-mail válido.').max(160, 'E-mail muito longo.'),
});

export async function updateProfileAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(ACCOUNT_PATH);

  const parsed = profileSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const email = normalizeEmail(parsed.data.email);
  const emailChanged = email !== user.email;
  const emailTaken: FormState = { fieldErrors: { email: 'Já existe uma conta com este e-mail.' } };

  // O e-mail é o login: quem só achou o painel aberto não pode levar a conta
  // embora trocando o endereço. Nome sozinho não pede senha.
  if (emailChanged) {
    const currentPassword = String(formData.get('currentPassword') ?? '');
    if (!currentPassword) {
      return { fieldErrors: { currentPassword: 'Informe sua senha atual para trocar o e-mail.' } };
    }
    const denied = await checkCurrentPassword(user.id, currentPassword);
    if (denied) return denied;

    // Só depois da senha: a resposta "já existe" revela quem tem conta.
    const owner = await getUserByEmail(email);
    if (owner && owner.id !== user.id) return emailTaken;
  }

  try {
    await updateUserProfile(user.id, { name: parsed.data.name, email });
  } catch (error) {
    // Outra conta pegou o endereço entre a checagem acima e o UPDATE.
    if (isUniqueViolation(error)) return emailTaken;
    throw error;
  }

  if (emailChanged) {
    // Um link de redefinição pedido para o endereço antigo não pode continuar
    // valendo; e o endereço novo precisa ser confirmado do zero (a linha antiga
    // de confirmação já saiu junto com o UPDATE).
    await deletePasswordResets(user.id);
    if (emailAvailable()) {
      after(() => sendVerificationEmail({ id: user.id, name: parsed.data.name, email }));
    }
  }

  // O cabeçalho do painel mostra o e-mail e a visão geral cumprimenta pelo nome.
  revalidatePath('/painel', 'layout');

  return {
    success: emailChanged ? 'Dados salvos. No próximo acesso, entre com o novo e-mail.' : 'Dados salvos.',
  };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe sua senha atual.'),
    newPassword: z
      .string()
      .min(8, 'A senha precisa de pelo menos 8 caracteres.')
      .max(200, 'Senha muito longa.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  });

export async function changePasswordAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(ACCOUNT_PATH);

  const parsed = passwordSchema.safeParse({
    currentPassword: String(formData.get('currentPassword') ?? ''),
    newPassword: String(formData.get('newPassword') ?? ''),
    confirmPassword: String(formData.get('confirmPassword') ?? ''),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const denied = await checkCurrentPassword(user.id, parsed.data.currentPassword);
  if (denied) return denied;

  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return { fieldErrors: { newPassword: 'Escolha uma senha diferente da atual.' } };
  }

  await updateUserPassword(user.id, await hashPassword(parsed.data.newPassword));
  // Quem troca a senha por desconfiança não pode deixar um link de redefinição
  // antigo, ainda válido, largado na caixa de entrada.
  await deletePasswordResets(user.id);

  // Trocar a senha é o que se faz quando alguém pode estar dentro da conta:
  // todas as sessões caem, e este navegador ganha uma nova para não ser
  // deslogado no meio da tela.
  await deleteUserSessions(user.id);
  await startSession(user.id);

  return { success: 'Senha alterada. Os outros aparelhos foram desconectados.' };
}

export async function deleteAccountAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(ACCOUNT_PATH);

  const currentPassword = String(formData.get('currentPassword') ?? '');
  const fieldErrors: Record<string, string> = {};
  if (!currentPassword) fieldErrors.currentPassword = 'Informe sua senha atual.';
  if (!matchesDeleteAccountPhrase(String(formData.get('confirmation') ?? ''))) {
    fieldErrors.confirmation = 'Digite a frase como aparece acima.';
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const denied = await checkCurrentPassword(user.id, currentPassword);
  if (denied) return denied;

  const slugs = await deleteUser(user.id);

  // Sem isto o cardápio apagado segue no ar, servido do cache, até a próxima
  // revalidação — e a promessa da tela é que o link para de funcionar na hora.
  for (const slug of slugs) revalidateStore(slug);

  // A linha da sessão já foi no CASCADE; falta tirar o cookie do navegador.
  await endSession();
  redirect('/');
}
