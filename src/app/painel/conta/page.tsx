import { UserProfile } from '@clerk/nextjs';
import { DemoAccount } from '@/components/demo/demo-account';
import { DeleteAccountForm } from '@/components/painel/account-forms';
import { AccountSection } from '@/components/painel/account-parts';
import { billingStatusLine } from '@/components/painel/billing-notice';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { Button } from '@/components/ui/button';
import { demoMode } from '@/lib/demo/config';
import { siteUrl } from '@/lib/site';
import { syncCurrentUser } from '@/server/auth/current-user';
import { requireUser } from '@/server/auth/guards';
import { getBillingAccess, SUBSCRIPTION_PATH } from '@/server/billing/access';
import { getBusinessByOwner } from '@/server/repositories/businesses';

export const metadata = { title: 'Conta', robots: { index: false } };

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

  return (
    <PanelPage width="form">
      <PanelHeader
        title="Conta"
        description="Seus dados de acesso ao painel. Nada daqui aparece no cardápio."
      />

      {/* `routing="hash"` porque esta rota não é coringa: o Clerk troca de
          aba pelo fragmento da URL em vez de navegar para um caminho novo. */}
      <UserProfile routing="hash" />

      {/* A assinatura tem tela própria (uma tela, um objetivo); daqui só se
          chega até ela — é o caminho para quem está sem as abas do painel. */}
      <AccountSection title="Assinatura" description={billingStatusLine(access)}>
        <Button href={SUBSCRIPTION_PATH} variant="secondary" size="sm">
          Gerenciar assinatura
        </Button>
      </AccountSection>

      <DeleteAccountForm
        store={business ? { name: business.name, address: `${displayUrl}/r/${business.slug}` } : null}
      />
    </PanelPage>
  );
}
