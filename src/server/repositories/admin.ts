import "server-only";
import type { Row } from "@libsql/client";
import { billingMode } from "../billing/config";
import { db } from "../db/client";
import { ensureSchema } from "../db/migrate";
import { mapPayment, mapSubscription } from "./mappers";
import {
  ACCOUNT_STATUSES,
  accountStatus,
  foldForSearch,
  type AccountStatus,
} from "@/lib/admin";
import {
  addDays,
  PAID_STATUSES,
  summarizeBilling,
  todaySP,
  type BillingAccess,
  type BillingPayment,
  type SubscriptionRecord,
} from "@/lib/billing";

/**
 * O que só o /admin lê e escreve: a plataforma vista por cima, atravessando as
 * tabelas. As telas do lojista nunca passam por aqui — e daqui nunca sai o
 * CPF, que o painel não precisa mostrar a ninguém.
 *
 * A situação da cobrança é decidida em JS, com o mesmo `summarizeBilling` da
 * loja, e não em SQL: uma segunda versão da regra ia divergir da primeira.
 * Por isso a lista carrega todas as contas de uma vez e filtra na memória — na
 * escala de uma plataforma de assinatura anual, milhares de linhas no máximo.
 */

export interface AdminAccount {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  billingExempt: boolean;
  /** Já entrou pelo Clerk. Conta de antes dele fica sem até o lojista entrar de novo. */
  clerkLinked: boolean;
  /** O restaurante da conta (a plataforma trabalha com um por conta). */
  business: {
    id: string;
    name: string;
    slug: string;
    published: boolean;
  } | null;
  billing: BillingAccess;
  status: AccountStatus;
  /** O cardápio abre para o cliente: publicado e com a cobrança em dia (ou desligada). */
  live: boolean;
}

export interface AdminAccountDetail extends AdminAccount {
  clerkUserId: string | null;
  asaasCustomerId: string | null;
  subscriptions: SubscriptionRecord[];
  /** As cobranças de todas as assinaturas da conta, da mais recente para a mais antiga. */
  payments: BillingPayment[];
  menu: { categories: number; items: number; available: number } | null;
}

/** A conta com o primeiro restaurante dela, numa linha. */
const SELECT_ACCOUNTS = `SELECT users.id, users.name, users.email, users.created_at, users.billing_exempt,
    users.clerk_user_id, users.asaas_customer_id,
    businesses.id AS business_id, businesses.name AS business_name,
    businesses.slug AS business_slug, businesses.published AS business_published
  FROM users
  LEFT JOIN businesses ON businesses.id = (
    SELECT id FROM businesses WHERE owner_id = users.id ORDER BY created_at LIMIT 1
  )`;

const nullable = (value: unknown): string | null =>
  value == null || value === "" ? null : String(value);

function groupSubscriptions(rows: Row[]): Map<string, SubscriptionRecord[]> {
  const byUser = new Map<string, SubscriptionRecord[]>();
  for (const row of rows) {
    const record = mapSubscription(row);
    const list = byUser.get(record.userId);
    if (list) list.push(record);
    else byUser.set(record.userId, [record]);
  }
  return byUser;
}

function toAccount(
  row: Row,
  subscriptions: SubscriptionRecord[],
  today: string,
): AdminAccount {
  const billingExempt = Number(row.billing_exempt) === 1;
  // A isenção de verdade, e não "cobrança desligada": com `BILLING_MODE=off`
  // a conta continua mostrando o que tem no banco, e só o "no ar" muda.
  const billing = summarizeBilling(subscriptions, today, billingExempt);
  const business = row.business_id
    ? {
        id: String(row.business_id),
        name: String(row.business_name ?? ""),
        slug: String(row.business_slug ?? ""),
        published: Number(row.business_published) === 1,
      }
    : null;
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    email: String(row.email ?? ""),
    createdAt: String(row.created_at ?? ""),
    billingExempt,
    clerkLinked: row.clerk_user_id != null,
    business,
    billing,
    status: accountStatus(billing),
    live:
      Boolean(business?.published) &&
      (billingMode() === "off" || billing.allowed),
  };
}

/** Todas as contas, a mais nova primeiro. Duas consultas, qualquer que seja o total. */
async function loadAccounts(): Promise<AdminAccount[]> {
  await ensureSchema();
  const [users, subscriptions] = await db.batch(
    [
      `${SELECT_ACCOUNTS} ORDER BY users.created_at DESC, users.rowid DESC`,
      "SELECT * FROM subscriptions ORDER BY created_at DESC, rowid DESC",
    ],
    "read",
  );
  const byUser = groupSubscriptions(subscriptions?.rows ?? []);
  const today = todaySP();
  return (users?.rows ?? []).map((row) =>
    toAccount(row, byUser.get(String(row.id)) ?? [], today),
  );
}

