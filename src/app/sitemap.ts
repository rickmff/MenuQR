import type { MetadataRoute } from 'next';
import { menu } from '@/lib/menu';
import { absoluteUrl } from '@/lib/site';

/**
 * Sitemap completo: páginas institucionais, cardápio, categorias e cada prato.
 * `lastModified` usa a data do build, que é quando o conteúdo estático muda.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/cardapio'), lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/entrega'), lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/sobre'), lastModified, changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl('/contato'), lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/perguntas-frequentes'), lastModified, changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/politica-de-privacidade'), lastModified, changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/termos-de-uso'), lastModified, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const categories: MetadataRoute.Sitemap = menu.map((category) => ({
    url: absoluteUrl(`/cardapio/${category.slug}`),
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const items: MetadataRoute.Sitemap = menu.flatMap((category) =>
    category.items.map((item) => ({
      url: absoluteUrl(`/cardapio/${category.slug}/${item.slug}`),
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: item.available ? 0.7 : 0.4,
    })),
  );

  return [...staticPages, ...categories, ...items];
}
