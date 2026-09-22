import { Tag, type TagTone } from '@/components/ui/tag';
import { formatDateBR, formatPlanPrice, type BillingPayment } from '@/lib/billing';

const STATUS: Record<string, { label: string; tone: TagTone }> = {
  RECEIVED: { label: 'Pago', tone: 'positive' },
  CONFIRMED: { label: 'Pago', tone: 'positive' },
  RECEIVED_IN_CASH: { label: 'Pago', tone: 'positive' },
  PENDING: { label: 'Em aberto', tone: 'neutral' },
  OVERDUE: { label: 'Vencido', tone: 'warning' },
  REFUNDED: { label: 'Estornado', tone: 'error' },
  REFUND_REQUESTED: { label: 'Estorno pedido', tone: 'warning' },
  DELETED: { label: 'Cancelada', tone: 'neutral' },
};

/** As cobranças da assinatura, da mais recente para a mais antiga. */
export function PaymentHistory({ payments }: { payments: BillingPayment[] }) {
  if (payments.length === 0) return null;
  return (
    <section>
      <h2 className="text-subtitle font-bold text-gray-700">Pagamentos</h2>
      <ul className="mt-3 divide-y divide-gray-100">
        {payments.map((payment) => {
          const status = STATUS[payment.status] ?? { label: payment.status, tone: 'neutral' as TagTone };
          return (
            <li key={payment.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-body2 text-gray-700">
              <span className="w-24">{formatDateBR(payment.dueDate)}</span>
              <span className="font-semibold">{formatPlanPrice(payment.valueCents)}</span>
              <Tag tone={status.tone}>{status.label}</Tag>
              {payment.invoiceUrl && (
                <a
                  href={payment.invoiceUrl}
                  target="_blank"
                  rel="noopener"
                  className="ml-auto text-caption font-semibold text-primary underline"
                >
                  Comprovante
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
