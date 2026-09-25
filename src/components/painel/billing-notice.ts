import { formatBillingDate, type BillingAccess } from '@/lib/billing';
import type { Translate } from '@/lib/i18n';

/**
 * O que o painel diz sobre a assinatura, calculado no servidor (sem React):
 * a casca mostra como Banner, a tela de conta como linha de apoio.
 *
 * O aviso sai como código e datas cruas (`YYYY-MM-DD`), não como texto: quem
 * mostra (o `BillingBanner`) traduz no idioma de quem lê — `notice.<kind>.*`
 * do namespace `account`.
 */

export type BillingNoticeKind =
  | 'pastDue'
  | 'expired'
  | 'cancelledAllowed'
  | 'cancelledEnded'
  | 'pending'
  | 'none'
  | 'renewalDue';

export interface BillingNotice {
  tone: 'info' | 'warning' | 'error' | 'neutral';
  kind: BillingNoticeKind;
  paidUntil: string | null;
  graceUntil: string | null;
}

export function billingNotice(access: BillingAccess): BillingNotice | null {
  if (access.exempt) return null;
  const dates = { paidUntil: access.paidUntil, graceUntil: access.graceUntil };

  switch (access.state) {
    case 'past_due':
      return { tone: 'warning', kind: 'pastDue', ...dates };
    case 'expired':
      return { tone: 'error', kind: 'expired', ...dates };
    case 'cancelled':
      return access.allowed
        ? { tone: 'neutral', kind: 'cancelledAllowed', ...dates }
        : { tone: 'error', kind: 'cancelledEnded', ...dates };
    case 'pending':
      return { tone: 'info', kind: 'pending', ...dates };
    case 'none':
      return { tone: 'info', kind: 'none', ...dates };
    case 'active':
      return access.renewalDue ? { tone: 'info', kind: 'renewalDue', ...dates } : null;
    default:
      return null;
  }
}

/** Uma linha só, para a tela de conta. `t` é o tradutor do namespace `account`. */
export function billingStatusLine(access: BillingAccess, t: Translate, locale: string): string {
  if (access.exempt) return t('status.exempt');
  const date = access.paidUntil ? formatBillingDate(access.paidUntil, locale) : '';
  const graceDate = access.graceUntil ? formatBillingDate(access.graceUntil, locale) : '';
  switch (access.state) {
    case 'active':
      return t('status.active', { date });
    case 'pending':
      return t('status.pending');
    case 'past_due':
      return t('status.pastDue', { date, graceDate });
    case 'expired':
      return t('status.expired', { date });
    case 'cancelled':
      return access.allowed ? t('status.cancelledAllowed', { date }) : t('status.cancelledEnded');
    default:
      return t('status.none');
  }
}
