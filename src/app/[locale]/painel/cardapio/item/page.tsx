import { DemoItemEditor } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { ItemForm } from '@/components/painel/item-form';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { requireBusiness } from '@/server/auth/guards';
import { getMenu } from '@/server/repositories/menu';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'painel' });
  return { title: t('meta.newItem'), robots: { index: false } };
}

export default async function NewItemPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria: categoriaDemo } = await searchParams;
  if (demoMode) return <DemoItemEditor categoryId={categoriaDemo} />;

  const { business } = await requireBusiness('/painel/cardapio');
  const menu = await getMenu(business.id);
  const { categoria } = await searchParams;
  const t = await getTranslations('painel');

  if (menu.length === 0) {
    return (
      <PanelPage width="form">
        <Card padding="lg" className="text-center">
          <h1 className="text-h5 font-bold text-gray-700">{t('newItemPage.noCategoryTitle')}</h1>
          <p className="mt-2 text-body2 text-gray-600">{t('newItemPage.noCategoryText')}</p>
          <Button href="/painel/cardapio" className="mt-6" after={<NavIcon />}>
            {t('newItemPage.backToMenu')}
          </Button>
        </Card>
      </PanelPage>
    );
  }

  return (
    <PanelPage width="form">
      <PanelHeader
        title={t('newItemPage.title')}
        description={t('newItemPage.description')}
      />

      <ItemForm businessId={business.id} categories={menu} defaultCategoryId={categoria} />
    </PanelPage>
  );
}
