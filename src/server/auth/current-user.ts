import 'server-only';
import { isClerkAPIResponseError } from '@clerk/nextjs/errors';
import { auth, clerkClient, currentUser as clerkCurrentUser } from '@clerk/nextjs/server';
import { cache } from 'react';
import { demoMode } from '@/lib/demo/config';
import { isUniqueViolation } from '../db/client';
import { getUserByClerkId, linkClerkUser, updateUserProfile } from '../repositories/users';
import { profileFromClerkUser } from './clerk-profile';
import type { User } from '@/lib/types';

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

  return linkClerkUser({ clerkUserId: userId, ...profileFromClerkUser(clerkUser) }, { isStaleClerkId: clerkUserMissing });
});

/**
 * O id não existe na instância do Clerk destas chaves. Só o 404 conta: rede
 * fora ou limite de requisições respondem "não sei", e a linha continua com
 * quem já estava — melhor um login com erro do que uma conta entregue errada.
 */
async function clerkUserMissing(clerkUserId: string): Promise<boolean> {
  try {
    const clerk = await clerkClient();
    await clerk.users.getUser(clerkUserId);
    return false;
  } catch (error) {
    if (isClerkAPIResponseError(error) && error.status === 404) return true;
    console.error('[conta] não deu para conferir o acesso antigo no Clerk:', error);
    return false;
  }
}

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

  const { name, email } = profileFromClerkUser(clerkUser);
  if (name === user.name && email === user.email) return user;

  try {
    await updateUserProfile(user.id, { name, email });
  } catch (error) {
    // O endereço está preso a uma linha antiga, de antes do Clerk. Quem manda
    // continua sendo o Clerk; aqui a cópia só fica velha, e a tela abre.
    if (!isUniqueViolation(error)) throw error;
    console.error('[conta] não deu para espelhar o e-mail do Clerk:', error);
    return user;
  }
  return { ...user, name, email };
}
