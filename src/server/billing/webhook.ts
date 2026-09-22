import 'server-only';
import type { AsaasWebhookEvent } from '../asaas/types';
import {
  findOpenSubscriptionByCustomer,
  getSubscriptionByAsaasId,
  getSubscriptionById,
} from '../repositories/subscriptions';
import { recordPayment } from './lifecycle';

export type AsaasWebhookOutcome = 'processed' | 'ignored' | 'unmatched';

/** Só o que muda uma cobrança: o resto (transferências, notas) não nos diz respeito. */
const PAYMENT_EVENTS = new Set([
  'PAYMENT_CREATED',
  'PAYMENT_UPDATED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_RESTORED',
  'PAYMENT_REFUNDED',
]);

/**
 * Casa a cobrança com a nossa assinatura, nesta ordem: o id da assinatura no
 * Asaas; o `externalReference` (que o Asaas costuma copiar da assinatura para
 * a cobrança, mas não dependemos disso); e, por fim, o cliente — cobre o
 * intervalo entre gravar a nossa linha e receber o id do Asaas.
 */
export async function handleAsaasEvent(event: AsaasWebhookEvent): Promise<{ outcome: AsaasWebhookOutcome; subscriptionId: string | null }> {
  if (!PAYMENT_EVENTS.has(event.event) || !event.payment) return { outcome: 'ignored', subscriptionId: null };

  const payment = event.payment;
  const subscription =
    (payment.subscription ? await getSubscriptionByAsaasId(payment.subscription) : null) ??
    (payment.externalReference ? await getSubscriptionById(payment.externalReference) : null) ??
    (payment.customer ? await findOpenSubscriptionByCustomer(payment.customer) : null);
  if (!subscription) return { outcome: 'unmatched', subscriptionId: null };

  await recordPayment(subscription.id, payment, {
    status: event.event === 'PAYMENT_DELETED' ? 'DELETED' : payment.status,
  });
  return { outcome: 'processed', subscriptionId: subscription.id };
}
