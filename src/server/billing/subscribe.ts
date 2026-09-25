import 'server-only';
import { randomUUID } from 'node:crypto';
import { AsaasError } from '../asaas/client';
import { createCustomer, updateCustomer } from '../asaas/customers';
import { createSubscription, deleteSubscription } from '../asaas/subscriptions';
import { isUniqueViolation } from '../db/client';
import { getBusinessByOwner } from '../repositories/businesses';
import {
  attachAsaasSubscription,
  deleteUnattachedSubscription,
  getSubscriptionById,
  insertSubscription,
  setSubscriptionStatus,
} from '../repositories/subscriptions';
import { getBillingIdentity, saveBillingIdentity } from '../repositories/users';
import { loadBillingAccess } from './access';
import { ensurePixQr, openPayment, syncFromAsaas } from './lifecycle';
import { BILLING_PLAN, todaySP, type BillingAccess, type SubscriptionRecord } from '@/lib/billing';
import type { User } from '@/lib/types';

/**
 * Erro que a tela mostra. `code` é a chave em `account.billingErrors`: a
 * Server Action traduz no idioma de quem assina.
 */
export class SubscribeError extends Error {
  constructor(readonly code: 'alreadyActive' | 'inProgress' | 'saveFailed') {
    super(code);
  }
}

/** Celular no formato que o Asaas espera (DDD + número), só quando o WhatsApp é do Brasil. */
function mobilePhoneOf(whatsapp: string | undefined): string | undefined {
  if (!whatsapp?.startsWith('55')) return undefined;
  const local = whatsapp.slice(2);
  return local.length === 10 || local.length === 11 ? local : undefined;
}

/**
 * Acha ou cria o cliente do lojista no Asaas e guarda o documento e o id.
 * Com cliente existente, atualiza: o lojista pode ter trocado o CPF pelo
 * CNPJ, e o nome do titular sai no comprovante.
 */
async function ensureCustomer(user: User, input: { name: string; cpfCnpj: string }): Promise<string> {
  const identity = await getBillingIdentity(user.id);
  const business = await getBusinessByOwner(user.id);
  const payload = {
    name: input.name,
    cpfCnpj: input.cpfCnpj,
    email: user.email,
    mobilePhone: mobilePhoneOf(business?.whatsapp),
    externalReference: user.id,
  };
  const customer = identity.asaasCustomerId
    ? await updateCustomer(identity.asaasCustomerId, payload)
    : await createCustomer(payload);
  await saveBillingIdentity(user.id, { cpfCnpj: input.cpfCnpj, asaasCustomerId: customer.id });
  return customer.id;
}

/**
 * Cria a assinatura anual no Asaas e devolve a nossa linha, já com a primeira
 * cobrança espelhada e o QR dela guardado.
 *
 * A linha nossa é gravada ANTES da chamada ao Asaas, com o id que vai no
 * `externalReference`: um webhook que chegue cedo demais já encontra a
 * assinatura. Se o Asaas recusar, a linha some.
 */
export async function startSubscription(user: User, input: { name: string; cpfCnpj: string }): Promise<SubscriptionRecord> {
  const access = await loadBillingAccess(user);
  if (access.current?.status === 'active') throw new SubscribeError('alreadyActive');
  // Pendente sem pagamento: o lojista quer outro CPF ou outro QR — começa de novo.
  if (access.current?.status === 'pending') await cancelSubscription(access.current);

  const asaasCustomerId = await ensureCustomer(user, input);

  // Quem reativa dentro de um período pago não paga duas vezes: a primeira
  // cobrança vence quando o período atual acaba.
  const today = todaySP();
  const nextDueDate = access.paidUntil && access.paidUntil > today ? access.paidUntil : today;

  const id = randomUUID().replace(/-/g, '');
  try {
    await insertSubscription({ id, userId: user.id, asaasCustomerId, cycle: BILLING_PLAN.cycle, amountCents: BILLING_PLAN.amountCents });
  } catch (error) {
    if (isUniqueViolation(error)) throw new SubscribeError('inProgress');
    throw error;
  }

  let remote;
  try {
    remote = await createSubscription({
      customer: asaasCustomerId,
      value: BILLING_PLAN.amountCents / 100,
      nextDueDate,
      cycle: BILLING_PLAN.cycle,
      description: BILLING_PLAN.description,
      externalReference: id,
    });
  } catch (error) {
    await deleteUnattachedSubscription(id).catch(() => undefined);
    throw error;
  }
  await attachAsaasSubscription(id, remote.id);

  const subscription = await getSubscriptionById(id);
  if (!subscription) throw new SubscribeError('saveFailed');

  // A primeira cobrança costuma nascer junto com a assinatura; se ainda não
  // veio, a tela espera o webhook (o poller recarrega sozinho).
  await syncFromAsaas(subscription);
  const open = await openPayment(subscription);
  if (open) await ensurePixQr(open).catch((error) => console.error('[assinatura] QR da cobrança falhou:', error));

  return (await getSubscriptionById(id)) ?? subscription;
}

/** Cancela no Asaas (some a cobrança pendente lá) e marca aqui. Acesso fica até `paid_until`. */
export async function cancelSubscription(subscription: SubscriptionRecord): Promise<void> {
  if (!subscription.asaasSubscriptionId) {
    await deleteUnattachedSubscription(subscription.id);
    return;
  }
  try {
    await deleteSubscription(subscription.asaasSubscriptionId);
  } catch (error) {
    // Já não existe lá: o estado que queremos.
    if (!(error instanceof AsaasError && error.status === 404)) throw error;
  }
  await setSubscriptionStatus(subscription.id, 'cancelled', { cancelledAt: new Date().toISOString() });
}

const REFRESH_COOLDOWN_MS = 20_000;

/**
 * "Já paguei": consulta o Asaas (com um freio para não virar martelo no botão)
 * e devolve o acesso recalculado, sem cache.
 */
export async function refreshSubscription(user: User): Promise<BillingAccess> {
  const before = await loadBillingAccess(user);
  const current = before.current;
  if (current?.asaasSubscriptionId) {
    const lastSync = current.syncedAt ? new Date(`${current.syncedAt}Z`).getTime() : 0;
    if (Date.now() - lastSync > REFRESH_COOLDOWN_MS) await syncFromAsaas(current);
  }
  return loadBillingAccess(user);
}
