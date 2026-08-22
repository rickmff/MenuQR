import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DemoStoreItemPage } from '@/components/demo/demo-store';
import { demoMode } from '@/lib/demo/config';
import { ItemDetail } from '@/components/store/item-detail';
import { JsonLd } from '@/components/json-ld';
import { formatPrice } from '@/lib/format';
import { findItemBySlug } from '@/lib/menu-utils';
import { platform } from '@/lib/platform';
import { breadcrumbSchema, buildMetadata, graph, menuItemSchema } from '@/lib/seo';
import { loadPublishedStore } from '@/server/store-data';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; item: string }>;
}): Promise<Metadata> {
  const { slug, item: itemSlug } = await params;
  const data = await loadPublishedStore(slug);
  const found = data ? findItemBySlug(data.menu, itemSlug) : undefined;

  if (!data || !found) {
    return buildMetadata({
      title: 'Item não encontrado',
      description: 'Este item não está disponível.',
      path: `/r/${slug}/item/${itemSlug}`,
      noIndex: true,
    });
  }

  const { business } = data;
  const { item } = found;

  return buildMetadata({
    title: `${item.name} — ${formatPrice(item.price)} | ${business.name}`,
    description:
      `${item.description || item.name} Peça no cardápio do ${business.name} e finalize pelo WhatsApp.`,
    path: `/r/${business.slug}/item/${item.slug}`,
    siteName: business.name,
    imagePath: `/r/${business.slug}/opengraph-image`,
    imageAlt: `${business.name} — ${item.name}`,
    keywords: [item.name.toLowerCase(), 'delivery', business.name.toLowerCase()],
  });
}

export default async function StoreItemPage({
  params,
}: {
  params: Promise<{ slug: string; item: string }>;
}) {
  const { slug, item: itemSlug } = await params;
  if (demoMode) return <DemoStoreItemPage slug={slug} itemSlug={itemSlug} />;

  const data = await loadPublishedStore(slug);
  const found = data ? findItemBySlug(data.menu, itemSlug) : undefined;
  if (!data || !found) notFound();

  const { business } = data;
  const { item, category } = found;
  const basePath = `/r/${business.slug}`;

  return (
    <>
      <JsonLd
        id={`ld-item-${item.slug}`}
        data={graph(
          menuItemSchema(business, item),
          breadcrumbSchema([
            { name: platform.name, path: '/' },
            { name: business.name, path: basePath },
            { name: item.name, path: `${basePath}/item/${item.slug}` },
          ]),
        )}
      />

      <ItemDetail business={business} category={category} item={item} />
    </>
  );
}
