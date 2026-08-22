import { BusinessForm } from '@/components/painel/business-form';
import { DemoBusinessSettings } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { siteUrl } from '@/lib/site';
import { requireBusiness } from '@/server/auth/guards';

export const metadata = { title: 'Dados do negócio', robots: { index: false } };

export default async function BusinessSettingsPage() {
  if (demoMode) return <DemoBusinessSettings />;

  const { business } = await requireBusiness('/painel/negocio');
  const displayUrl = siteUrl.replace(/^https?:\/\//, '');

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Dados do negócio</h1>
      <p className="mt-2 text-ink-500">
        Tudo o que aparece no cardápio publicado e nas regras do pedido. As alterações valem na hora.
      </p>

      <div className="mt-8">
        <BusinessForm business={business} siteUrl={displayUrl} />
      </div>
    </div>
  );
}
