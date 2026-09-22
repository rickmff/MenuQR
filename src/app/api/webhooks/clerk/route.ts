import { verifyWebhook, type WebhookEvent } from '@clerk/nextjs/webhooks';
import { NextResponse, type NextRequest } from 'next/server';
import { demoMode } from '@/lib/demo/config';
import { serverEnv } from '@/server/env';
import {
  claimWebhookEvent,
  markWebhookProcessed,
  releaseWebhookEvent,
} from '@/server/repositories/webhook-events';
import { handleClerkEvent } from '@/server/webhooks/clerk';

/**
 * O Clerk avisa quando um usuário muda ou some. Serve para espelhar nome e
 * e-mail sem ir à API dele a cada página, e para não deixar cardápio sem dono
 * quando a conta é apagada pelo dashboard do Clerk (a tela do painel apaga os
 * nossos dados sozinha, antes de chamar o Clerk).
 *
 * A assinatura (Svix) é conferida antes de qualquer coisa; sem ela, qualquer
 * um apagaria contas por aqui. O `svix-id` é o mesmo em todo reenvio, então é
 * a chave de idempotência.
 */

const NO_STORE = { 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export async function POST(request: NextRequest) {
  if (demoMode) return reply({ error: 'Indisponível no modo demonstração.' }, 404);

  const secret = serverEnv().CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    console.error('[webhook clerk] CLERK_WEBHOOK_SIGNING_SECRET não configurada.');
    return reply({ error: 'Webhook não configurado.' }, 503);
  }

  let event: WebhookEvent;
  try {
    // Lê o corpo cru; nada pode consumir o body antes desta chamada.
    event = await verifyWebhook(request, { signingSecret: secret });
  } catch (error) {
    console.error('[webhook clerk] assinatura inválida:', error);
    return reply({ error: 'Assinatura inválida.' }, 400);
  }

  const svixId = request.headers.get('svix-id');
  if (!svixId) return reply({ error: 'Cabeçalho svix-id ausente.' }, 400);

  const claim = await claimWebhookEvent({
    provider: 'clerk',
    eventId: svixId,
    type: event.type,
    payload: { id: 'id' in event.data ? (event.data.id ?? null) : null },
  });
  if (claim.status === 'duplicate') return reply({ ok: true, duplicate: true });

  try {
    const result = await handleClerkEvent(event);
    await markWebhookProcessed(claim.id, result.userId);
    return reply({ ok: true, outcome: result.outcome });
  } catch (error) {
    console.error('[webhook clerk] falhou:', error);
    // Solta o evento e responde 5xx: o Svix reenvia e a próxima tentativa
    // encontra o evento como novo.
    await releaseWebhookEvent(claim.id).catch(() => undefined);
    return reply({ error: 'Erro interno.' }, 500);
  }
}
