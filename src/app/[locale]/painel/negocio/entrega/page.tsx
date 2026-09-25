import { BusinessForm } from '@/components/painel/business-form';
import { DemoBusinessSection } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { siteUrl } from '@/lib/site';
import { requireBusiness } from '@/server/auth/guards';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'painel' });
  return { title: t('meta.delivery'), robots: { index: false } };
}

export default async function BusinessSectionPage() {
  if (demoMode) return <DemoBusinessSection section="entrega" />;

  const { business } = await requireBusiness('/painel/negocio/entrega');

  return (
    <BusinessForm business={business} section="entrega" siteUrl={siteUrl.replace(/^https?:\/\//, '')} />
  );
}
