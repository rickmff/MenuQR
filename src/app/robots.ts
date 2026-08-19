import type { MetadataRoute } from 'next';
import { absoluteUrl, siteUrl } from '@/lib/site';

/**
 * Liberamos o rastreamento completo: as variações com parâmetro (?busca=, ?utm_)
 * apontam para a mesma URL canônica, então o Google já as agrupa sozinho.
 * Bloquear esses caminhos atrapalharia o rastreamento das páginas de campanha e
 * da busca interna declarada em WebSite/SearchAction.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: siteUrl,
  };
}
