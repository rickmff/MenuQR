import { UserProfile } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { DemoAccount } from '@/components/demo/demo-account';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { DeleteAccountForm } from '@/components/painel/account-forms';
import { AccountSection } from '@/components/painel/account-parts';
import { billingStatusLine } from '@/components/painel/billing-notice';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { demoMode } from '@/lib/demo/config';
import { siteUrl } from '@/lib/site';
import { syncCurrentUser } from '@/server/auth/current-user';
import { requireUser } from '@/server/auth/guards';
import { getBillingAccess, SUBSCRIPTION_PATH } from '@/server/billing/access';
import { getBusinessByOwner } from '@/server/repositories/businesses';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('metadata.account'), robots: { index: false } };
}

export default async function AccountPage() {
  if (demoMode) return <DemoAccount />;

  // `requireUser`, não `requireBusiness`: quem desistiu antes de cadastrar o
  // restaurante também precisa conseguir mexer no acesso e excluir a conta.
  const user = await requireUser('/painel/conta');
  // Esta é a tela onde o nome e o e-mail acabaram de mudar no Clerk: bom
  // momento para trazer os dois para o banco.
  await syncCurrentUser();
  const business = await getBusinessByOwner(user.id);
  const access = await getBillingAccess(user);
  const displayUrl = siteUrl.replace(/^https?:\/\//, '');
  // Conta isenta ou cobrança desligada não tem assinatura: nada a gerenciar
  // e nada a cancelar ao excluir. Já quem tem uma em aberto (pendente, ativa,
  // vencida) ou cancelada ainda dentro do período pago perde isso ao sair.
  const hasSubscription = !access.exempt && (access.current !== null || access.allowed);
  const [t, locale] = await Promise.all([getTranslations('account'), getLocale()]);

  return (
    <PanelPage width="form">
      <PanelHeader
        title={t('page.title')}
        description={t('page.description')}
      />

      {/* `routing="hash"` porque esta rota não é coringa: o Clerk troca de
          aba pelo fragmento da URL em vez de navegar para um caminho novo. */}
      <UserProfile routing="hash" />

      {/* A assinatura tem tela própria (uma tela, um objetivo); daqui só se
          chega até ela — é o caminho para quem está sem as abas do painel.
          Conta isenta fica só com a linha de situação: a tela de lá diria
          "Nada a fazer por aqui". */}
      <AccountSection title={t('page.subscriptionTitle')} description={billingStatusLine(access, t, locale)}>
        {!access.exempt && (
          <Button href={SUBSCRIPTION_PATH} variant="secondary" size="sm" after={<NavIcon />}>
            {t('page.manageSubscription')}
          </Button>
        )}
      </AccountSection>

      {/* O idioma é deste navegador (cookie `NEXT_LOCALE`), não da conta: vale
          para o site inteiro — telas de entrada e os cardápios abertos aqui. */}
      <AccountSection title={t('page.languageTitle')} description={t('page.languageDescription')}>
        <LocaleSwitcher />
      </AccountSection>

      <DeleteAccountForm
        store={business ? { name: business.name, address: `${displayUrl}/r/${business.slug}` } : null}
        subscription={hasSubscription}
      />
    </PanelPage>
  );
}
