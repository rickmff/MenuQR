import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { demoMode } from '@/lib/demo/config';
import { asaasWebhookToken } from '@/server/asaas/config';
import type { AsaasWebhookEvent } from '@/server/asaas/types';
import { billingMode } from '@/server/billing/config';
import { handleAsaasEvent } from '@/server/billing/webhook';
import { claimWebhookEvent, markWebhookProcessed } from '@/server/repositories/webhook-events';

/**
 * O Asaas avisa de cada mudança numa cobrança. É por aqui que o Pix pago vira
 * prazo na assinatura e a loja volta ao ar.
 *
 * Duas regras que parecem estranhas e não são:
 * - o token é conferido antes de ler o corpo, em tempo constante;
 * - a resposta é SEMPRE 200 depois de reconhecido o evento. Devolver 5xx faz o
 *   Asaas reenviar e, com 15 falhas seguidas, pausar a fila inteira — um bug
 *   determinístico num evento travaria todos os outros. Um evento que falhou
 *   fica gravado com o erro, e o "Já paguei" do painel reconcilia puxando as
 *   cobranças do Asaas.
 */

const MAX_BODY_BYTES = 64 * 1024;
const NO_STORE = { 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

function sameToken(received: string, expected: string): boolean {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (demoMode || billingMode() === 'off') return reply({ error: 'Cobrança desligada.' }, 503);

  const expected = asaasWebhookToken();
  if (!expected) {
    console.error('[webhook asaas] ASAAS_WEBHOOK_TOKEN não configurado.');
    return reply({ error: 'Webhook não configurado.' }, 503);
  }
  if (!sameToken(request.headers.get('asaas-access-token') ?? '', expected)) {
    return reply({ error: 'Não autorizado.' }, 401);
  }

  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return reply({ error: 'Corpo grande demais.' }, 413);
  let event: AsaasWebhookEvent;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return reply({ error: 'Corpo grande demais.' }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return reply({ error: 'Evento inválido.' }, 400);
    const candidate = parsed as Partial<AsaasWebhookEvent>;
    if (typeof candidate.id !== 'string' || typeof candidate.event !== 'string') return reply({ error: 'Evento inválido.' }, 400);
    event = candidate as AsaasWebhookEvent;
  } catch {
    return reply({ error: 'Evento inválido.' }, 400);
  }

  const claim = await claimWebhookEvent({
    provider: 'asaas',
    eventId: event.id,
    type: event.event,
    payload: { payment: event.payment?.id ?? null, subscription: event.payment?.subscription ?? null },
  });
  if (claim.status === 'duplicate') return reply({ ok: true, duplicate: true });

  try {
    const result = await handleAsaasEvent(event);
    await markWebhookProcessed(claim.id, result.subscriptionId);
    return reply({ ok: true, outcome: result.outcome });
  } catch (error) {
    console.error('[webhook asaas] falhou:', error);
    const message = error instanceof Error ? error.message : String(error);
    await markWebhookProcessed(claim.id, null, message).catch(() => undefined);
    return reply({ ok: false, error: 'Registrado para reconciliação.' });
  }
}
