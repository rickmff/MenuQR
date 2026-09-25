import { BusinessForm } from '@/components/painel/business-form';
import { DemoBusinessSection } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { siteUrl } from '@/lib/site';
import { requireBusiness } from '@/server/auth/guards';
import { getMenu } from '@/server/repositories/menu';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'painel' });
  return { title: t('meta.identity'), robots: { index: false } };
}

export default async function BusinessSectionPage() {
  if (demoMode) return <DemoBusinessSection section="identidade" />;

  const { business } = await requireBusiness('/painel/negocio');
  // O próximo passo depois de salvar pode ser o cardápio (o primeiro item).
  const menu = await getMenu(business.id);

  return (
    <BusinessForm
      business={business}
      menu={menu}
      section="identidade"
      siteUrl={siteUrl.replace(/^https?:\/\//, '')}
    />
  );
}
