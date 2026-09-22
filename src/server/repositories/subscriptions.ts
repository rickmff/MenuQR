import 'server-only';
import { db } from '../db/client';
import { ensureSchema } from '../db/migrate';
import { mapPayment, mapSubscription } from './mappers';
import type { BillingCycle, BillingPayment, SubscriptionRecord, SubscriptionStatus } from '@/lib/billing';

/* ------------------------------------------------------------- assinaturas */

/** Todas as assinaturas da conta, a mais recente primeiro — é a ordem que `summarizeBilling` espera. */
export async function listSubscriptionsByUser(userId: string): Promise<SubscriptionRecord[]> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC',
    args: [userId],
  });
  return result.rows.map(mapSubscription);
}

export async function getSubscriptionById(id: string): Promise<SubscriptionRecord | null> {
  await ensureSchema();
  const result = await db.execute({ sql: 'SELECT * FROM subscriptions WHERE id = ? LIMIT 1', args: [id] });
  const row = result.rows[0];
  return row ? mapSubscription(row) : null;
}

export async function getSubscriptionByAsaasId(asaasSubscriptionId: string): Promise<SubscriptionRecord | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT * FROM subscriptions WHERE asaas_subscription_id = ? LIMIT 1',
    args: [asaasSubscriptionId],
  });
  const row = result.rows[0];
  return row ? mapSubscription(row) : null;
}

/** A assinatura em aberto do cliente do Asaas — reserva para casar um webhook que chegou sem o id da assinatura. */
export async function findOpenSubscriptionByCustomer(asaasCustomerId: string): Promise<SubscriptionRecord | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: `SELECT * FROM subscriptions WHERE asaas_customer_id = ? AND status IN ('pending', 'active')
          ORDER BY created_at DESC LIMIT 1`,
    args: [asaasCustomerId],
  });
  const row = result.rows[0];
  return row ? mapSubscription(row) : null;
}

/** Cria a linha ANTES de falar com o Asaas: o `externalReference` de lá é este id. Lança em violação do índice de "uma em aberto". */
export async function insertSubscription(input: {
  id: string;
  userId: string;
  asaasCustomerId: string;
  cycle: BillingCycle;
  amountCents: number;
}): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: `INSERT INTO subscriptions (id, user_id, asaas_customer_id, status, cycle, amount_cents)
          VALUES (?, ?, ?, 'pending', ?, ?)`,
    args: [input.id, input.userId, input.asaasCustomerId, input.cycle, input.amountCents],
  });
}

export async function attachAsaasSubscription(id: string, asaasSubscriptionId: string): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: "UPDATE subscriptions SET asaas_subscription_id = ?, updated_at = datetime('now') WHERE id = ?",
    args: [asaasSubscriptionId, id],
  });
}

export async function setSubscriptionStatus(
  id: string,
  status: SubscriptionStatus,
  extra: { cancelledAt?: string | null } = {},
): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: `UPDATE subscriptions SET status = ?, cancelled_at = COALESCE(?, cancelled_at), updated_at = datetime('now')
          WHERE id = ?`,
    args: [status, extra.cancelledAt ?? null, id],
  });
}

/**
 * Grava o prazo recalculado. Assinatura cancelada continua cancelada: o
 * cancelamento é decisão do lojista, e um pagamento que chega depois só
 * estende o prazo dela.
 */
export async function setPaidUntil(id: string, paidUntil: string | null, status: 'pending' | 'active'): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: `UPDATE subscriptions
          SET paid_until = ?,
              status = CASE WHEN status = 'cancelled' THEN status ELSE ? END,
              updated_at = datetime('now')
          WHERE id = ?`,
    args: [paidUntil, status, id],
  });
}

export async function touchSubscriptionSync(id: string): Promise<void> {
  await ensureSchema();
  await db.execute({ sql: "UPDATE subscriptions SET synced_at = datetime('now') WHERE id = ?", args: [id] });
}

