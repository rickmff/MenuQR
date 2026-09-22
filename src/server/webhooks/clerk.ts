import 'server-only';
import type { WebhookEvent } from '@clerk/nextjs/webhooks';
import { deleteAccountData } from '../account/delete-account';
import { profileFromWebhookUser } from '../auth/clerk-profile';
import { isUniqueViolation } from '../db/client';
import { getUserByClerkId, updateUserProfile } from '../repositories/users';

export type ClerkWebhookOutcome = 'atualizado' | 'sem-mudanca' | 'excluido' | 'ignorado';

/**
 * O que fazer com cada evento do Clerk.
 *
 * `user.created` fica de fora de propósito: a linha do dono nasce no primeiro
 * login, por `linkClerkUser`, que é quem sabe adotar uma conta antiga pelo
 * e-mail. Criar aqui abriria uma corrida com ela e duplicaria a regra.
 */
export async function handleClerkEvent(event: WebhookEvent): Promise<{ outcome: ClerkWebhookOutcome; userId: string | null }> {
  if (event.type === 'user.updated') {
    const user = await getUserByClerkId(event.data.id);
    if (!user) return { outcome: 'ignorado', userId: null };

    // O evento dispara a cada login (last_sign_in_at muda): só escreve quando
    // o que espelhamos mudou de verdade.
    const profile = profileFromWebhookUser(event.data);
    if (profile.name === user.name && profile.email === user.email) {
      return { outcome: 'sem-mudanca', userId: user.id };
    }
    try {
      await updateUserProfile(user.id, profile);
    } catch (error) {
      // O endereço está preso a uma linha antiga, de antes do Clerk — mesma
      // regra de `syncCurrentUser`: o Clerk manda, a cópia só fica velha.
      if (!isUniqueViolation(error)) throw error;
      console.error('[webhook clerk] não deu para espelhar o e-mail:', error);
      return { outcome: 'ignorado', userId: user.id };
    }
    return { outcome: 'atualizado', userId: user.id };
  }

  if (event.type === 'user.deleted') {
    if (!event.data.id) return { outcome: 'ignorado', userId: null };
    // Conta excluída pela tela do painel já apagou os nossos dados antes de
    // apagar o acesso no Clerk: quando o evento chega, a linha não existe mais.
    // Se existe, a exclusão veio do dashboard do Clerk, e a limpeza é aqui.
    const user = await getUserByClerkId(event.data.id);
    if (!user) return { outcome: 'ignorado', userId: null };
    await deleteAccountData(user.id, { strict: false });
    return { outcome: 'excluido', userId: user.id };
  }

  return { outcome: 'ignorado', userId: null };
}
