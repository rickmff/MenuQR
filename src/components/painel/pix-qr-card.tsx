import QRCode from 'qrcode';
import type { ReactNode } from 'react';
import { CopyPixCode } from '@/components/painel/copy-pix-code';
import { Button } from '@/components/ui/button';
import { ExternalIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { formatDateBR, formatPlanPrice, type BillingPayment } from '@/lib/billing';

/**
 * A cobrança para pagar: QR desenhado no servidor a partir do copia-e-cola
 * (sem depender da imagem do Asaas), o código para copiar e a validade. Sem
 * contagem regressiva — o QR vale meses.
 */
export async function PixQrCard({
  title,
  payment,
  children,
}: {
  title: string;
  payment: BillingPayment;
  /** As ações abaixo do QR (o "Já paguei"). */
  children?: ReactNode;
}) {
  const svg = payment.qrPayload
    ? await QRCode.toString(payment.qrPayload, {
        type: 'svg',
        margin: 1,
        width: 220,
        color: { dark: '#111b21', light: '#ffffff' },
      })
    : null;
  const expires = payment.qrExpiresAt ? formatDateBR(payment.qrExpiresAt.slice(0, 10)) : null;

  return (
    <Card as="section">
      <h2 className="text-subtitle font-bold text-gray-700">{title}</h2>
      <p className="mt-1 text-body2 text-gray-600">
        {formatPlanPrice(payment.valueCents)} · vencimento em {formatDateBR(payment.dueDate)}
        {expires && ` · o QR vale até ${expires}`}
      </p>

      {svg ? (
        <div className="mt-5 flex flex-col items-center gap-4">
          <div
            className="rounded-md border border-gray-200 bg-white p-3"
            // O SVG vem da biblioteca de QR code a partir do próprio copia-e-cola.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="max-w-full break-all rounded-sm bg-gray-50 px-4 py-3 font-mono text-caption text-gray-700">
            {payment.qrPayload}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <CopyPixCode payload={payment.qrPayload ?? ''} />
            {payment.invoiceUrl && (
              <Button
                href={payment.invoiceUrl}
                target="_blank"
                rel="noopener"
                variant="secondary"
                size="sm"
                after={<ExternalIcon />}
              >
                Abrir cobrança
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          <p className="text-body2 text-gray-700">
            Não conseguimos gerar o QR agora. Abra a cobrança para pagar por lá, ou tente de novo em instantes.
          </p>
          {payment.invoiceUrl && (
            <Button
              href={payment.invoiceUrl}
              target="_blank"
              rel="noopener"
              variant="secondary"
              size="sm"
                after={<ExternalIcon />}
            >
              Abrir cobrança
            </Button>
          )}
        </div>
      )}

      <p className="mt-4 text-caption text-gray-600">Confirmamos em até um minuto depois do pagamento.</p>
      {children && <div className="mt-5">{children}</div>}
    </Card>
  );
}
