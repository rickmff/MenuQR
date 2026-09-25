import { formatPrice } from './format';

/**
 * Regras da assinatura da plataforma, sem servidor e sem banco: valem no
 * painel, no script de verificação e em qualquer lugar que precise dizer se
 * uma conta tem acesso.
 *
 * O modelo: uma cobrança Pix por ciclo, paga à mão pelo lojista (o Asaas gera
 * a cobrança e avisa por e-mail). Não existe débito automático — Pix
 * Automático só pode ser recebido por pessoa jurídica.
 */

export type BillingCycle = 'YEARLY' | 'MONTHLY';

export const BILLING_PLAN = {
  amountCents: 58800,
  cycle: 'YEARLY' as BillingCycle,
  /** Dias depois do vencimento em que painel e cardápio continuam no ar. */
  graceDays: 7,
  /** Quantos dias antes do vencimento o painel passa a oferecer a renovação. */
  renewalNoticeDays: 30,
  /** Descrição que sai na cobrança do Asaas (e no extrato do lojista). */
  description: 'Menu Online — assinatura anual do cardápio digital',
} as const;

/** Status de cobrança do Asaas que contam como "pagou". */
export const PAID_STATUSES = new Set(['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH']);

/* --------------------------------------------------------------------- datas */

/**
 * Datas de cobrança são `YYYY-MM-DD` no fuso do Brasil — é como o Asaas manda
 * o vencimento, e comparação de texto funciona nesse formato. "Hoje" precisa
 * do mesmo fuso: um servidor em UTC viraria o dia três horas antes do lojista.
 */
