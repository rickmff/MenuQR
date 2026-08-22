import type { MetadataRoute } from 'next';
import { absoluteUrl, siteUrl } from '@/lib/site';

/**
 * O painel e as rotas de conta não têm o que indexar — o restante do site,
 * incluindo os cardápios publicados, fica liberado.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/painel', '/painel/'] }],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl,
  };
}