/** Só a linha que nunca chegou ao Asaas (a criação falhou); as outras viram `cancelled`. */
export async function deleteUnattachedSubscription(id: string): Promise<void> {
  await ensureSchema();
  await db.execute({ sql: 'DELETE FROM subscriptions WHERE id = ? AND asaas_subscription_id IS NULL', args: [id] });
}

/* --------------------------------------------------------------- cobranças */

export async function listPaymentsBySubscription(subscriptionId: string): Promise<BillingPayment[]> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT * FROM billing_payments WHERE subscription_id = ? ORDER BY due_date DESC, created_at DESC',
    args: [subscriptionId],
  });
  return result.rows.map(mapPayment);
}

/** Espelha a cobrança como o Asaas mandou. O QR não entra aqui: ele é pedido à parte e guardado por `savePaymentQr`. */
export async function upsertPayment(input: {
  id: string;
  subscriptionId: string;
  status: string;
  valueCents: number;
  dueDate: string;
  paidAt: string | null;
  invoiceUrl: string | null;
}): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: `INSERT INTO billing_payments (id, subscription_id, status, value_cents, due_date, paid_at, invoice_url)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            value_cents = excluded.value_cents,
            due_date = excluded.due_date,
            paid_at = excluded.paid_at,
            invoice_url = COALESCE(excluded.invoice_url, billing_payments.invoice_url),
            updated_at = datetime('now')`,
    args: [input.id, input.subscriptionId, input.status, input.valueCents, input.dueDate, input.paidAt, input.invoiceUrl],
  });
}

export async function savePaymentQr(id: string, qr: { payload: string; expiresAt: string | null }): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: "UPDATE billing_payments SET qr_payload = ?, qr_expires_at = ?, updated_at = datetime('now') WHERE id = ?",
    args: [qr.payload, qr.expiresAt, id],
  });
}

/* ------------------------------------------------------------ loja pública */

export interface BillingRows {
  exempt: boolean;
  rows: SubscriptionRecord[];
}

/**
 * O que a loja pública precisa para decidir se está no ar: a isenção do dono e
 * as assinaturas dele. Uma consulta por tabela, sem passar pelo tipo
 * `Business` (que não expõe o dono de propósito).
 */
export async function getBillingRowsForBusiness(businessId: string): Promise<BillingRows | null> {
  await ensureSchema();
  const owner = await db.execute({
    sql: `SELECT users.id AS owner_id, users.billing_exempt FROM businesses
          JOIN users ON users.id = businesses.owner_id WHERE businesses.id = ? LIMIT 1`,
    args: [businessId],
  });
  const row = owner.rows[0];
  if (!row) return null;
  return {
    exempt: Number(row.billing_exempt) === 1,
    rows: await listSubscriptionsByUser(String(row.owner_id)),
  };
}

/** Versão em lote, para o sitemap e a pré-renderização: dono → isenção e assinaturas. */
export async function getBillingRowsByOwners(ownerIds: string[]): Promise<Map<string, BillingRows>> {
  await ensureSchema();
  const map = new Map<string, BillingRows>();
  if (ownerIds.length === 0) return map;
  const placeholders = ownerIds.map(() => '?').join(', ');
  const [users, subscriptions] = await db.batch(
    [
      { sql: `SELECT id, billing_exempt FROM users WHERE id IN (${placeholders})`, args: ownerIds },
      {
        sql: `SELECT * FROM subscriptions WHERE user_id IN (${placeholders}) ORDER BY created_at DESC, rowid DESC`,
        args: ownerIds,
      },
    ],
    'read',
  );
  for (const row of users?.rows ?? []) {
    map.set(String(row.id), { exempt: Number(row.billing_exempt) === 1, rows: [] });
  }
  for (const row of subscriptions?.rows ?? []) {
    map.get(String(row.user_id))?.rows.push(mapSubscription(row));
  }
  return map;
}
