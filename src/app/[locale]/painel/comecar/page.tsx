import { redirect } from 'next/navigation';
import { DemoOnboarding } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { OnboardingForm } from '@/components/painel/onboarding-form';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { Card } from '@/components/ui/card';
import { siteUrl } from '@/lib/site';
import { requireUser } from '@/server/auth/guards';
import { requireSubscription } from '@/server/billing/access';
import { getBusinessByOwner } from '@/server/repositories/businesses';

export const metadata = { title: 'Cadastrar restaurante', robots: { index: false } };

export default async function OnboardingPage() {
  if (demoMode) return <DemoOnboarding />;

  const user = await requireUser('/painel/comecar');
  // Assina antes de cadastrar: quem chega aqui sem pagar volta para Assinatura.
  await requireSubscription(user);
  if (await getBusinessByOwner(user.id)) redirect('/painel');

  const displayUrl = siteUrl.replace(/^https?:\/\//, '');

  return (
    <PanelPage width="form">
      <PanelHeader
        title="Vamos cadastrar seu restaurante"
        description="Três informações e seu cardápio já ganha endereço próprio. Você completa os horários, a área de entrega e os pratos no passo seguinte."
      />

      <Card>
        <OnboardingForm siteUrl={displayUrl} />
      </Card>
    </PanelPage>
  );
}
