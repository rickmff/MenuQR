import { redirect } from 'next/navigation';
import { OnboardingForm } from '@/components/painel/onboarding-form';
import { siteUrl } from '@/lib/site';
import { requireUser } from '@/server/auth/guards';
import { getBusinessByOwner } from '@/server/repositories/businesses';

export const metadata = { title: 'Cadastrar restaurante', robots: { index: false } };

export default async function OnboardingPage() {
  const user = await requireUser('/painel/comecar');
  if (await getBusinessByOwner(user.id)) redirect('/painel');

  const displayUrl = siteUrl.replace(/^https?:\/\//, '');

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-3xl font-semibold">Vamos cadastrar seu restaurante</h1>
      <p className="mt-3 text-charcoal-500">
        Três informações e seu cardápio já ganha endereço próprio. Você completa os horários, a área de
        entrega e os pratos no passo seguinte.
      </p>

      <div className="mt-8 rounded-card border border-cream-200 bg-white p-6">
        <OnboardingForm siteUrl={displayUrl} />
      </div>
    </div>
  );
}
