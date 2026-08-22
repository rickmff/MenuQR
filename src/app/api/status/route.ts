import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico da instalação: diz se a aplicação está no ar e se o banco
 * responde. Não expõe URL, credenciais nem detalhes internos.
 */
export async function GET() {
  let database: 'ok' | 'sem-configuracao' | 'indisponivel' = 'ok';

  try {
    const { ensureSchema } = await import('@/server/db/migrate');
    const { db } = await import('@/server/db/client');
    await ensureSchema();
    await db.execute('SELECT 1');
  } catch (error) {
    const { DatabaseConfigError } = await import('@/server/db/client');
    database = error instanceof DatabaseConfigError ? 'sem-configuracao' : 'indisponivel';
    console.error('[status] banco indisponível:', error);
  }

  return NextResponse.json(
    {
      ok: database === 'ok',
      app: 'MenuQR',
      database,
      environment: process.env.VERCEL ? 'vercel' : 'servidor',
      time: new Date().toISOString(),
    },
    {
      status: database === 'ok' ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
