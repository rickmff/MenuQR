import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DemoStorePage } from '@/components/demo/demo-store';
import { demoMode } from '@/lib/demo/config';
import { JsonLd } from '@/components/json-ld';
import { MenuBrowser } from '@/components/store/menu-browser';
import { StoreHero } from '@/components/store/store-hero';
import { formatPrice } from '@/lib/format';
import { countItems, priceFrom, toCardCategory, visibleMenu } from '@/lib/menu-utils';
import { platform } from '@/lib/platform';
import {
  breadcrumbSchema,
  buildMetadata,
  businessSchema,
  graph,
  menuSchema,
} from '@/lib/seo';
import { listPublishedBusinesses } from '@/server/repositories/businesses';
import { loadPublishedStore } from '@/server/store-data';

export const revalidate = 300;

/** Pré-renderiza no build os cardápios já publicados; novos entram sob demanda. */
export async function generateStaticParams() {
  if (demoMode) return [];
  try {
    const businesses = await listPublishedBusinesses();
    return businesses.map((business) => ({ slug: business.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = demoMode ? null : await loadPublishedStore(slug);
  if (!data) {
    return buildMetadata({
      title: 'Cardápio não encontrado',
      description: 'Este cardápio não está disponível.',
      path: `/r/${slug}`,
      noIndex: true,
    });
  }

  const { business, menu } = data;
  const city = business.address.city;
  const total = countItems(menu);
  const cheapest = priceFrom(menu);

  const description =
    business.description ||
    `Cardápio online do ${business.name}${city ? ` em ${city}` : ''}: ${total} ${
      total === 1 ? 'opção' : 'opções'
    }${cheapest > 0 ? ` a partir de ${formatPrice(cheapest)}` : ''}. Peça o delivery e finalize pelo WhatsApp.`;

  return {
    ...buildMetadata({
      title: `${business.name} — cardápio e delivery${city ? ` em ${city}` : ''}`,
      description,
      path: `/r/${business.slug}`,
      siteName: business.name,
      imagePath: `/r/${business.slug}/opengraph-image`,
      imageAlt: `${business.name} — ${business.tagline || 'cardápio online'}`,
      keywords: [
        `${business.name}`,
        'cardápio online',
        'delivery',
        ...(city ? [`restaurante ${city}`, `delivery ${city}`] : []),
      ],
    }),
    // Instalar pelo cardápio cria um atalho para esta loja, não para a plataforma.
    manifest: `/r/${business.slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: business.name, statusBarStyle: 'default' },
  };
}

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (demoMode) return <DemoStorePage slug={slug} />;

  const data = await loadPublishedStore(slug);
  if (!data) notFound();

  const { business, menu } = data;
  const categories = visibleMenu(menu);

  const trail = [
    { name: platform.name, path: '/' },
    { name: business.name, path: `/r/${business.slug}` },
  ];

  return (
    <>
      <JsonLd
        id={`ld-store-${business.slug}`}
        data={graph(businessSchema(business), menuSchema(business, categories), breadcrumbSchema(trail))}
      />

      <StoreHero business={business} menu={categories} />

      <div className="container-page pb-32">
        {categories.length === 0 ? (
          <p className="py-24 text-center text-ink-500">
            Este cardápio ainda não tem itens publicados.
          </p>
        ) : (
          <MenuBrowser categories={categories.map(toCardCategory)} basePath={`/r/${business.slug}`} />
        )}
      </div>
    </>
  );
}
