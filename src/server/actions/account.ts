'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { deleteAccountData } from '../account/delete-account';
import { AccountDeletionBlocked } from '../account/hooks';
import { requireUser } from '../auth/guards';
import { matchesDeleteAccountPhrase } from '@/lib/account';
import type { FormState } from './business';

const ACCOUNT_PATH = '/painel/conta';

/**
 * Exclui a conta dos dois lados: os dados do restaurante aqui e o acesso no
 * Clerk. Nome, e-mail e senha são de lá — esta tela cuida do que é nosso.
 */
export async function deleteAccountAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(ACCOUNT_PATH);
  const { userId: clerkUserId } = await auth();
  const t = await getTranslations('account.delete.errors');

  if (!matchesDeleteAccountPhrase(String(formData.get('confirmation') ?? ''))) {
    return { fieldErrors: { confirmation: t('phrase') } };
  }

  // Os nossos dados primeiro. Na ordem inversa, uma falha aqui deixaria o
  // cardápio publicado sem dono — pior do que um acesso sobrando no Clerk.
  // `strict`: se um gancho (cancelar a assinatura) falhar, a conta fica e o
  // lojista tenta de novo.
  try {
    await deleteAccountData(user.id, { strict: true });
  } catch (error) {
    if (error instanceof AccountDeletionBlocked) return { error: t(error.code) };
    console.error('[conta] exclusão dos dados falhou:', error);
    return { error: t('failed') };
  }

  if (clerkUserId) {
    try {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(clerkUserId);
    } catch (error) {
      // O que era do lojista já foi. Se o acesso sobrar, ele só cai num painel
      // vazio no próximo login — não vale devolver erro numa tela cujos dados
      // não existem mais.
      console.error('[conta] exclusão do acesso no Clerk falhou:', error);
    }
  }

  redirect('/');
}
