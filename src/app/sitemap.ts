import type { MetadataRoute } from 'next';
import { listPublishedBusinesses } from '@/server/repositories/businesses';
import { getMenu } from '@/server/repositories/menu';
import { isPhotoRef, isUploadedImage } from '@/lib/format';
import { absoluteUrl } from '@/lib/site';

/**
 * O sitemap acompanha o banco: cada cardápio publicado entra com seus pratos —
 * e a foto de cada prato vai junto, para a busca de imagens.
 *
 * As páginas fixas vão sem `lastModified`: o valor era "agora" a cada pedido,
 * e um `lastmod` que muda sempre é descartado pelo Google. Só o cardápio, que
 * tem `updatedAt` de verdade, informa a data. `/entrar` fica de fora: continua
 * rastreável, mas não há o que buscar numa tela de login.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/perguntas-frequentes'), changeFrequency: 'monthly', priority: 0.6 },
    { url: absoluteUrl('/criar-conta'), changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/termos-de-uso'), changeFrequency: 'yearly', priority: 0.2 },
    { url: absoluteUrl('/politica-de-privacidade'), changeFrequency: 'yearly', priority: 0.2 },
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
      const updatedAt = new Date(business.updatedAt || Date.now());
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
            // Emoji não é imagem; foto enviada ganha o domínio, a externa vai como está.
            ...(isPhotoRef(item.image)
              ? { images: [isUploadedImage(item.image) ? absoluteUrl(item.image) : item.image] }
              : {}),
          })),
        ),
      ];
    }),
  );

  return [...staticPages, ...tenantPages.flat()];
}
