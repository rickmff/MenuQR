import { DemoMenuManager } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { MenuEditor } from '@/components/painel/menu-editor';
import { CustomerViewLink } from '@/components/painel/customer-view-link';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { countItems } from '@/lib/menu-utils';
import { requireBusiness } from '@/server/auth/guards';
import { getMenu } from '@/server/repositories/menu';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'painel' });
  return { title: t('meta.menu'), robots: { index: false } };
}

export default async function MenuManagerPage() {
  if (demoMode) return <DemoMenuManager />;

  const { business } = await requireBusiness('/painel/cardapio');
  const menu = await getMenu(business.id);
  const t = await getTranslations('painel');

  return (
    <PanelPage>
      <PanelHeader
        title={t('menuPage.title')}
        description={t('menuPage.summary', { categories: menu.length, items: countItems(menu) })}
        actions={<CustomerViewLink slug={business.slug} published={business.published} />}
      />

      <MenuEditor businessId={business.id} menu={menu} />
    </PanelPage>
  );
}
