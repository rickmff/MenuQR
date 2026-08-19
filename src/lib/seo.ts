import type { Metadata } from 'next';
import { schemaPrice } from './format';
import { SCHEMA_DAYS } from './hours';
import { menu, priceFrom } from './menu';
import { restaurant } from './restaurant';
import { absoluteUrl, locale, siteUrl } from './site';
import { toE164 } from './format';
import type { MenuCategory, MenuItem } from './types';

const ORGANIZATION_ID = `${siteUrl}/#organizacao`;
const RESTAURANT_ID = `${siteUrl}/#restaurante`;
const WEBSITE_ID = `${siteUrl}/#website`;

/** Mantém a descrição no tamanho que o Google costuma exibir (~155 caracteres). */
function clampDescription(text: string, limit = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '')}…`;
}

/** Monta os metadados de uma página com canonical, Open Graph e Twitter Card. */
export function buildMetadata(params: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  type?: 'website' | 'article';
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(params.path);
  const description = clampDescription(params.description);
  // A imagem é gerada por app/opengraph-image.tsx; repetimos aqui porque cada
  // rota que declara `openGraph` precisa apontar a própria imagem.
  const images = [
    {
      url: absoluteUrl('/opengraph-image'),
      width: 1200,
      height: 630,
      alt: `${restaurant.name} — ${restaurant.tagline}`,
    },
  ];

  return {
    title: params.title,
    description,
    keywords: params.keywords,
    alternates: { canonical: url },
    robots: params.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: params.type ?? 'website',
      url,
      siteName: restaurant.name,
      locale: locale.replace('-', '_'),
      title: params.title,
      description,
      images,
    },
    twitter: {
      card: 'summary_large_image',
      title: params.title,
      description,
      images,
    },
  };
}

const postalAddress = {
  '@type': 'PostalAddress',
  streetAddress: restaurant.address.street,
  addressLocality: restaurant.address.city,
  addressRegion: restaurant.address.state,
  postalCode: restaurant.address.postalCode,
  addressCountry: restaurant.address.country,
} as const;

const openingHoursSpecification = Object.entries(restaurant.hours).flatMap(([day, ranges]) =>
  (ranges ?? []).map((range) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${SCHEMA_DAYS[Number(day)]}`,
    opens: range.open,
    closes: range.close,
  })),
);

/** schema.org/Restaurant — base do rich result de negócio local. */
export function restaurantSchema() {
  return {
    '@type': 'Restaurant',
    '@id': RESTAURANT_ID,
    name: restaurant.name,
    legalName: restaurant.legalName,
    description: restaurant.shortDescription,
    url: siteUrl,
    telephone: toE164(restaurant.whatsapp),
    email: restaurant.email,
    priceRange: restaurant.priceRange,
    servesCuisine: restaurant.cuisine,
    foundingDate: restaurant.founded,
    currenciesAccepted: 'BRL',
    paymentAccepted: restaurant.payments.join(', '),
    address: postalAddress,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: restaurant.address.latitude,
      longitude: restaurant.address.longitude,
    },
    hasMap: restaurant.address.mapsUrl,
    openingHoursSpecification,
    acceptsReservations: false,
    hasMenu: absoluteUrl('/cardapio'),
    sameAs: Object.values(restaurant.social).filter(Boolean),
    areaServed: restaurant.delivery.zones.map((zone) => ({
      '@type': 'City',
      name: `${zone.name}, ${restaurant.address.city}`,
    })),
    makesOffer: {
      '@type': 'Offer',
      name: 'Delivery de hambúrguer artesanal',
      priceCurrency: 'BRL',
      lowPrice: schemaPrice(priceFrom),
      availableDeliveryMethod: 'https://schema.org/OnSitePickup',
      eligibleTransactionVolume: {
        '@type': 'PriceSpecification',
        minPrice: schemaPrice(restaurant.delivery.minOrder),
        priceCurrency: 'BRL',
      },
    },
    potentialAction: {
      '@type': 'OrderAction',
      name: 'Pedir delivery',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: absoluteUrl('/cardapio'),
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
      deliveryMethod: ['https://schema.org/OnSitePickup', 'https://schema.org/ParcelService'],
    },
  };
}

export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': ORGANIZATION_ID,
    name: restaurant.legalName,
    alternateName: restaurant.name,
    url: siteUrl,
    logo: { '@type': 'ImageObject', url: absoluteUrl('/opengraph-image') },
    email: restaurant.email,
    address: postalAddress,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: toE164(restaurant.whatsapp),
      contactType: 'customer service',
      availableLanguage: ['Portuguese'],
      areaServed: 'BR',
    },
    sameAs: Object.values(restaurant.social).filter(Boolean),
  };
}

export function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: siteUrl,
    name: restaurant.name,
    inLanguage: locale,
    publisher: { '@id': ORGANIZATION_ID },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/cardapio')}?busca={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: absoluteUrl(entry.path),
    })),
  };
}

export function menuItemSchema(item: MenuItem, category: MenuCategory) {
  return {
    '@type': 'MenuItem',
    '@id': absoluteUrl(`/cardapio/${category.slug}/${item.slug}`),
    name: item.name,
    description: item.description,
    url: absoluteUrl(`/cardapio/${category.slug}/${item.slug}`),
    ...(item.suitableForDiet?.length
      ? { suitableForDiet: item.suitableForDiet.map((diet) => `https://schema.org/${diet}`) }
      : {}),
    ...(item.calories
      ? {
          nutrition: {
            '@type': 'NutritionInformation',
            calories: `${item.calories} kcal`,
            ...(item.serves ? { servingSize: item.serves } : {}),
          },
        }
      : {}),
    offers: {
      '@type': 'Offer',
      price: schemaPrice(item.price),
      priceCurrency: 'BRL',
      availability: item.available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: absoluteUrl(`/cardapio/${category.slug}/${item.slug}`),
      seller: { '@id': RESTAURANT_ID },
    },
  };
}

/** schema.org/Menu completo, com seções e itens. */
export function menuSchema() {
  return {
    '@type': 'Menu',
    '@id': `${absoluteUrl('/cardapio')}#menu`,
    name: `Cardápio ${restaurant.name}`,
    url: absoluteUrl('/cardapio'),
    inLanguage: locale,
    hasMenuSection: menu.map((category) => ({
      '@type': 'MenuSection',
      '@id': absoluteUrl(`/cardapio/${category.slug}`),
      name: category.name,
      description: category.description,
      url: absoluteUrl(`/cardapio/${category.slug}`),
      hasMenuItem: category.items.map((item) => menuItemSchema(item, category)),
    })),
  };
}

export function faqSchema(questions: { question: string; answer: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: questions.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

/** Junta vários nós em um único @graph, como recomenda o schema.org. */
export function graph(...nodes: Record<string, unknown>[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
