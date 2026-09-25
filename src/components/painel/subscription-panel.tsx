import { TriangleAlert } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
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
import { BILLING_PLAN, formatBillingDate, formatPlanPrice, type BillingAccess, type BillingPayment } from '@/lib/billing';

const PRICE = formatPlanPrice(BILLING_PLAN.amountCents);

/** `key` em `account.subscription.tag`. */
const STATUS_TAG: Record<BillingAccess['state'], { key: string; tone: TagTone } | null> = {
  none: null,
  pending: { key: 'pending', tone: 'warning' },
  active: { key: 'active', tone: 'positive' },
  past_due: { key: 'pastDue', tone: 'warning' },
  expired: { key: 'expired', tone: 'error' },
  cancelled: { key: 'cancelled', tone: 'neutral' },
};

/**
 * A tela de assinatura: um estado por vez, um botão por estado. Tudo que a
 * conta pode precisar fazer com a cobrança acontece aqui — e só aqui.
 */
export async function SubscriptionPanel({
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
  const [t, locale] = await Promise.all([getTranslations('account.subscription'), getLocale()]);
  const tag = STATUS_TAG[access.state];
  const paidUntil = access.paidUntil ? formatBillingDate(access.paidUntil, locale) : '';
  const graceUntil = access.graceUntil ? formatBillingDate(access.graceUntil, locale) : '';

  const header = (
    <PanelHeader
      title={t('title')}
      description={
        <>
          {access.exempt ? t('exemptDescription') : t('planDescription', { price: PRICE })}
          {tag && !access.exempt && <Tag tone={tag.tone}>{t(`tag.${tag.key}`)}</Tag>}
        </>
      }
    />
  );

  if (access.exempt) {
    return (
      <PanelPage width="form">
        {header}
        <Card>
          <p className="text-body2 text-gray-700">{t('exemptBody')}</p>
        </Card>
      </PanelPage>
    );
  }

  if (!configured) {
    return (
      <PanelPage width="form">
        {header}
        <Banner tone="error" icon={<TriangleAlert className="size-5" />} title={t('notConfiguredTitle')}>
          <p>{t('notConfiguredBody')}</p>
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
              ? t('reactivateIntro', { date: paidUntil })
              : t('subscribeIntro')}
          </p>
          <div className="mt-5">
            <SubscribeForm
              defaultName={userName}
              defaultCpfCnpj={cpfCnpj}
              submitLabel={reactivating ? t('reactivateFor', { price: PRICE }) : t('payWithPix', { price: PRICE })}
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
          <PixQrCard title={t('pendingQrTitle')} payment={openPayment}>
            <RefreshSubscriptionButton />
          </PixQrCard>
        ) : (
          <Card as="section">
            <p className="text-body2 text-gray-700">{t('generating')}</p>
            <div className="mt-5">
              <RefreshSubscriptionButton />
            </div>
          </Card>
        )}
        <div>
          <Button href="/painel/assinatura?novo=1" variant="text" size="sm" after={<NavIcon />}>
            {t('otherDocument')}
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
              ? t('expiredTitle', { date: paidUntil })
              : t('pastDueTitle', { date: paidUntil })
          }
          role={access.state === 'expired' ? 'alert' : 'status'}
        >
          <p>
            {access.state === 'expired'
              ? t('expiredBody')
              : t('pastDueBody', { graceDate: graceUntil })}
          </p>
        </Banner>
        {openPayment && (
          <PixQrCard title={t('renewalQrTitle', { price: PRICE })} payment={openPayment}>
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
          <p className="text-body2 text-gray-700">{t('cancelledBody', { date: paidUntil })}</p>
          <div className="mt-5">
            <Button href="/painel/assinatura?novo=1" after={<NavIcon />}>{t('reactivate')}</Button>
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
          <p className="text-body2 text-gray-700">{t('paidNoBusiness', { date: paidUntil })}</p>
          <div className="mt-5">
            <Button href="/painel/comecar" after={<NavIcon />}>{t('registerBusiness')}</Button>
          </div>
        </Card>
      </PanelPage>
    );
  }

  return (
    <PanelPage width="form">
      {header}
      {openPayment && (
        <PixQrCard title={t('renewalQrTitle', { price: PRICE })} payment={openPayment}>
          <RefreshSubscriptionButton />
        </PixQrCard>
      )}
      <Card as="section">
        <p className="text-body2 text-gray-700">
          {t('renewalOn', { date: paidUntil, price: PRICE })}
          {!openPayment && ` ${t('renewalEmail')}`}
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
