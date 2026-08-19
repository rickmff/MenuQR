import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DishImage } from '@/components/dish-image';
import { ItemCard } from '@/components/item-card';
import { ItemOrderPanel } from '@/components/item-order-panel';
import { JsonLd } from '@/components/json-ld';
import { formatPrice } from '@/lib/format';
import { getItemBySlug, menu, toCardItem } from '@/lib/menu';
import { restaurant } from '@/lib/restaurant';
import { breadcrumbSchema, buildMetadata, graph, menuItemSchema } from '@/lib/seo';

type Params = { categoria: string; item: string };

/** Uma página estática por prato — cada uma é uma porta de entrada da busca orgânica. */
export function generateStaticParams(): Params[] {
  return menu.flatMap((category) =>
    category.items.map((item) => ({ categoria: category.slug, item: item.slug })),
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { categoria, item: itemSlug } = await params;
  const found = getItemBySlug(categoria, itemSlug);
  if (!found) {
    return buildMetadata({ title: 'Item não encontrado', description: '', path: '/cardapio', noIndex: true });
  }

  const { item, category } = found;
  return buildMetadata({
    title: `${item.name} — ${formatPrice(item.price)}`,
    description: `${item.description} Peça o delivery do ${restaurant.name} e finalize pelo WhatsApp.`,
    path: `/cardapio/${category.slug}/${item.slug}`,
    keywords: [item.name.toLowerCase(), category.name.toLowerCase(), 'delivery'],
  });
}

export default async function ItemPage({ params }: { params: Promise<Params> }) {
  const { categoria, item: itemSlug } = await params;
  const found = getItemBySlug(categoria, itemSlug);
  if (!found) notFound();

  const { item, category } = found;
  const trail = [
    { name: 'Início', path: '/' },
    { name: 'Cardápio', path: '/cardapio' },
    { name: category.name, path: `/cardapio/${category.slug}` },
    { name: item.name, path: `/cardapio/${category.slug}/${item.slug}` },
  ];

  const related = category.items.filter((entry) => entry.id !== item.id).slice(0, 4);

  return (
    <>
      <JsonLd
        id={`ld-item-${item.slug}`}
        data={graph(menuItemSchema(item, category), breadcrumbSchema(trail))}
      />

      <div className="container-page py-8">
        <Breadcrumbs trail={trail} />

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div>
            <DishImage
              image={item.image}
              alt={item.imageAlt ?? item.name}
              priority
              className="aspect-4/3 w-full rounded-card border border-cream-200"
              emojiClassName="text-[7rem]"
              sizes="(max-width: 1024px) 100vw, 560px"
            />

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              {item.serves && (
                <div className="rounded-xl border border-cream-200 bg-white p-4">
                  <dt className="text-charcoal-500">Serve</dt>
                  <dd className="mt-1 font-semibold">{item.serves}</dd>
                </div>
              )}
              {item.calories && (
                <div className="rounded-xl border border-cream-200 bg-white p-4">
                  <dt className="text-charcoal-500">Calorias</dt>
                  <dd className="mt-1 font-semibold">{item.calories} kcal</dd>
                </div>
              )}
              {item.allergens?.length ? (
                <div className="col-span-2 rounded-xl border border-cream-200 bg-white p-4 sm:col-span-1">
                  <dt className="text-charcoal-500">Contém</dt>
                  <dd className="mt-1 font-semibold">{item.allergens.join(', ')}</dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div>
            <p className="text-sm font-medium text-ember-600">
              <Link href={`/cardapio/${category.slug}`} className="hover:underline">
                {category.icon} {category.name}
              </Link>
            </p>
            <h1 className="mt-2 text-4xl font-semibold">{item.name}</h1>
            <p className="mt-3 text-lg text-charcoal-700">{item.description}</p>
            <p className="mt-4 font-display text-3xl font-bold text-ember-600">{formatPrice(item.price)}</p>

            {item.tags?.length ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-md bg-ember-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-ember-700"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-8">
              <ItemOrderPanel item={item} />
            </div>

            <p className="mt-4 text-sm text-charcoal-500">
              Entrega em até 45 minutos na região central · Pedido mínimo{' '}
              {formatPrice(restaurant.delivery.minOrder)} · Frete grátis acima de{' '}
              {formatPrice(restaurant.delivery.freeAbove)}
            </p>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16 border-t border-cream-200 pt-10" aria-labelledby="relacionados">
            <h2 id="relacionados" className="font-display text-2xl font-semibold">
              Quem pediu {item.name} também levou
            </h2>
            <ul className="mt-6 grid gap-4 md:grid-cols-2">
              {related.map((entry) => (
                <ItemCard key={entry.id} item={toCardItem(entry)} category={category} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
