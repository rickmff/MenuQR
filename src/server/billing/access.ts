import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { listSubscriptionsByUser } from '../repositories/subscriptions';
import { billingMode } from './config';
import { summarizeBilling, todaySP, type BillingAccess } from '@/lib/billing';
import type { User } from '@/lib/types';

export const SUBSCRIPTION_PATH = '/painel/assinatura';

/**
 * O que a conta pode fazer hoje, lido uma vez por requisição. Conta isenta e
 * cobrança desligada passam sem ir ao banco.
 */
export const getBillingAccess = cache(async (user: User): Promise<BillingAccess> => {
  if (billingMode() === 'off' || user.billingExempt) return summarizeBilling([], todaySP(), true);
  return summarizeBilling(await listSubscriptionsByUser(user.id), todaySP());
});

/** Sem leitura em cache — para depois de uma escrita, quando a resposta precisa refletir o banco. */
export async function loadBillingAccess(user: User): Promise<BillingAccess> {
  if (billingMode() === 'off' || user.billingExempt) return summarizeBilling([], todaySP(), true);
  return summarizeBilling(await listSubscriptionsByUser(user.id), todaySP());
}

/** Páginas do painel: quem não tem acesso vai pagar. */
export async function requireSubscription(user: User): Promise<BillingAccess> {
  const access = await getBillingAccess(user);
  if (!access.allowed) redirect(SUBSCRIPTION_PATH);
  return access;
}

/** Ações e rotas: lança, e quem chama devolve `{ error }` como já faz com `assertOwnership`. */
export async function assertSubscription(user: User): Promise<BillingAccess> {
  const access = await getBillingAccess(user);
  if (!access.allowed) throw new Error('Sua assinatura não está ativa. Renove em Assinatura para continuar.');
  return access;
}
