import { notFound } from 'next/navigation';
import { DemoItemEditor } from '@/components/demo/demo-pages';
import { demoMode } from '@/lib/demo/config';
import { ItemForm } from '@/components/painel/item-form';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { requireBusiness } from '@/server/auth/guards';
import { getItem, getMenu } from '@/server/repositories/menu';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'painel' });
  return { title: t('meta.editItem'), robots: { index: false } };
}

export default async function EditItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (demoMode) return <DemoItemEditor itemId={id} />;

  const { business } = await requireBusiness('/painel/cardapio');

  const [item, menu] = await Promise.all([getItem(id, business.id), getMenu(business.id)]);
  if (!item) notFound();
  const t = await getTranslations('painel');

  return (
    <PanelPage width="form">
      <PanelHeader title={t('editItemPage.title')} description={item.name} />

      <ItemForm businessId={business.id} categories={menu} item={item} />
    </PanelPage>
  );
}
