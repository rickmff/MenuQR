'use server';

import { revalidatePath } from 'next/cache';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { AsaasError } from '../asaas/client';
import { AsaasConfigError, asaasConfigured } from '../asaas/config';
import { requireUser } from '../auth/guards';
import { loadBillingAccess, SUBSCRIPTION_PATH } from '../billing/access';
import { billingMode } from '../billing/config';
import { cancelSubscription, refreshSubscription, startSubscription, SubscribeError } from '../billing/subscribe';
import { rateLimit } from '../rate-limit';
import { isValidCpfCnpj, normalizeCpfCnpj } from '@/lib/cpf-cnpj';
import type { Translate } from '@/lib/i18n';
import type { FormState } from './business';

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}

/** O esquema nasce a cada chamada: as mensagens saem no idioma de quem envia. */
function subscribeSchema(t: Translate) {
  return z.object({
    name: z.string().trim().min(2, t('billingErrors.nameRequired')).max(120, t('billingErrors.nameTooLong')),
    cpfCnpj: z
      .string()
      .transform(normalizeCpfCnpj)
      .refine(isValidCpfCnpj, { message: t('billingErrors.invalidDocument') }),
    accept: z.literal('on', { error: t('billingErrors.acceptTerms') }),
  });
}

/** Cria a assinatura e a primeira cobrança. A página relê o banco e mostra o QR. */
export async function startSubscriptionAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(SUBSCRIPTION_PATH);
  const t = await getTranslations('account');
  const notConfigured = t('billingErrors.notConfigured');
  const asaasDown = t('billingErrors.asaasDown');

  const parsed = subscribeSchema(t).safeParse({
    name: String(formData.get('name') ?? ''),
    cpfCnpj: String(formData.get('cpfCnpj') ?? ''),
    accept: String(formData.get('accept') ?? ''),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  if (billingMode() === 'off' || !asaasConfigured()) return { error: notConfigured };

  const limit = await rateLimit(`assinar:${user.id}`, 5, 10 * 60 * 1000);
  if (!limit.allowed) return { error: t('billingErrors.tooManyAttempts') };

  try {
    await startSubscription(user, { name: parsed.data.name, cpfCnpj: parsed.data.cpfCnpj });
  } catch (error) {
    if (error instanceof SubscribeError) return { error: t(`billingErrors.${error.code}`) };
    if (error instanceof AsaasConfigError) return { error: notConfigured };
    console.error('[assinatura] criação falhou:', error);
    if (error instanceof AsaasError) {
      // Documento recusado é a única recusa que o lojista resolve sozinho.
      const invalidDocument = error.errors.some((entry) => /cpf|cnpj/i.test(entry.description));
      return invalidDocument ? { fieldErrors: { cpfCnpj: t('billingErrors.documentRejected') } } : { error: asaasDown };
    }
    return { error: asaasDown };
  }

  revalidatePath('/painel', 'layout');
  return { success: t('billingSuccess.chargeCreated') };
}

/** "Já paguei": consulta o Asaas e recalcula o acesso. */
export async function refreshSubscriptionAction(_state: FormState, formData: FormData): Promise<FormState> {
  void formData;
  const user = await requireUser(SUBSCRIPTION_PATH);
  const t = await getTranslations('account');
  if (billingMode() === 'off' || !asaasConfigured()) return { error: t('billingErrors.notConfigured') };

  const limit = await rateLimit(`assinatura-consulta:${user.id}`, 30, 10 * 60 * 1000);
  if (!limit.allowed) return { error: t('billingErrors.tooManyChecks') };

  try {
    const access = await refreshSubscription(user);
    revalidatePath('/painel', 'layout');
    if (access.allowed) return { success: t('billingSuccess.paymentConfirmed') };
    return { error: t('billingErrors.notReceived') };
  } catch (error) {
    console.error('[assinatura] consulta falhou:', error);
    return { error: t('billingErrors.asaasDown') };
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
