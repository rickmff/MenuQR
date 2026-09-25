import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DemoStorePage } from '@/components/demo/demo-store';
import { demoMode } from '@/lib/demo/config';
import { JsonLd } from '@/components/json-ld';
import { StoreMenu } from '@/components/store/store-menu';
import { formatPrice } from '@/lib/format';
import { countItems, priceFrom, visibleMenu } from '@/lib/menu-utils';
import { platform } from '@/lib/platform';
import {
  breadcrumbSchema,
  buildMetadata,
  businessSchema,
  graph,
  menuSchema,
} from '@/lib/seo';
import { listPublishedBusinesses } from '@/server/repositories/businesses';
import { lookupStore } from '@/server/store-data';
import { nameFromSlug } from '@/lib/format';

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
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: 'store.meta' });
  const lookup = await lookupStore(slug);

  if (lookup.status === 'unavailable' || lookup.status === 'unpublished') {
    return buildMetadata({
      locale,
      title: t(lookup.status === 'unpublished' ? 'unpublishedTitle' : 'unavailableTitle', {
        name: lookup.business.name,
      }),
      description: t('unavailableDescription'),
      path: `/r/${slug}`,
      noIndex: true,
    });
  }

  const data = lookup.status === 'ok' ? lookup.data : null;
  if (!data) {
    // No modo demonstração o cardápio chega no fragmento do endereço, que o
    // servidor não enxerga: o nome sai do próprio endereço da loja, em vez de
    // anunciar um erro que só existe do lado do servidor.
    return buildMetadata({
      locale,
      title: demoMode ? nameFromSlug(slug) : t('missingTitle'),
      description: demoMode ? t('demoDescription') : t('missingDescription'),
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
    t('storeDescription', {
      name: business.name,
      inCity: city ? t('inCity', { city }) : '',
      count: total,
      from: cheapest > 0 ? t('fromPrice', { price: formatPrice(cheapest) }) : '',
    });

  return {
    ...buildMetadata({
      locale,
      title: t('storeTitle', { name: business.name, inCity: city ? t('inCity', { city }) : '' }),
      description,
      path: `/r/${business.slug}`,
      siteName: business.name,
      imagePath: `/r/${business.slug}/opengraph-image`,
      imageAlt: `${business.name} — ${business.tagline || t('onlineMenu')}`,
      keywords: [
        `${business.name}`,
        t('onlineMenu'),
        'delivery',
        ...(city ? [t('keywordRestaurant', { city }), t('keywordDelivery', { city })] : []),
      ],
    }),
    // Instalar pelo cardápio cria um atalho para esta loja, não para a plataforma.
    manifest: `/r/${business.slug}/manifest.webmanifest`,
    appleWebApp: { capable: true, title: business.name, statusBarStyle: 'default' },
  };
}

export default async function StorePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (demoMode) return <DemoStorePage slug={slug} />;

  const lookup = await lookupStore(slug);
  if (lookup.status === 'missing') notFound();
  // O layout já respondeu com o aviso de indisponível ou fora do ar.
  if (lookup.status !== 'ok') return null;

  const { business, menu } = lookup.data;
  const categories = visibleMenu(menu);

  const trail = [
    { name: platform.name, path: '/' },
    { name: business.name, path: `/r/${business.slug}` },
  ];

  return (
    <>
      <JsonLd
        id={`ld-store-${business.slug}`}
        data={graph(
          businessSchema(business, categories, locale),
          menuSchema(business, categories, locale),
          breadcrumbSchema(trail),
        )}
      />

      <StoreMenu business={business} categories={categories} />
    </>
  );
}
