import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DemoStoreItemPage } from '@/components/demo/demo-store';
import { demoMode } from '@/lib/demo/config';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DishImage } from '@/components/store/dish-image';
import { ItemCard } from '@/components/store/item-card';
import { ItemOrderPanel } from '@/components/store/item-order-panel';
import { JsonLd } from '@/components/json-ld';
import { formatPrice } from '@/lib/format';
import { findItemBySlug, toCardItem } from '@/lib/menu-utils';
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
  const data = demoMode ? null : await loadPublishedStore(slug);
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

  const trail = [
    { name: platform.name, path: '/' },
    { name: business.name, path: basePath },
    { name: item.name, path: `${basePath}/item/${item.slug}` },
  ];

  const related = category.items.filter((entry) => entry.id !== item.id).slice(0, 4);

  return (
    <>
      <JsonLd
        id={`ld-item-${item.slug}`}
        data={graph(menuItemSchema(business, item), breadcrumbSchema(trail))}
      />

      <div className="container-page py-8 pb-28 sm:pb-8">
        <Breadcrumbs trail={trail} />

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div>
            <DishImage
              image={item.image}
              alt={item.imageAlt || item.name}
              priority
              className="h-52 w-full rounded-card border border-ink-200 sm:aspect-4/3 sm:h-auto"
              emojiClassName="text-[5rem] sm:text-[7rem]"
              sizes="(max-width: 1024px) 100vw, 560px"
            />

            {(item.serves || item.calories || item.allergens.length > 0) && (
              <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                {item.serves && (
                  <div className="rounded-xl border border-ink-200 bg-white p-4">
                    <dt className="text-ink-500">Serve</dt>
                    <dd className="mt-1 font-semibold">{item.serves}</dd>
                  </div>
                )}
                {item.calories && (
                  <div className="rounded-xl border border-ink-200 bg-white p-4">
                    <dt className="text-ink-500">Calorias</dt>
                    <dd className="mt-1 font-semibold">{item.calories} kcal</dd>
                  </div>
                )}
                {item.allergens.length > 0 && (
                  <div className="col-span-2 rounded-xl border border-ink-200 bg-white p-4 sm:col-span-1">
                    <dt className="text-ink-500">Contém</dt>
                    <dd className="mt-1 font-semibold">{item.allergens.join(', ')}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-ink-500">
              <Link href={`${basePath}#${category.slug}`} className="hover:text-ink-950">
                {category.icon} {category.name}
              </Link>
            </p>
            <h1 className="mt-2 text-4xl font-semibold">{item.name}</h1>
            {item.description && <p className="mt-3 text-lg text-ink-700">{item.description}</p>}
            <p className="mt-4 font-display text-3xl font-bold text-(--tenant-brand-ink)">
              {formatPrice(item.price)}
            </p>

            {item.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-md bg-ink-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ink-700"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8">
              <ItemOrderPanel item={item} />
            </div>

            {business.delivery.enabled && business.delivery.minOrder > 0 && (
              <p className="mt-4 text-sm text-ink-500">
                Pedido mínimo para entrega: {formatPrice(business.delivery.minOrder)}
                {business.delivery.freeAbove > 0
                  ? ` · Frete grátis acima de ${formatPrice(business.delivery.freeAbove)}`
                  : ''}
              </p>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t border-ink-200 pt-10" aria-labelledby="relacionados">
            <h2 id="relacionados" className="font-display text-2xl font-semibold">
              Também em {category.name}
            </h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {related.map((entry) => (
                <ItemCard key={entry.id} item={toCardItem(entry)} basePath={basePath} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