export function todaySP(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function parts(date: string): [year: number, month: number, day: number] {
  const [year, month, day] = date.split('-').map(Number);
  return [year ?? 0, month ?? 1, day ?? 1];
}

function isoDate(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = parts(date);
  return isoDate(year, month, day + days);
}

/** Um ciclo à frente, com o dia preso ao fim do mês (29/02 → 28/02, 31/01 → 28/02). */
export function addCycle(date: string, cycle: BillingCycle): string {
  const [year, month, day] = parts(date);
  const targetYear = cycle === 'YEARLY' ? year + 1 : month === 12 ? year + 1 : year;
  const targetMonth = cycle === 'YEARLY' ? month : (month % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  return isoDate(targetYear, targetMonth, Math.min(day, lastDay));
}

export function formatDateBR(date: string): string {
  const [year, month, day] = parts(date);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

/**
 * Data de cobrança no idioma de quem lê: `25/09/2026` em português, `Sep 25,
 * 2026` em inglês. Em UTC de propósito — a data já é o dia no Brasil, e
 * qualquer outro fuso a deslocaria.
 */
export function formatBillingDate(date: string, locale: string): string {
  if (locale.startsWith('pt')) return formatDateBR(date);
  const [year, month, day] = parts(date);
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function formatPlanPrice(cents: number): string {
  return formatPrice(cents / 100);
}

/* -------------------------------------------------------------- assinatura */

export type SubscriptionStatus = 'pending' | 'active' | 'cancelled';

export interface SubscriptionRecord {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  /** Data da renovação (`YYYY-MM-DD`); NULL até o primeiro pagamento. */
  paidUntil: string | null;
  asaasCustomerId: string;
  asaasSubscriptionId: string | null;
  cycle: BillingCycle;
  amountCents: number;
  cancelledAt: string | null;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingPayment {
  id: string;
  subscriptionId: string;
  status: string;
  valueCents: number;
  dueDate: string;
  paidAt: string | null;
  invoiceUrl: string | null;
  qrPayload: string | null;
  qrExpiresAt: string | null;
  createdAt: string;
}

/**
 * Até quando a assinatura está paga, a partir das cobranças pagas: cada uma
 * estende um ciclo a partir do próprio vencimento (ou do fim do período
 * anterior, se ele vai além). Recalcular do conjunto — e não somar a cada
 * evento — é o que deixa o webhook idempotente: evento repetido, fora de
 * ordem ou estorno dão sempre o mesmo resultado.
 *
 * Pagou adiantado → parte do vencimento, não encurta. Pagou atrasado → parte
 * do vencimento também: o período é o período, e fica alinhado à cobrança
 * seguinte que o Asaas vai gerar.
 */
export function computePaidUntil(payments: { dueDate: string; status: string }[], cycle: BillingCycle): string | null {
  // Um vencimento, um período: duas cobranças pagas com a mesma data (a mesma
  // cobrança vinda duas vezes, ou uma cobrança extra) não estendem duas vezes.
  const dueDates = new Set(payments.filter((payment) => PAID_STATUSES.has(payment.status)).map((payment) => payment.dueDate));
  let until: string | null = null;
  for (const dueDate of [...dueDates].sort()) until = addCycle(until && until > dueDate ? until : dueDate, cycle);
  return until;
}

export type BillingState = 'none' | 'pending' | 'active' | 'past_due' | 'expired' | 'cancelled';

export interface BillingAccess {
  state: BillingState;
  /** Painel e cardápio liberados. */
  allowed: boolean;
  /** Data da renovação da assinatura que vale. */
  paidUntil: string | null;
  /** Até quando a carência segura painel e cardápio no ar. */
  graceUntil: string | null;
  /** Faltam poucos dias (ou já venceu): hora de mostrar a cobrança da renovação. */
  renewalDue: boolean;
  /** A assinatura em aberto (pendente ou ativa) — no máximo uma por conta. */
  current: SubscriptionRecord | null;
  /** A mais recente, qualquer que seja o status. */
  latest: SubscriptionRecord | null;
  /** Conta que nunca é cobrada (demonstração, cortesia) ou cobrança desligada. */
  exempt: boolean;
}

function evaluate(row: SubscriptionRecord, today: string): { state: BillingState; allowed: boolean } {
  if (!row.paidUntil) {
    return row.status === 'cancelled' ? { state: 'cancelled', allowed: false } : { state: 'pending', allowed: false };
  }
  if (today < row.paidUntil) {
    return { state: row.status === 'cancelled' ? 'cancelled' : 'active', allowed: true };
  }
  // Cancelada e vencida: sem carência — o lojista pediu para não renovar.
  if (row.status === 'cancelled') return { state: 'cancelled', allowed: false };
  if (today < addDays(row.paidUntil, BILLING_PLAN.graceDays)) return { state: 'past_due', allowed: true };
  return { state: 'expired', allowed: false };
}

/**
 * O que a conta pode fazer hoje. Recebe as assinaturas da conta (a mais
 * recente primeiro) e decide na leitura; só `pending`/`active`/`cancelled`
 * vivem no banco, o resto é derivado de `paid_until` e da data.
 */
export function summarizeBilling(rows: SubscriptionRecord[], today: string, exempt = false): BillingAccess {
  if (exempt) {
    return { state: 'active', allowed: true, paidUntil: null, graceUntil: null, renewalDue: false, current: null, latest: null, exempt: true };
  }

  const latest = rows[0] ?? null;
  const current = rows.find((row) => row.status !== 'cancelled') ?? null;

  // Vale a assinatura que dá acesso por mais tempo (cancelou e assinou de
  // novo dentro do período pago); sem acesso, a que está em aberto; senão a
  // mais recente, para a tela saber de onde a conta veio.
  const withAccess = rows
    .map((row) => ({ row, ...evaluate(row, today) }))
    .filter((entry) => entry.allowed)
    .sort((a, b) => (b.row.paidUntil ?? '').localeCompare(a.row.paidUntil ?? ''));
  const chosen = withAccess[0] ?? (current ? { row: current, ...evaluate(current, today) } : null) ?? (latest ? { row: latest, ...evaluate(latest, today) } : null);

  if (!chosen) {
    return { state: 'none', allowed: false, paidUntil: null, graceUntil: null, renewalDue: false, current, latest, exempt: false };
  }

  const paidUntil = chosen.row.paidUntil;
  const renewalDue =
    chosen.state === 'active' && chosen.row.status !== 'cancelled' && paidUntil !== null
      ? paidUntil <= addDays(today, BILLING_PLAN.renewalNoticeDays)
      : chosen.state === 'past_due' || chosen.state === 'expired';

  return {
    state: chosen.state,
    allowed: chosen.allowed,
    paidUntil,
    graceUntil: paidUntil ? addDays(paidUntil, BILLING_PLAN.graceDays) : null,
    renewalDue,
    current,
    latest,
    exempt: false,
  };
}
