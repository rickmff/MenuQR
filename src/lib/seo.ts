import type { Metadata } from 'next';
import { schemaPrice, toE164 } from './format';
import { SCHEMA_DAYS } from './hours';
import { platform } from './platform';
import { absoluteUrl, locale, siteUrl } from './site';
import type { Business, MenuCategory, MenuItem } from './types';

/** Mantém a descrição no tamanho que o Google costuma exibir (~155 caracteres). */
export function clampDescription(text: string, limit = 155): string {
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
  siteName?: string;
  imagePath?: string;
  imageAlt?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(params.path);
  const description = clampDescription(params.description);
  const images = [
    {
      url: absoluteUrl(params.imagePath ?? '/opengraph-image'),
      width: 1200,
      height: 630,
      alt: params.imageAlt ?? `${platform.name} — ${platform.tagline}`,
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
      siteName: params.siteName ?? platform.name,
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

/* ------------------------------------------------------------- plataforma */

const PLATFORM_ORG_ID = `${siteUrl}/#organizacao`;
const PLATFORM_SITE_ID = `${siteUrl}/#website`;

export function platformOrganizationSchema() {
  return {
    '@type': 'Organization',
    '@id': PLATFORM_ORG_ID,
    name: platform.name,
    url: siteUrl,
    description: platform.shortDescription,
    logo: { '@type': 'ImageObject', url: absoluteUrl('/opengraph-image') },
    email: platform.email,
    contactPoint: {
      '@type': 'ContactPoint',
      email: platform.email,
      contactType: 'customer support',
      availableLanguage: ['Portuguese'],
      areaServed: 'BR',
    },
  };
}

export function platformWebsiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': PLATFORM_SITE_ID,
    url: siteUrl,
    name: platform.name,
    inLanguage: locale,
    publisher: { '@id': PLATFORM_ORG_ID },
  };
}

/** O produto em si, para aparecer em buscas por software de cardápio. */
export function softwareApplicationSchema(offers: { price: string; name: string }[]) {
  return {
    '@type': 'SoftwareApplication',
    name: platform.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: platform.shortDescription,
    url: siteUrl,
    inLanguage: locale,
    offers: offers.map((offer) => ({
      '@type': 'Offer',
      name: offer.name,
      price: offer.price,
      priceCurrency: 'BRL',
      category: 'SaaS',
    })),
  };
}

/* --------------------------------------------------------------- restaurante */

export function businessUrl(business: Pick<Business, 'slug'>, path = ''): string {
  return absoluteUrl(`/r/${business.slug}${path}`);
}

function businessId(business: Business): string {
  return `${businessUrl(business)}#restaurante`;
}

/** schema.org/Restaurant do cardápio publicado — base do resultado local. */
export function businessSchema(business: Business) {
  const address = {
    '@type': 'PostalAddress',
    streetAddress: business.address.street,
    addressLocality: business.address.city,
    addressRegion: business.address.state,
    postalCode: business.address.postalCode,
    addressCountry: 'BR',
  };

  const openingHoursSpecification = Object.entries(business.hours).flatMap(([day, ranges]) =>
    (ranges ?? []).map((range) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${SCHEMA_DAYS[Number(day)]}`,
      opens: range.open,
      closes: range.close,
    })),
  );

  const sameAs = [business.instagram].filter(Boolean);

  return {
    '@type': 'Restaurant',
    '@id': businessId(business),
    name: business.name,
    description: business.tagline || business.description,
    url: businessUrl(business),
    ...(business.whatsapp ? { telephone: toE164(business.whatsapp) } : {}),
    ...(business.email ? { email: business.email } : {}),
    ...(business.address.street ? { address } : {}),
    ...(openingHoursSpecification.length ? { openingHoursSpecification } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(business.payments.length ? { paymentAccepted: business.payments.join(', ') } : {}),
    currenciesAccepted: 'BRL',
    acceptsReservations: false,
    hasMenu: businessUrl(business),
    ...(business.delivery.enabled && business.delivery.zones.length
      ? {
          areaServed: business.delivery.zones.map((zone) => ({
            '@type': 'City',
            name: [zone.name, business.address.city].filter(Boolean).join(', '),
          })),
        }
      : {}),
    potentialAction: {
      '@type': 'OrderAction',
      name: 'Pedir pelo WhatsApp',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: businessUrl(business),
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
      deliveryMethod: [
        ...(business.delivery.enabled ? ['https://schema.org/ParcelService'] : []),
        ...(business.pickup.enabled ? ['https://schema.org/OnSitePickup'] : []),
      ],
    },
  };
}

export function menuItemSchema(business: Business, item: MenuItem) {
  const url = businessUrl(business, `/item/${item.slug}`);
  return {
    '@type': 'MenuItem',
    '@id': url,
    name: item.name,
    ...(item.description ? { description: item.description } : {}),
    url,
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
      availability: item.available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
      seller: { '@id': businessId(business) },
    },
  };
}

export function menuSchema(business: Business, menu: MenuCategory[]) {
  return {
    '@type': 'Menu',
    '@id': `${businessUrl(business)}#cardapio`,
    name: `Cardápio ${business.name}`,
    url: businessUrl(business),
    inLanguage: locale,
    hasMenuSection: menu.map((category) => ({
      '@type': 'MenuSection',
      name: category.name,
      ...(category.description ? { description: category.description } : {}),
      hasMenuItem: category.items.map((item) => menuItemSchema(business, item)),
    })),
  };
}

/* ------------------------------------------------------------------ comuns */

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
