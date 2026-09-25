import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DemoStoreItemPage } from '@/components/demo/demo-store';
import { demoMode } from '@/lib/demo/config';
import { ItemDetail } from '@/components/store/item-detail';
import { JsonLd } from '@/components/json-ld';
import { formatPrice, nameFromSlug } from '@/lib/format';
import { findItemBySlug, visibleMenu } from '@/lib/menu-utils';
import { platform } from '@/lib/platform';
import { breadcrumbSchema, buildMetadata, businessSchema, graph, menuItemSchema } from '@/lib/seo';
import { lookupStore } from '@/server/store-data';

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string; item: string }>;
}): Promise<Metadata> {
  const { locale, slug, item: itemSlug } = await params;
  const t = await getTranslations({ locale, namespace: 'store.meta' });
  const lookup = await lookupStore(slug);
  if (lookup.status === 'unavailable' || lookup.status === 'unpublished') {
    return buildMetadata({
      locale,
      title: t(lookup.status === 'unpublished' ? 'unpublishedTitle' : 'unavailableTitle', {
        name: lookup.business.name,
      }),
      description: t('unavailableDescription'),
      path: `/r/${slug}/item/${itemSlug}`,
      noIndex: true,
    });
  }
  const data = lookup.status === 'ok' ? lookup.data : null;
  const found = data ? findItemBySlug(data.menu, itemSlug) : undefined;

  if (!data || !found) {
    // No modo demonstração o cardápio está no navegador, então o servidor não
    // sabe se o item existe: melhor um título neutro do que anunciar um erro.
    return buildMetadata({
      locale,
      title: demoMode ? `${nameFromSlug(itemSlug)} — ${nameFromSlug(slug)}` : t('itemMissingTitle'),
      description: demoMode ? t('itemDemoDescription') : t('itemMissingDescription'),
      path: `/r/${slug}/item/${itemSlug}`,
      noIndex: true,
    });
  }

  const { business } = data;
  const { item } = found;

  return buildMetadata({
      locale,
    title: `${item.name} — ${formatPrice(item.price)} | ${business.name}`,
    description: t('itemDescription', { text: item.description || item.name, name: business.name }),
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
  params: Promise<{ locale: string; slug: string; item: string }>;
}) {
  const { locale, slug, item: itemSlug } = await params;
  setRequestLocale(locale);
  if (demoMode) return <DemoStoreItemPage slug={slug} itemSlug={itemSlug} />;

  const lookup = await lookupStore(slug);
  // O layout já respondeu com o aviso de indisponível ou fora do ar.
  if (lookup.status === 'unavailable' || lookup.status === 'unpublished') return null;
  const data = lookup.status === 'ok' ? lookup.data : null;
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
          // O restaurante entra junto: é o `seller` da oferta, e sem ele a
          // referência por `@id` apontava para fora do grafo.
          businessSchema(business, visibleMenu(data.menu), locale),
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
