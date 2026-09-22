import { BusinessForm } from '@/components/painel/business-form';
import { DemoBusinessSection } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { siteUrl } from '@/lib/site';
import { requireBusiness } from '@/server/auth/guards';

export const metadata = { title: 'Formas de pagamento — dados do negócio', robots: { index: false } };

export default async function BusinessSectionPage() {
  if (demoMode) return <DemoBusinessSection section="pagamentos" />;

  const { business } = await requireBusiness('/painel/negocio/pagamentos');

  return (
    <BusinessForm business={business} section="pagamentos" siteUrl={siteUrl.replace(/^https?:\/\//, '')} />
  );
}
