import 'server-only';
import { headers } from 'next/headers';
import { db } from './db/client';
import { ensureSchema } from './db/migrate';

export interface RateLimitResult {
  allowed: boolean;
  retryInSeconds: number;
}

/**
 * Limite de tentativas guardado no banco.
 *
 * Antes o contador vivia na memória do processo: em serverless cada instância
 * tinha o seu, então o limite quase não limitava. No banco ele vale para todas
 * as instâncias. O incremento é um único UPSERT — duas requisições simultâneas
 * não conseguem ler o mesmo valor e passar as duas.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  await ensureSchema();
  const now = Date.now();

  const result = await db.execute({
    sql: `INSERT INTO rate_limits (key, count, reset_at) VALUES (?, 1, ?)
          ON CONFLICT(key) DO UPDATE SET
            count    = CASE WHEN rate_limits.reset_at <= ? THEN 1 ELSE rate_limits.count + 1 END,
            reset_at = CASE WHEN rate_limits.reset_at <= ? THEN excluded.reset_at ELSE rate_limits.reset_at END
          RETURNING count, reset_at`,
    args: [key, now + windowMs, now, now],
  });

  const row = result.rows[0];
  const count = Number(row?.count ?? 1);
  const resetAt = Number(row?.reset_at ?? now + windowMs);

  // Limpeza oportunista: uma em cada ~50 chamadas varre as janelas vencidas.
  if (Math.random() < 0.02) {
    void db.execute({ sql: 'DELETE FROM rate_limits WHERE reset_at <= ?', args: [now] }).catch(() => {
      /* falhar na limpeza não pode derrubar quem chamou */
    });
  }

  if (count > limit) return { allowed: false, retryInSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)) };
  return { allowed: true, retryInSeconds: 0 };
}

export async function resetRateLimit(key: string): Promise<void> {
  await ensureSchema();
  await db.execute({ sql: 'DELETE FROM rate_limits WHERE key = ?', args: [key] });
}

/**
 * IP de quem fez a requisição, como o proxy da hospedagem informa. Serve só
 * para agrupar tentativas: atrás de um proxy que não repassa o cabeçalho, todo
 * mundo cai em "desconhecido" e o limite por IP vira um limite global folgado.
 */
export async function clientIp(): Promise<string> {
  const list = await headers();
  const forwarded = list.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || list.get('x-real-ip') || 'desconhecido';
}
