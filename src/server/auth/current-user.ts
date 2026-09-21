import 'server-only';
import { auth, currentUser as clerkCurrentUser } from '@clerk/nextjs/server';
import { cache } from 'react';
import { demoMode } from '@/lib/demo/config';
import { getUserByClerkId, linkClerkUser, updateUserProfile } from '../repositories/users';
import type { User } from '@/lib/types';

/** Endereço de conta do Clerk aberta sem e-mail (só telefone, por exemplo). */
function emailOf(user: { primaryEmailAddress?: { emailAddress: string } | null; id: string }): string {
  return user.primaryEmailAddress?.emailAddress ?? `${user.id}@sem-email.menuqr`;
}

function nameOf(user: { fullName: string | null; firstName: string | null }, email: string): string {
  return user.fullName ?? user.firstName ?? email.split('@')[0] ?? email;
}

/**
 * O lojista logado, na linha do nosso banco — é o `id` dela que o negócio
 * referencia. Quem autentica é o Clerk; aqui só traduzimos o usuário dele para
 * o nosso.
 *
 * `cache` garante uma consulta por requisição, mesmo com vários componentes
 * pedindo o usuário. A ida à API do Clerk (`clerkCurrentUser`) só acontece na
 * primeira vez que uma conta aparece por aqui; depois disso o nome e o e-mail
 * saem do banco, sem chamada externa em cada página.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  // No modo demonstração não há Clerk (nem chaves): a conta vive no navegador.
  if (demoMode) return null;

  const { userId } = await auth();
  if (!userId) return null;

  const known = await getUserByClerkId(userId);
  if (known) return known;

  const clerkUser = await clerkCurrentUser();
  if (!clerkUser) return null;

  const email = emailOf(clerkUser);
  return linkClerkUser({ clerkUserId: userId, name: nameOf(clerkUser, email), email });
});

/**
 * Traz para o banco o nome e o e-mail que o lojista alterou no Clerk. Chamado
 * pela tela de conta, que é onde ele acabou de mexer nisso — em toda página
 * seria uma ida à API do Clerk por acesso, para um dado que só aparece no
 * cabeçalho.
 */
export async function syncCurrentUser(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const clerkUser = await clerkCurrentUser();
  if (!clerkUser) return user;

  const email = emailOf(clerkUser);
  const name = nameOf(clerkUser, email);
  if (name === user.name && email === user.email) return user;

  await updateUserProfile(user.id, { name, email });
  return { ...user, name, email };
}
