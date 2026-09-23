import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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
  params: Promise<{ slug: string; item: string }>;
}): Promise<Metadata> {
  const { slug, item: itemSlug } = await params;
  const lookup = await lookupStore(slug);
  if (lookup.status === 'unavailable') {
    return buildMetadata({
      title: `${lookup.business.name} — cardápio temporariamente indisponível`,
      description: 'Este cardápio está fora do ar no momento.',
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
      title: demoMode ? `${nameFromSlug(itemSlug)} — ${nameFromSlug(slug)}` : 'Item não encontrado',
      description: demoMode
        ? 'Peça pelo cardápio online e finalize no WhatsApp.'
        : 'Este item não está disponível.',
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

  const lookup = await lookupStore(slug);
  // O layout já respondeu com o aviso de indisponível.
  if (lookup.status === 'unavailable') return null;
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
          businessSchema(business, visibleMenu(data.menu)),
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
