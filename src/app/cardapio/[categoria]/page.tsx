import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { ItemCard } from '@/components/item-card';
import { JsonLd } from '@/components/json-ld';
import { formatPrice } from '@/lib/format';
import { getCategoryBySlug, menu, toCardItem } from '@/lib/menu';
import { restaurant } from '@/lib/restaurant';
import { breadcrumbSchema, buildMetadata, graph, menuItemSchema } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';

type Params = { categoria: string };

/** Gera uma página estática por categoria no build. */
export function generateStaticParams(): Params[] {
  return menu.map((category) => ({ categoria: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { categoria } = await params;
  const category = getCategoryBySlug(categoria);
  if (!category) return buildMetadata({ title: 'Categoria não encontrada', description: '', path: '/cardapio', noIndex: true });

  const cheapest = Math.min(...category.items.map((item) => item.price));
  return buildMetadata({
    title: `${category.name} — cardápio e delivery`,
    description:
      `${category.items.length} opções de ${category.name.toLowerCase()} a partir de ${formatPrice(cheapest)} ` +
      `no ${restaurant.name}. Delivery em ${restaurant.address.city} com pedido pelo WhatsApp.`,
    path: `/cardapio/${category.slug}`,
    keywords: [category.name.toLowerCase(), 'delivery', 'cardápio'],
  });
}

export default async function CategoriaPage({ params }: { params: Promise<Params> }) {
  const { categoria } = await params;
  const category = getCategoryBySlug(categoria);
  if (!category) notFound();

  const trail = [
    { name: 'Início', path: '/' },
    { name: 'Cardápio', path: '/cardapio' },
    { name: category.name, path: `/cardapio/${category.slug}` },
  ];

  const others = menu.filter((entry) => entry.slug !== category.slug);

  return (
    <>
      <JsonLd
        id={`ld-categoria-${category.slug}`}
        data={graph(
          {
            '@type': 'MenuSection',
            '@id': absoluteUrl(`/cardapio/${category.slug}`),
            name: category.name,
            description: category.description,
            url: absoluteUrl(`/cardapio/${category.slug}`),
            hasMenuItem: category.items.map((item) => menuItemSchema(item, category)),
          },
          breadcrumbSchema(trail),
        )}
      />

      <div className="container-page py-8">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <p className="text-4xl" aria-hidden="true">
            {category.icon}
          </p>
          <h1 className="mt-2 text-4xl font-semibold sm:text-5xl">{category.name}</h1>
          <p className="mt-4 text-lg text-charcoal-700">{category.description}</p>
        </header>

        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {category.items.map((item, index) => (
            <ItemCard key={item.id} item={toCardItem(item)} category={category} priority={index < 2} />
          ))}
        </ul>

        <nav aria-label="Outras categorias" className="mt-14 border-t border-cream-200 pt-8">
          <h2 className="font-display text-xl font-semibold">Continue explorando o cardápio</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {others.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={`/cardapio/${entry.slug}`}
                  className="inline-block rounded-full border border-cream-200 bg-white px-4 py-2 text-sm font-medium hover:border-ember-400"
                >
                  {entry.icon} {entry.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}
