'use server';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { requireUser } from '../auth/guards';
import { deleteUser } from '../repositories/users';
import { revalidateStore } from '../revalidate';
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

  if (!matchesDeleteAccountPhrase(String(formData.get('confirmation') ?? ''))) {
    return { fieldErrors: { confirmation: 'Digite a frase como aparece acima.' } };
  }

  // Os nossos dados primeiro. Na ordem inversa, uma falha aqui deixaria o
  // cardápio publicado sem dono — pior do que um acesso sobrando no Clerk.
  const slugs = await deleteUser(user.id);

  // Sem isto o cardápio apagado segue no ar, servido do cache, até a próxima
  // revalidação — e a promessa da tela é que o link para de funcionar na hora.
  for (const slug of slugs) revalidateStore(slug);

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
