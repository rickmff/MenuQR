import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { demoMode } from '@/lib/demo/config';
import { serverEnv } from '@/server/env';
import { purgeExpiredRateLimits } from '@/server/rate-limit';
import { deleteOrphanImages } from '@/server/repositories/images';
import { purgeWebhookEvents } from '@/server/repositories/webhook-events';

/**
 * Limpeza diária, chamada pelo cron da Vercel (vercel.json). Cobre o que a
 * limpeza oportunista não alcança: a loja que apagou fotos e nunca mais enviou
 * nada, as janelas de limite vencidas, os eventos de webhook antigos.
 *
 * A Vercel manda `Authorization: Bearer <CRON_SECRET>` sozinha quando a
 * variável existe no projeto; qualquer outra chamada é recusada.
 */
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

function sameSecret(header: string, expected: string): boolean {
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (demoMode) return reply({ error: 'Indisponível no modo demonstração.' }, 404);

  const secret = serverEnv().CRON_SECRET;
  if (!secret) return reply({ error: 'CRON_SECRET não configurada.' }, 503);
  if (!sameSecret(request.headers.get('authorization') ?? '', `Bearer ${secret}`)) {
    return reply({ error: 'Não autorizado.' }, 401);
  }

  try {
    const imagens = await deleteOrphanImages();
    const limites = await purgeExpiredRateLimits();
    const eventos = await purgeWebhookEvents(30);
    return reply({ ok: true, imagens, limites, eventos });
  } catch (error) {
    console.error('[cron limpeza] falhou:', error);
    return reply({ error: 'Falha na limpeza.' }, 500);
  }
}
