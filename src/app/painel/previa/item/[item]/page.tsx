import { notFound } from 'next/navigation';
import { DemoPreviewItem } from '@/components/demo/demo-pages';
import { PREVIEW_PATH, PreviewFrame } from '@/components/painel/preview-frame';
import { ItemDetail } from '@/components/store/item-detail';
import { demoMode } from '@/lib/demo/config';
import { findItemBySlug } from '@/lib/menu-utils';
import { requireBusiness } from '@/server/auth/guards';
import { loadStoreForPreview } from '@/server/store-data';

export const metadata = { title: 'Prévia do item', robots: { index: false, follow: false } };

/**
 * Página do prato dentro da prévia. Existe porque `/r/[slug]/item/[item]` só
 * responde depois de publicar: sem esta rota, abrir um prato na prévia de um
 * cardápio em rascunho caía em 404.
 */
export default async function PreviewItemPage({ params }: { params: Promise<{ item: string }> }) {
  const { item: itemSlug } = await params;
  if (demoMode) return <DemoPreviewItem itemSlug={itemSlug} />;

  const { business: owned } = await requireBusiness(PREVIEW_PATH);
  const data = await loadStoreForPreview(owned.slug);
  const found = data ? findItemBySlug(data.menu, itemSlug) : undefined;
  if (!data || !found) notFound();

  return (
    <div className="-my-10">
      <PreviewFrame business={data.business} menu={data.menu}>
        <ItemDetail
          business={data.business}
          category={found.category}
          item={found.item}
          basePath={PREVIEW_PATH}
        />
      </PreviewFrame>
    </div>
  );
}
