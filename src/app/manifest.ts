import type { MetadataRoute } from 'next';
import { restaurant } from '@/lib/restaurant';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${restaurant.name} — ${restaurant.tagline}`,
    short_name: restaurant.name,
    description: restaurant.shortDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbf8f4',
    theme_color: '#c2410c',
    lang: 'pt-BR',
    categories: ['food', 'shopping'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
