import type { MetadataRoute } from 'next';
import { listPublishedBusinesses } from '@/server/repositories/businesses';
import { getMenu } from '@/server/repositories/menu';
import { absoluteUrl } from '@/lib/site';

/** O sitemap acompanha o banco: cada cardápio publicado entra com seus pratos. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/criar-conta'), lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/entrar'), lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    {
      url: absoluteUrl('/termos-de-uso'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
    {
      url: absoluteUrl('/politica-de-privacidade'),
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];

  let businesses: Awaited<ReturnType<typeof listPublishedBusinesses>> = [];
  try {
    businesses = await listPublishedBusinesses();
  } catch {
    // Banco indisponível no build: o sitemap sai só com as páginas fixas.
    return staticPages;
  }

  const tenantPages = await Promise.all(
    businesses.map(async (business) => {
      const menu = await getMenu(business.id);
      const updatedAt = new Date(business.updatedAt || now);
      return [
        {
          url: absoluteUrl(`/r/${business.slug}`),
          lastModified: updatedAt,
          changeFrequency: 'daily' as const,
          priority: 0.9,
        },
        ...menu.flatMap((category) =>
          category.items.map((item) => ({
            url: absoluteUrl(`/r/${business.slug}/item/${item.slug}`),
            lastModified: updatedAt,
            changeFrequency: 'weekly' as const,
            priority: item.available ? 0.7 : 0.4,
          })),
        ),
      ];
    }),
  );

  return [...staticPages, ...tenantPages.flat()];
}
