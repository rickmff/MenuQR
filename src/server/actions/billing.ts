'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AsaasError } from '../asaas/client';
import { AsaasConfigError, asaasConfigured } from '../asaas/config';
import { requireUser } from '../auth/guards';
import { loadBillingAccess, SUBSCRIPTION_PATH } from '../billing/access';
import { billingMode } from '../billing/config';
import { cancelSubscription, refreshSubscription, startSubscription, SubscribeError } from '../billing/subscribe';
import { rateLimit } from '../rate-limit';
import { isValidCpfCnpj, normalizeCpfCnpj } from '@/lib/cpf-cnpj';
import type { FormState } from './business';

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}

const subscribeSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do titular.').max(120, 'Use até 120 caracteres.'),
  cpfCnpj: z
    .string()
    .transform(normalizeCpfCnpj)
    .refine(isValidCpfCnpj, { message: 'Confira o CPF ou CNPJ.' }),
  accept: z.literal('on', { error: 'Para assinar, aceite os termos de uso.' }),
});

const NOT_CONFIGURED = 'A cobrança não está configurada neste ambiente.';
const ASAAS_DOWN = 'O serviço de cobrança não respondeu. Tente de novo em instantes.';

/** Cria a assinatura e a primeira cobrança. A página relê o banco e mostra o QR. */
export async function startSubscriptionAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(SUBSCRIPTION_PATH);

  const parsed = subscribeSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    cpfCnpj: String(formData.get('cpfCnpj') ?? ''),
    accept: String(formData.get('accept') ?? ''),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  if (billingMode() === 'off' || !asaasConfigured()) return { error: NOT_CONFIGURED };

  const limit = await rateLimit(`assinar:${user.id}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) return { error: 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.' };

  try {
    await startSubscription(user, { name: parsed.data.name, cpfCnpj: parsed.data.cpfCnpj });
  } catch (error) {
    if (error instanceof SubscribeError) return { error: error.message };
    if (error instanceof AsaasConfigError) return { error: NOT_CONFIGURED };
    console.error('[assinatura] criação falhou:', error);
    if (error instanceof AsaasError) {
      // Documento recusado é a única recusa que o lojista resolve sozinho.
      const invalidDocument = error.errors.some((entry) => /cpf|cnpj/i.test(entry.description));
      return invalidDocument ? { fieldErrors: { cpfCnpj: 'O serviço de cobrança não aceitou este documento. Confira o CPF ou CNPJ.' } } : { error: ASAAS_DOWN };
    }
    return { error: ASAAS_DOWN };
  }

  revalidatePath('/painel', 'layout');
  return { success: 'Cobrança gerada. Pague o Pix para liberar o painel.' };
}

/** "Já paguei": consulta o Asaas e recalcula o acesso. */
export async function refreshSubscriptionAction(_state: FormState, formData: FormData): Promise<FormState> {
  void formData;
  const user = await requireUser(SUBSCRIPTION_PATH);
  if (billingMode() === 'off' || !asaasConfigured()) return { error: NOT_CONFIGURED };

  const limit = await rateLimit(`assinatura-consulta:${user.id}`, 30, 10 * 60 * 1000);
  if (!limit.allowed) return { error: 'Muitas consultas seguidas. Espere um minuto e tente de novo.' };

  try {
    const access = await refreshSubscription(user);
    revalidatePath('/painel', 'layout');
    if (access.allowed) return { success: 'Pagamento confirmado!' };
    return { error: 'Ainda não recebemos o pagamento. O Pix costuma cair em segundos; tente de novo daqui a pouco.' };
  } catch (error) {
    console.error('[assinatura] consulta falhou:', error);
    return { error: ASAAS_DOWN };
  }
}

/** Cancela a renovação. O acesso continua até o fim do período pago. */
export async function cancelSubscriptionAction(formData: FormData): Promise<void> {
  const user = await requireUser(SUBSCRIPTION_PATH);
  const subscriptionId = String(formData.get('subscriptionId') ?? '');
  const access = await loadBillingAccess(user);
  const current = access.current;
  // O id vem do formulário: só vale se for a assinatura em aberto desta conta.
  if (!current || current.id !== subscriptionId) return;
  await cancelSubscription(current);
  revalidatePath('/painel', 'layout');
}