/* ------------------------------------------------------------------ contas */

export const ACCOUNTS_PAGE_SIZE = 50;

export interface AccountList {
  accounts: AdminAccount[];
  /** Quantas contas passam no filtro, somando todas as páginas. */
  total: number;
  page: number;
  pageCount: number;
}

/** Busca por nome, e-mail, restaurante ou link do cardápio, sem diferenciar acento nem caixa. */
export async function listAccounts(filter: {
  query?: string;
  status?: AccountStatus | null;
  page?: number;
}): Promise<AccountList> {
  const needle = foldForSearch(filter.query ?? "");
  const matching = (await loadAccounts()).filter((account) => {
    if (filter.status && account.status !== filter.status) return false;
    if (!needle) return true;
    const haystack = [
      account.name,
      account.email,
      account.business?.name ?? "",
      account.business?.slug ?? "",
    ];
    return haystack.some((value) => foldForSearch(value).includes(needle));
  });

  const pageCount = Math.max(
    1,
    Math.ceil(matching.length / ACCOUNTS_PAGE_SIZE),
  );
  const page = Math.min(Math.max(1, Math.floor(filter.page ?? 1)), pageCount);
  const start = (page - 1) * ACCOUNTS_PAGE_SIZE;
  return {
    accounts: matching.slice(start, start + ACCOUNTS_PAGE_SIZE),
    total: matching.length,
    page,
    pageCount,
  };
}

export async function getAdminAccount(
  userId: string,
): Promise<AdminAccountDetail | null> {
  await ensureSchema();
  const [users, subscriptions, payments] = await db.batch(
    [
      { sql: `${SELECT_ACCOUNTS} WHERE users.id = ? LIMIT 1`, args: [userId] },
      {
        sql: "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC",
        args: [userId],
      },
      {
        sql: `SELECT billing_payments.* FROM billing_payments
              JOIN subscriptions ON subscriptions.id = billing_payments.subscription_id
              WHERE subscriptions.user_id = ?
              ORDER BY billing_payments.due_date DESC, billing_payments.created_at DESC`,
        args: [userId],
      },
    ],
    "read",
  );
  const row = users?.rows[0];
  if (!row) return null;

  const records = (subscriptions?.rows ?? []).map(mapSubscription);
  const account = toAccount(row, records, todaySP());

  let menu: AdminAccountDetail["menu"] = null;
  if (account.business) {
    const counts = await db.execute({
      sql: `SELECT
              (SELECT COUNT(*) FROM categories WHERE business_id = ?) AS categories,
              (SELECT COUNT(*) FROM items WHERE business_id = ?) AS items,
              (SELECT COUNT(*) FROM items WHERE business_id = ? AND available = 1) AS available`,
      args: [account.business.id, account.business.id, account.business.id],
    });
    const totals = counts.rows[0];
    menu = {
      categories: Number(totals?.categories ?? 0),
      items: Number(totals?.items ?? 0),
      available: Number(totals?.available ?? 0),
    };
  }

  return {
    ...account,
    clerkUserId: nullable(row.clerk_user_id),
    asaasCustomerId: nullable(row.asaas_customer_id),
    subscriptions: records,
    payments: (payments?.rows ?? []).map(mapPayment),
    menu,
  };
}

/**
 * Cortesia: a conta deixa de ser cobrada (e volta a ser, ao desligar). Não
 * mexe na assinatura do Asaas — uma cobrança já emitida continua lá, e a
 * isenção só faz o acesso não depender dela.
 */
export async function setBillingExempt(
  userId: string,
  exempt: boolean,
): Promise<boolean> {
  await ensureSchema();
  const result = await db.execute({
    sql: "UPDATE users SET billing_exempt = ? WHERE id = ?",
    args: [exempt ? 1 : 0, userId],
  });
  return result.rowsAffected > 0;
}

/* --------------------------------------------------------------- webhooks */

/**
 * Evento com problema: o processamento gravou um erro, ou foi reivindicado há
 * mais de dez minutos e nunca concluído — a instância morreu no meio (veja
 * `claimWebhookEvent`). O Clerk que falha não aparece aqui: o evento é solto e
 * o Svix reenvia.
 */
const WEBHOOK_STUCK = `(webhook_events.processed_at IS NULL
  AND webhook_events.received_at < datetime('now', '-10 minutes'))`;
const WEBHOOK_PROBLEM = `(webhook_events.error IS NOT NULL OR ${WEBHOOK_STUCK})`;

/** `processing`: reivindicado há menos de dez minutos — ainda pode terminar. */
export type WebhookEventStatus = "processed" | "failed" | "stuck" | "processing";

