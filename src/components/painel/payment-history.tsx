import { useLocale, useTranslations } from 'next-intl';
import { Tag, type TagTone } from '@/components/ui/tag';
import { formatBillingDate, formatPlanPrice, type BillingPayment } from '@/lib/billing';

/** Status do Asaas → `key` em `account.payments.status`. */
const STATUS: Record<string, { key: string; tone: TagTone }> = {
  RECEIVED: { key: 'paid', tone: 'positive' },
  CONFIRMED: { key: 'paid', tone: 'positive' },
  RECEIVED_IN_CASH: { key: 'paid', tone: 'positive' },
  PENDING: { key: 'open', tone: 'neutral' },
  OVERDUE: { key: 'overdue', tone: 'warning' },
  REFUNDED: { key: 'refunded', tone: 'error' },
  REFUND_REQUESTED: { key: 'refundRequested', tone: 'warning' },
  DELETED: { key: 'deleted', tone: 'neutral' },
};

/** As cobranças da assinatura, da mais recente para a mais antiga. */
export function PaymentHistory({ payments }: { payments: BillingPayment[] }) {
  const t = useTranslations('account.payments');
  const locale = useLocale();
  if (payments.length === 0) return null;
  return (
    <section>
      <h2 className="text-subtitle font-bold text-gray-700">{t('title')}</h2>
      <ul className="mt-3 divide-y divide-gray-100">
        {payments.map((payment) => {
          const known = STATUS[payment.status];
          const status = known
            ? { label: t(`status.${known.key}`), tone: known.tone }
            : { label: payment.status, tone: 'neutral' as TagTone };
          return (
            <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-body2 text-gray-700">
              <span className="min-w-24">{formatBillingDate(payment.dueDate, locale)}</span>
              <span className="font-semibold">{formatPlanPrice(payment.valueCents)}</span>
              <Tag tone={status.tone}>{status.label}</Tag>
              {payment.invoiceUrl && (
                <a
                  href={payment.invoiceUrl}
                  target="_blank"
                  rel="noopener"
                  className="ml-auto text-caption font-semibold text-primary underline"
                >
                  {t('receipt')}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
