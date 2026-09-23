import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';

/**
 * O painel e a API não têm o que indexar — o restante do site, incluindo os
 * cardápios publicados e as fotos em `/img`, fica liberado. `/painel` sem
 * barra já cobre tudo abaixo dele.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/painel', '/api/'] }],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
