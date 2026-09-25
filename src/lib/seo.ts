import type { Metadata } from 'next';
import { activeZones } from './delivery';
import { addressPoint, hasDeliveryArea } from './delivery-area';
import { formatPrice, isLocalPhoto, isPhotoRef, schemaPrice, toE164 } from './format';
import { SCHEMA_DAYS } from './hours';
import { allItems } from './menu-utils';
import { platform } from './platform';
import { ogLocale, platformText, platformTitle, resolveLocale } from './platform-text';
import { absoluteUrl, siteUrl } from './site';
import type { Business, MenuCategory, MenuItem } from './types';

/** Mantém a descrição no tamanho que o Google costuma exibir (~155 caracteres). */
export function clampDescription(text: string, limit = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(' ')).replace(/[,.;:]$/, '')}…`;
}

/**
 * Os textos e o `inLanguage` destes nós saem do idioma recebido; sem ele vale o
 * padrão (pt-BR). O endereço é o mesmo nos dois idiomas (`localePrefix:
 * 'never'`), então não há `hreflang` a declarar.
 */

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
  /**
   * Ignora o `title.template` do layout raiz (`%s | Menu Online`). É para a página
   * cujo título já começa pela marca — a home —, senão ela sai "Menu Online — … |
   * Menu Online".
   */
  absoluteTitle?: boolean;
  /** Idioma da página (`params.locale`): `og:locale` e o texto alternativo da imagem padrão. */
  locale?: string;
}): Metadata {
  const locale = resolveLocale(params.locale);
  const url = absoluteUrl(params.path);
  const description = clampDescription(params.description);
  const images = [
    {
      url: absoluteUrl(params.imagePath ?? '/opengraph-image'),
      width: 1200,
      height: 630,
      alt: params.imageAlt ?? platformTitle(locale),
    },
  ];

  return {
    title: params.absoluteTitle ? { absolute: params.title } : params.title,
    description,
    keywords: params.keywords,
    alternates: { canonical: url },
    robots: params.noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: params.type ?? 'website',
      url,
      siteName: params.siteName ?? platform.name,
      locale: ogLocale(locale),
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

export function platformOrganizationSchema(locale?: string) {
  return {
    '@type': 'Organization',
    '@id': PLATFORM_ORG_ID,
    name: platform.name,
    url: siteUrl,
    description: platformText(locale)('shortDescription'),
    // O Google pede um logo quadrado (mínimo 112px) — a imagem de compartilhamento
    // 1200×630 não serve para isso e fica em `image`.
    logo: { '@type': 'ImageObject', url: absoluteUrl('/icone-512.png'), width: 512, height: 512 },
    image: absoluteUrl('/opengraph-image'),
    email: platform.email,
    contactPoint: {
      '@type': 'ContactPoint',
      // O atendimento é em português, qualquer que seja o idioma da página.
      email: platform.email,
      contactType: 'customer support',
      availableLanguage: ['Portuguese'],
      areaServed: 'BR',
    },
  };
}

export function platformWebsiteSchema(locale?: string) {
  return {
    '@type': 'WebSite',
    '@id': PLATFORM_SITE_ID,
    url: siteUrl,
    name: platform.name,
    description: platformText(locale)('shortDescription'),
    inLanguage: resolveLocale(locale),
    publisher: { '@id': PLATFORM_ORG_ID },
  };
}

/**
 * O produto em si, para aparecer em buscas por software de cardápio. O Google
 * só mostra resultado enriquecido de aplicativo com `offers` ou avaliação — e
 * avaliação escrita pelo próprio negócio é contra as diretrizes, então é a
 * oferta que sustenta o nó.
 */
export function softwareApplicationSchema(params: {
  offers: { price: string; name: string; billingDuration?: 'P1Y' | 'P1M' }[];
  featureList?: string[];
  locale?: string;
}) {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${siteUrl}/#aplicativo`,
    name: platform.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: platformText(params.locale)('shortDescription'),
    url: siteUrl,
    image: absoluteUrl('/opengraph-image'),
    inLanguage: resolveLocale(params.locale),
    publisher: { '@id': PLATFORM_ORG_ID },
    ...(params.featureList?.length ? { featureList: params.featureList } : {}),
    offers: params.offers.map((offer) => ({
      '@type': 'Offer',
      name: offer.name,
      price: offer.price,
      priceCurrency: 'BRL',
      category: 'SaaS',
      availability: 'https://schema.org/InStock',
      url: absoluteUrl('/criar-conta'),
      ...(offer.billingDuration
        ? {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: offer.price,
              priceCurrency: 'BRL',
              billingDuration: offer.billingDuration,
            },
          }
        : {}),
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

/**
 * Foto do lojista como o schema.org exige: URL absoluta. A foto enviada pelo
 * painel é guardada como caminho (`/img/<id>`) e ganha o domínio aqui; a
 * hospedada fora já vem completa; emoji não é imagem e fica de fora.
 */
function schemaImage(ref: string): string | undefined {
  if (!isPhotoRef(ref)) return undefined;
  return isLocalPhoto(ref) ? absoluteUrl(ref) : ref;
}

/**
 * schema.org/Restaurant do cardápio publicado — base do resultado local. Com o
 * cardápio em mãos, ganha o `priceRange` (o Google o recomenda para negócio
 * local), calculado dos itens disponíveis. `locale` é o idioma da página (o
 * nome da ação de pedir); sem ele, pt-BR.
 */
export function businessSchema(business: Business, menu: MenuCategory[] = [], locale?: string) {
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
  const logo = schemaImage(business.logo);
  const prices = allItems(menu)
    .filter((item) => item.available)
    .map((item) => item.price)
    .filter((price) => Number.isFinite(price) && price > 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const priceRange = prices.length ? (min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`) : undefined;
  // O ponto marcado no mapa do painel. Com ele o buscador sabe onde o
  // restaurante fica e até onde ele entrega, sem depender do texto do endereço.
  const point = addressPoint(business.address);
  const radius = hasDeliveryArea(business) ? business.delivery.radiusKm : 0;

  return {
    '@type': 'Restaurant',
    '@id': businessId(business),
    name: business.name,
    description: business.tagline || business.description,
    url: businessUrl(business),
    // `image` é obrigatória no resultado enriquecido de negócio local: sem foto
    // de logo, vale a imagem de compartilhamento da loja, que já leva o nome.
    ...(logo ? { logo } : {}),
    image: logo ?? businessUrl(business, '/opengraph-image'),
    ...(priceRange ? { priceRange } : {}),
    ...(business.whatsapp ? { telephone: toE164(business.whatsapp) } : {}),
    ...(business.address.street ? { address } : {}),
    ...(point
      ? { geo: { '@type': 'GeoCoordinates', latitude: point.latitude, longitude: point.longitude } }
      : {}),
    ...(openingHoursSpecification.length ? { openingHoursSpecification } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    currenciesAccepted: 'BRL',
    acceptsReservations: false,
    // Nó mínimo com o mesmo `@id` do `menuSchema`: na página do cardápio os
    // dois se fundem; na do prato, onde o cardápio inteiro não vai, ainda diz
    // onde ele está.
    hasMenu: { '@type': 'Menu', '@id': `${businessUrl(business)}#cardapio`, url: businessUrl(business) },
    ...(business.delivery.enabled && (activeZones(business).length || radius > 0)
      ? {
          areaServed: [
            ...activeZones(business).map((zone) => ({
              '@type': 'City',
              name: [zone.name, business.address.city].filter(Boolean).join(', '),
            })),
            // O raio só vira área servida quando há um ponto para centrá-lo.
            ...(radius > 0 && point
              ? [
                  {
                    '@type': 'GeoCircle',
                    geoMidpoint: {
                      '@type': 'GeoCoordinates',
                      latitude: point.latitude,
                      longitude: point.longitude,
                    },
                    geoRadius: Math.round(radius * 1000),
                  },
                ]
              : []),
          ],
        }
      : {}),
    potentialAction: {
      '@type': 'OrderAction',
      name: platformText(locale)('seo.orderAction'),
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
  const image = schemaImage(item.image);
  return {
    '@type': 'MenuItem',
    '@id': url,
    name: item.name,
    ...(item.description ? { description: item.description } : {}),
    url,
    ...(image ? { image } : {}),
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

export function menuSchema(business: Business, menu: MenuCategory[], locale?: string) {
  return {
    '@type': 'Menu',
    '@id': `${businessUrl(business)}#cardapio`,
    name: platformText(locale)('seo.menuName', { name: business.name }),
    url: businessUrl(business),
    inLanguage: resolveLocale(locale),
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
