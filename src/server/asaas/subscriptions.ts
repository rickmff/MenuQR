import 'server-only';
import { asaasRequest } from './client';
import type { AsaasList, AsaasPayment, AsaasSubscription } from './types';

export interface SubscriptionInput {
  customer: string;
  /** Em reais, como o Asaas espera (588 = R$ 588,00). */
  value: number;
  /** `YYYY-MM-DD`: vencimento da primeira cobrança. */
  nextDueDate: string;
  cycle: 'YEARLY' | 'MONTHLY';
  description: string;
  /** O nosso id da assinatura: volta em cada cobrança e casa o webhook. */
  externalReference: string;
}

/** Só Pix: é a única forma de pagamento do plano. A criação não confirma pagamento nenhum. */
export function createSubscription(input: SubscriptionInput): Promise<AsaasSubscription> {
  return asaasRequest<AsaasSubscription>('POST', '/subscriptions', { ...input, billingType: 'PIX' });
}

export function getSubscription(id: string): Promise<AsaasSubscription> {
  return asaasRequest<AsaasSubscription>('GET', `/subscriptions/${encodeURIComponent(id)}`);
}

/** Remove a assinatura e as cobranças pendentes/vencidas dela; as pagas ficam. */
export function deleteSubscription(id: string): Promise<{ deleted: boolean; id: string }> {
  return asaasRequest<{ deleted: boolean; id: string }>('DELETE', `/subscriptions/${encodeURIComponent(id)}`);
}

/** As cobranças já geradas da assinatura (a próxima só aparece quando o Asaas a gera). */
export async function listSubscriptionPayments(id: string): Promise<AsaasPayment[]> {
  const list = await asaasRequest<AsaasList<AsaasPayment>>(
    'GET',
    `/subscriptions/${encodeURIComponent(id)}/payments?limit=100`,
  );
  return list.data ?? [];
}