export interface WebhookEventRecord {
  id: string;
  provider: string;
  type: string;
  refId: string | null;
  /** A conta que o evento tocou, quando ela ainda existe. */
  accountId: string | null;
  error: string | null;
  status: WebhookEventStatus;
  receivedAt: string;
}

function webhookStatus(row: Row): WebhookEventStatus {
  if (row.error != null) return "failed";
  if (row.processed_at != null) return "processed";
  return Number(row.stuck) === 1 ? "stuck" : "processing";
}

export const WEBHOOK_LIST_LIMIT = 100;

/**
 * Os eventos mais recentes. O `ref_id` do Clerk já é a conta; o do Asaas é a
 * assinatura, e o JOIN acha a conta dona dela.
 */
export async function listWebhookEvents(
  filter: { problemsOnly?: boolean } = {},
): Promise<WebhookEventRecord[]> {
  await ensureSchema();
  const result = await db.execute({
    sql: `SELECT webhook_events.*, users.id AS account_id, ${WEBHOOK_STUCK} AS stuck
          FROM webhook_events
          LEFT JOIN subscriptions
            ON webhook_events.provider = 'asaas' AND subscriptions.id = webhook_events.ref_id
          LEFT JOIN users
            ON users.id = CASE WHEN webhook_events.provider = 'clerk' THEN webhook_events.ref_id ELSE subscriptions.user_id END
          ${filter.problemsOnly ? `WHERE ${WEBHOOK_PROBLEM}` : ""}
          ORDER BY webhook_events.received_at DESC
          LIMIT ?`,
    args: [WEBHOOK_LIST_LIMIT],
  });
  return result.rows.map((row) => ({
    id: String(row.id),
    provider: String(row.provider ?? ""),
    type: String(row.type ?? ""),
    refId: nullable(row.ref_id),
    accountId: nullable(row.account_id),
    error: nullable(row.error),
    status: webhookStatus(row),
    receivedAt: String(row.received_at ?? ""),
  }));
}

/* ------------------------------------------------------------ visão geral */

export interface PlatformStats {
  accounts: number;
  /** Contas criadas nos últimos 30 dias. */
  recentAccounts: number;
  /** Contas com restaurante cadastrado. */
  businesses: number;
  published: number;
  live: number;
  byStatus: Record<AccountStatus, number>;
  /** As assinaturas em aberto que dão acesso hoje, somadas por ano, em centavos. */
  annualRecurringCents: number;
  paidLastYearCents: number;
  paidTotalCents: number;
  /** Eventos de webhook com problema nos últimos 7 dias. */
  webhookProblems: number;
}

/** `datetime('now', '-N days')` do SQLite, calculado aqui: é o formato de `created_at`. */
function sqliteDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const accounts = await loadAccounts();
  const paid = [...PAID_STATUSES];
  const [revenue, webhooks] = await db.batch(
    [
      {
        sql: `SELECT COALESCE(SUM(value_cents), 0) AS total,
                COALESCE(SUM(CASE WHEN COALESCE(paid_at, due_date) >= ? THEN value_cents ELSE 0 END), 0) AS last_year
              FROM billing_payments WHERE status IN (${paid.map(() => "?").join(", ")})`,
        args: [addDays(todaySP(), -365), ...paid],
      },
      `SELECT COUNT(*) AS problems FROM webhook_events
       WHERE received_at >= datetime('now', '-7 days') AND ${WEBHOOK_PROBLEM}`,
    ],
    "read",
  );

  const byStatus = Object.fromEntries(
    ACCOUNT_STATUSES.map((status) => [status, 0]),
  ) as Record<AccountStatus, number>;
  const since = sqliteDaysAgo(30);
  let annualRecurringCents = 0;

  for (const account of accounts) {
    byStatus[account.status] += 1;
    const current = account.billing.current;
    // Só a assinatura que renova: a cancelada dentro do período pago dá
    // acesso, mas não volta a pagar.
    if (
      (account.status === "active" || account.status === "pastDue") &&
      current
    ) {
      annualRecurringCents +=
        current.cycle === "MONTHLY"
          ? current.amountCents * 12
          : current.amountCents;
    }
  }

  const totals = revenue?.rows[0];
  return {
    accounts: accounts.length,
    recentAccounts: accounts.filter((account) => account.createdAt >= since)
      .length,
    businesses: accounts.filter((account) => account.business).length,
    published: accounts.filter((account) => account.business?.published).length,
    live: accounts.filter((account) => account.live).length,
    byStatus,
    annualRecurringCents,
    paidLastYearCents: Number(totals?.last_year ?? 0),
    paidTotalCents: Number(totals?.total ?? 0),
    webhookProblems: Number(webhooks?.rows[0]?.problems ?? 0),
  };
}
