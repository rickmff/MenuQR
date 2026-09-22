import 'server-only';
import { revalidatePath } from 'next/cache';
import { AsaasError } from '../asaas/client';
import { getPixQrCode } from '../asaas/payments';
import { getSubscription, listSubscriptionPayments } from '../asaas/subscriptions';
import type { AsaasPayment } from '../asaas/types';
import { getBusinessByOwner } from '../repositories/businesses';
import {
  getSubscriptionById,
  listPaymentsBySubscription,
  savePaymentQr,
  setPaidUntil,
  setSubscriptionStatus,
  touchSubscriptionSync,
  upsertPayment,
} from '../repositories/subscriptions';
import { revalidateStore } from '../revalidate';
import { computePaidUntil, type BillingPayment, type SubscriptionRecord } from '@/lib/billing';

/**
 * As transições da assinatura. É o ÚNICO lugar que escreve `paid_until`, e ele
 * nunca soma: recalcula do conjunto de cobranças pagas (veja
 * `computePaidUntil`). Webhook, "Já paguei" e a tela chamam o mesmo código.
 */

const toCents = (value: number) => Math.round(value * 100);

/** Espelha uma cobrança como o Asaas mandou e recalcula o prazo. */
export async function recordPayment(
  subscriptionId: string,
  payment: AsaasPayment,
  options: { status?: string; revalidate?: boolean } = {},
): Promise<{ changed: boolean }> {
  await upsertPayment({
    id: payment.id,
    subscriptionId,
    status: payment.deleted ? 'DELETED' : (options.status ?? payment.status),
    valueCents: toCents(payment.value),
    dueDate: payment.dueDate,
    paidAt: payment.paymentDate ?? payment.clientPaymentDate ?? null,
    invoiceUrl: payment.invoiceUrl ?? null,
  });
  return recomputeSubscription(subscriptionId, options.revalidate ?? true);
}

/**
 * `revalidate` é falso quando chamado durante a renderização de uma página
 * (o Next não deixa invalidar cache no meio do render); o webhook e as ações
 * deixam ligado, e é assim que a loja volta ao ar assim que o Pix cai.
 */
export async function recomputeSubscription(subscriptionId: string, revalidate = true): Promise<{ changed: boolean }> {
  const subscription = await getSubscriptionById(subscriptionId);
  if (!subscription) return { changed: false };

  const payments = await listPaymentsBySubscription(subscriptionId);
  const paidUntil = computePaidUntil(payments, subscription.cycle);
  const status = paidUntil ? 'active' : 'pending';
  const unchanged = paidUntil === subscription.paidUntil && (subscription.status === 'cancelled' || subscription.status === status);
  if (unchanged) return { changed: false };

  await setPaidUntil(subscriptionId, paidUntil, status);
  if (revalidate) await revalidateForUser(subscription.userId);
  return { changed: true };
}

/**
 * Puxa do Asaas o que o webhook pode não ter entregado: todas as cobranças da
 * assinatura e o estado dela lá. Assinatura removida ou inativa no Asaas vira
 * `cancelled` aqui — não há mais quem gere a próxima cobrança.
 */
export async function syncFromAsaas(subscription: SubscriptionRecord, revalidate = true): Promise<void> {
  if (!subscription.asaasSubscriptionId) return;

  const payments = await listSubscriptionPayments(subscription.asaasSubscriptionId);
  for (const payment of payments) {
    await upsertPayment({
      id: payment.id,
      subscriptionId: subscription.id,
      status: payment.deleted ? 'DELETED' : payment.status,
      valueCents: toCents(payment.value),
      dueDate: payment.dueDate,
      paidAt: payment.paymentDate ?? payment.clientPaymentDate ?? null,
      invoiceUrl: payment.invoiceUrl ?? null,
    });
  }
  await recomputeSubscription(subscription.id, revalidate);

  let remote: Awaited<ReturnType<typeof getSubscription>> | null;
  try {
    remote = await getSubscription(subscription.asaasSubscriptionId);
  } catch (error) {
    if (!(error instanceof AsaasError && error.status === 404)) throw error;
    remote = null;
  }
  const alive = remote && !remote.deleted && remote.status === 'ACTIVE';
  if (!alive && subscription.status !== 'cancelled') {
    await setSubscriptionStatus(subscription.id, 'cancelled', { cancelledAt: new Date().toISOString() });
    if (revalidate) await revalidateForUser(subscription.userId);
  }
  await touchSubscriptionSync(subscription.id);
}

/** A cobrança que o lojista tem para pagar agora: a mais antiga ainda em aberto. */
export async function openPayment(subscription: SubscriptionRecord): Promise<BillingPayment | null> {
  const payments = await listPaymentsBySubscription(subscription.id);
  const open = payments.filter((payment) => payment.status === 'PENDING' || payment.status === 'OVERDUE');
  open.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return open[0] ?? null;
}

/**
 * Garante o copia-e-cola da cobrança. O QR guardado serve mesmo com o Asaas
 * fora do ar; só se busca de novo quando não existe ou já venceu.
 */
export async function ensurePixQr(payment: BillingPayment): Promise<BillingPayment> {
  const expired = payment.qrExpiresAt ? new Date(payment.qrExpiresAt).getTime() < Date.now() : false;
  if (payment.qrPayload && !expired) return payment;

  const qr = await getPixQrCode(payment.id);
  const expiresAt = qr.expirationDate ?? null;
  await savePaymentQr(payment.id, { payload: qr.payload, expiresAt });
  return { ...payment, qrPayload: qr.payload, qrExpiresAt: expiresAt };
}

/** A loja do dono sai do cache (volta ao ar, ou sai dele); sem loja, só o painel. */
export async function revalidateForUser(userId: string): Promise<void> {
  const business = await getBusinessByOwner(userId);
  if (business) revalidateStore(business.slug);
  else revalidatePath('/painel', 'layout');
}
