import 'server-only';
import { AccountDeletionBlocked, type BeforeAccountDeleted } from '../account/hooks';
import { getUserById } from '../repositories/users';
import { loadBillingAccess } from './access';
import { cancelSubscription } from './subscribe';

/**
 * Antes de apagar a conta, cancela a assinatura no Asaas: apagar os dados e
 * deixar a cobrança viva lá seria o pior dos dois mundos. O cliente no Asaas
 * fica — é registro financeiro, e a política de privacidade diz isso.
 */
export const cancelSubscriptionOnAccountDeleted: BeforeAccountDeleted = async ({ userId }) => {
  const user = await getUserById(userId);
  if (!user) return;
  const access = await loadBillingAccess(user);
  if (!access.current?.asaasSubscriptionId) return;
  try {
    await cancelSubscription(access.current);
  } catch (error) {
    console.error('[conta] cancelamento da assinatura no Asaas falhou:', error);
    throw new AccountDeletionBlocked(
      'subscriptionCancelFailed',
      'Não conseguimos cancelar a assinatura agora. Tente de novo em alguns minutos.',
    );
  }
};
