import { notFound } from 'next/navigation';
import { DemoPreviewItem } from '@/components/demo/demo-pages';
import { PREVIEW_PATH } from '@/components/painel/preview-frame';
import { ItemDetail } from '@/components/store/item-detail';
import { ItemMissing } from '@/components/store/item-missing';
import { demoMode } from '@/lib/demo/config';
import { findItemBySlug } from '@/lib/menu-utils';
import { requireBusiness } from '@/server/auth/guards';
import { loadStoreForPreview } from '@/server/store-data';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'painel' });
  return { title: t('meta.previewItem'), robots: { index: false, follow: false } };
}

/**
 * Página do prato dentro da prévia. Existe porque `/r/[slug]/item/[item]` só
 * responde depois de publicar: sem esta rota, abrir um prato na prévia de um
 * cardápio em rascunho caía em 404. A moldura vem do layout.
 */
export default async function PreviewItemPage({ params }: { params: Promise<{ item: string }> }) {
  const { item: itemSlug } = await params;
  if (demoMode) return <DemoPreviewItem itemSlug={itemSlug} />;

  const { business: owned } = await requireBusiness(PREVIEW_PATH);
  const data = await loadStoreForPreview(owned.slug);
  if (!data) notFound();
  // Prato apagado ou renomeado com a prévia aberta: a mesma tela do cardápio
  // público, dentro da moldura e com o "‹" de volta ao cardápio.
  const found = findItemBySlug(data.menu, itemSlug);
  if (!found) return <ItemMissing />;

  return <ItemDetail business={data.business} category={found.category} item={found.item} basePath={PREVIEW_PATH} />;
}
