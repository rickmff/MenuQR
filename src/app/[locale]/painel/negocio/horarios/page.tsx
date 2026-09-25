import { BusinessForm } from '@/components/painel/business-form';
import { DemoBusinessSection } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { siteUrl } from '@/lib/site';
import { requireBusiness } from '@/server/auth/guards';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'painel' });
  return { title: t('meta.hours'), robots: { index: false } };
}

export default async function BusinessSectionPage() {
  if (demoMode) return <DemoBusinessSection section="horarios" />;

  const { business } = await requireBusiness('/painel/negocio/horarios');

  return (
    <BusinessForm business={business} section="horarios" siteUrl={siteUrl.replace(/^https?:\/\//, '')} />
  );
}
