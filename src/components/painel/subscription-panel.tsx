import { TriangleAlert } from 'lucide-react';
import { CancelSubscriptionButton } from '@/components/painel/cancel-subscription-button';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { PaymentHistory } from '@/components/painel/payment-history';
import { PendingPoller } from '@/components/painel/pending-poller';
import { PixQrCard } from '@/components/painel/pix-qr-card';
import { RefreshSubscriptionButton } from '@/components/painel/refresh-subscription-button';
import { SubscribeForm } from '@/components/painel/subscribe-form';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { Tag, type TagTone } from '@/components/ui/tag';
import { BILLING_PLAN, formatDateBR, formatPlanPrice, type BillingAccess, type BillingPayment } from '@/lib/billing';

const PRICE = formatPlanPrice(BILLING_PLAN.amountCents);

const STATUS_TAG: Record<BillingAccess['state'], { label: string; tone: TagTone } | null> = {
  none: null,
  pending: { label: 'Aguardando pagamento', tone: 'warning' },
  active: { label: 'Ativa', tone: 'positive' },
  past_due: { label: 'Vencida', tone: 'warning' },
  expired: { label: 'Bloqueada', tone: 'error' },
  cancelled: { label: 'Renovação cancelada', tone: 'neutral' },
};

/**
 * A tela de assinatura: um estado por vez, um botão por estado. Tudo que a
 * conta pode precisar fazer com a cobrança acontece aqui — e só aqui.
 */
export function SubscriptionPanel({
  access,
  hasBusiness,
  userName,
  cpfCnpj,
  payments,
  openPayment,
  configured,
  showForm,
}: {
  access: BillingAccess;
  hasBusiness: boolean;
  userName: string;
  cpfCnpj: string | null;
  payments: BillingPayment[];
  openPayment: BillingPayment | null;
  /** Há chave do Asaas neste ambiente. */
  configured: boolean;
  /** `?novo=1`: o lojista quer assinar de novo (outro CPF, reativar). */
  showForm: boolean;
}) {
  const tag = STATUS_TAG[access.state];
  const paidUntil = access.paidUntil ? formatDateBR(access.paidUntil) : '';

  const header = (
    <PanelHeader
      title="Assinatura"
      description={
        <>
          {access.exempt ? 'Sua conta não precisa de assinatura.' : `Plano único · ${PRICE} por ano, pagos por Pix`}
          {tag && !access.exempt && <Tag tone={tag.tone}>{tag.label}</Tag>}
        </>
      }
    />
  );

  if (access.exempt) {
    return (
      <PanelPage width="form">
        {header}
        <Card>
          <p className="text-body2 text-gray-700">Esta conta é isenta de cobrança. Nada a fazer por aqui.</p>
        </Card>
      </PanelPage>
    );
  }

  if (!configured) {
    return (
      <PanelPage width="form">
        {header}
        <Banner tone="error" icon={<TriangleAlert className="size-5" />} title="A cobrança não está configurada neste ambiente">
          <p>Defina ASAAS_API_KEY (ou BILLING_MODE=off para rodar sem cobrança).</p>
        </Banner>
      </PanelPage>
    );
  }

  const wantsForm =
    showForm ||
    access.state === 'none' ||
    (access.state === 'expired' && !openPayment) ||
    (access.state === 'cancelled' && !access.allowed);

  if (wantsForm) {
    const reactivating = access.state === 'cancelled' && access.allowed;
    return (
      <PanelPage width="form">
        {header}
        <Card as="section">
          <p className="text-body2 text-gray-700">
            {reactivating
              ? `Você continua usando até ${paidUntil}. Ao reativar, a próxima cobrança vence nessa data.`
              : 'Sem débito automático: a cada ano você recebe um novo Pix para pagar. Cancele quando quiser.'}
          </p>
          <div className="mt-5">
            <SubscribeForm
              defaultName={userName}
              defaultCpfCnpj={cpfCnpj}
              submitLabel={reactivating ? `Reativar por ${PRICE}` : `Pagar ${PRICE} com Pix`}
            />
          </div>
        </Card>
      </PanelPage>
    );
  }

  if (access.state === 'pending') {
    return (
      <PanelPage width="form">
        {header}
        <PendingPoller />
        {openPayment ? (
          <PixQrCard title="Pague o Pix para liberar o painel" payment={openPayment}>
            <RefreshSubscriptionButton />
          </PixQrCard>
        ) : (
          <Card as="section">
            <p className="text-body2 text-gray-700">Gerando a cobrança… isto leva alguns segundos.</p>
            <div className="mt-5">
              <RefreshSubscriptionButton />
            </div>
          </Card>
        )}
        <div>
          <Button href="/painel/assinatura?novo=1" variant="text" size="sm" after={<NavIcon />}>
            Usar outro CPF ou CNPJ
          </Button>
        </div>
      </PanelPage>
    );
  }

  if (access.state === 'past_due' || access.state === 'expired') {
    return (
      <PanelPage width="form">
        {header}
        <PendingPoller />
        <Banner
          tone={access.state === 'expired' ? 'error' : 'warning'}
          icon={<TriangleAlert className="size-5" />}
          title={
            access.state === 'expired'
              ? `Painel e cardápio bloqueados: a assinatura venceu em ${paidUntil}`
              : `Sua assinatura venceu em ${paidUntil}`
          }
          role={access.state === 'expired' ? 'alert' : 'status'}
        >
          <p>
            {access.state === 'expired'
              ? 'Pague a renovação para voltar ao ar.'
              : `Pague até ${access.graceUntil ? formatDateBR(access.graceUntil) : ''} para o cardápio continuar no ar.`}
          </p>
        </Banner>
        {openPayment && (
          <PixQrCard title={`Renovação — ${PRICE}`} payment={openPayment}>
            <RefreshSubscriptionButton />
          </PixQrCard>
        )}
        <PaymentHistory payments={payments} />
      </PanelPage>
    );
  }

  if (access.state === 'cancelled') {
    return (
      <PanelPage width="form">
        {header}
        <Card as="section">
          <p className="text-body2 text-gray-700">Acesso até {paidUntil}. Depois disso o painel e o cardápio ficam bloqueados.</p>
          <div className="mt-5">
            <Button href="/painel/assinatura?novo=1" after={<NavIcon />}>Reativar</Button>
          </div>
        </Card>
        <PaymentHistory payments={payments} />
      </PanelPage>
    );
  }

  // active
  if (!hasBusiness) {
    return (
      <PanelPage width="form">
        {header}
        <Card as="section">
          <p className="text-body2 text-gray-700">Pagamento confirmado. Sua assinatura vale até {paidUntil}.</p>
          <div className="mt-5">
            <Button href="/painel/comecar" after={<NavIcon />}>Cadastrar meu restaurante</Button>
          </div>
        </Card>
      </PanelPage>
    );
  }

  return (
    <PanelPage width="form">
      {header}
      {openPayment && (
        <PixQrCard title={`Renovação — ${PRICE}`} payment={openPayment}>
          <RefreshSubscriptionButton />
        </PixQrCard>
      )}
      <Card as="section">
        <p className="text-body2 text-gray-700">
          Renovação em {paidUntil} · {PRICE} por Pix.
          {!openPayment && ' Quando a cobrança for gerada, o Pix aparece aqui e você recebe um e-mail.'}
        </p>
        {access.current && access.paidUntil && (
          <div className="mt-5">
            <CancelSubscriptionButton subscriptionId={access.current.id} paidUntil={paidUntil} />
          </div>
        )}
      </Card>
      <PaymentHistory payments={payments} />
    </PanelPage>
  );
}
