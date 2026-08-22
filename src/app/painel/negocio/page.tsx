import { BusinessForm } from '@/components/painel/business-form';
import { siteUrl } from '@/lib/site';
import { requireBusiness } from '@/server/auth/guards';

export const metadata = { title: 'Dados do negócio', robots: { index: false } };

export default async function BusinessSettingsPage() {
  const { business } = await requireBusiness('/painel/negocio');
  const displayUrl = siteUrl.replace(/^https?:\/\//, '');

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">Dados do negócio</h1>
      <p className="mt-2 text-charcoal-500">
        Tudo o que aparece no cardápio publicado e nas regras do pedido. As alterações valem na hora.
      </p>

      <div className="mt-8">
        <BusinessForm business={business} siteUrl={displayUrl} />
      </div>
    </div>
  );
}
