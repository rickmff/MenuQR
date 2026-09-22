import 'server-only';
import { db, isUniqueViolation } from '../db/client';
import { ensureSchema } from '../db/migrate';

export type WebhookProvider = 'clerk' | 'asaas';

export type WebhookClaim = { status: 'claimed'; id: string } | { status: 'duplicate' };

/**
 * Reivindica um evento pelo id que o remetente deu a ele. Clerk (Svix) e Asaas
 * entregam "pelo menos uma vez", e o mesmo evento pode chegar duas vezes ao
 * mesmo tempo em instâncias diferentes: o INSERT com chave primária é a
 * disputa, e quem perde vê `duplicate`.
 *
 * Uma reivindicação antiga sem `processed_at` é de uma instância que morreu no
 * meio: depois de dez minutos o evento pode ser retomado pelo reenvio.
 */
export async function claimWebhookEvent(input: {
  provider: WebhookProvider;
  eventId: string;
  type: string;
  payload?: unknown;
}): Promise<WebhookClaim> {
  await ensureSchema();
  const id = `${input.provider}:${input.eventId}`;
  try {
    await db.execute({
      sql: 'INSERT INTO webhook_events (id, provider, type, payload) VALUES (?, ?, ?, ?)',
      args: [id, input.provider, input.type, JSON.stringify(input.payload ?? {})],
    });
    return { status: 'claimed', id };
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  const existing = await db.execute({
    sql: `SELECT processed_at, (received_at > datetime('now', '-10 minutes')) AS recent
          FROM webhook_events WHERE id = ? LIMIT 1`,
    args: [id],
  });
  const row = existing.rows[0];
  if (!row || row.processed_at != null || Number(row.recent) === 1) return { status: 'duplicate' };

  await db.execute({
    sql: "UPDATE webhook_events SET received_at = datetime('now'), error = NULL WHERE id = ?",
    args: [id],
  });
  return { status: 'claimed', id };
}

export async function markWebhookProcessed(id: string, refId: string | null = null, error: string | null = null): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: "UPDATE webhook_events SET processed_at = datetime('now'), ref_id = ?, error = ? WHERE id = ?",
    args: [refId, error, id],
  });
}

/** Solta a reivindicação: o reenvio do remetente encontra o evento como novo. */
export async function releaseWebhookEvent(id: string): Promise<void> {
  await ensureSchema();
  await db.execute({ sql: 'DELETE FROM webhook_events WHERE id = ?', args: [id] });
}

/** Eventos velhos só ocupam espaço; o remetente também não reenvia depois de dias. */
export async function purgeWebhookEvents(days = 30): Promise<number> {
  await ensureSchema();
  const result = await db.execute({
    sql: "DELETE FROM webhook_events WHERE received_at < datetime('now', ?)",
    args: [`-${Math.max(1, Math.floor(days))} days`],
  });
  return result.rowsAffected;
}
