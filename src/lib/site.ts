/** Configuração de URL pública, usada por metadata, sitemap, robots e JSON-LD. */

const fallbackUrl = 'https://www.saborebrasa.com.br';

function normalize(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * URL canônica do site. Em produção vem de NEXT_PUBLIC_SITE_URL; na Vercel,
 * cai para VERCEL_PROJECT_PRODUCTION_URL para os deploys de preview.
 */
export const siteUrl = normalize(
  process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : fallbackUrl),
);

export function absoluteUrl(path = '/'): string {
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined;

export const locale = 'pt-BR';
