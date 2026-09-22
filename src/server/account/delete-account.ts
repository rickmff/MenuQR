import 'server-only';
import { cancelSubscriptionOnAccountDeleted } from '../billing/account-hook';
import { listOwnedBusinesses } from '../repositories/businesses';
import { deleteUser } from '../repositories/users';
import { revalidateStore } from '../revalidate';
import type { BeforeAccountDeleted } from './hooks';

/**
 * Lista explícita, não registro dinâmico: em serverless não dá para depender
 * de "algum módulo importou e se registrou" — o módulo pode simplesmente não
 * ter sido carregado naquela instância. Quem precisa rodar antes da exclusão
 * entra aqui por import.
 */
const beforeAccountDeleted: BeforeAccountDeleted[] = [cancelSubscriptionOnAccountDeleted];

/**
 * Apaga tudo o que é nosso de uma conta: ganchos (assinatura etc.), depois o
 * dono com negócio, cardápio e fotos, e por fim o cache dos cardápios públicos.
 *
 * Serve à tela de conta (o lojista pediu) e ao webhook do Clerk (a conta foi
 * apagada lá). A diferença é `strict`: na tela, um gancho que falha bloqueia a
 * exclusão e o lojista tenta de novo; no webhook não há ninguém para avisar, e
 * é melhor apagar os dados com um gancho falhado (registrado no log) do que
 * deixar um cardápio sem dono no ar.
 */
export async function deleteAccountData(userId: string, options: { strict: boolean }): Promise<{ slugs: string[] }> {
  const owned = await listOwnedBusinesses(userId);
  const context = { userId, businessIds: owned.map((entry) => entry.id), slugs: owned.map((entry) => entry.slug) };

  for (const hook of beforeAccountDeleted) {
    try {
      await hook(context);
    } catch (error) {
      if (options.strict) throw error;
      console.error('[conta] gancho de exclusão falhou; a exclusão segue:', error);
    }
  }

  const slugs = await deleteUser(userId);

  // Sem isto o cardápio apagado segue no ar, servido do cache, até a próxima
  // revalidação — e a promessa da tela é que o link para de funcionar na hora.
  for (const slug of slugs) revalidateStore(slug);

  return { slugs };
}
