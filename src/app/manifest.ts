import type { MetadataRoute } from 'next';
import { platform } from '@/lib/platform';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${platform.name} — ${platform.tagline}`,
    short_name: platform.name,
    description: platform.shortDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fbf8f4',
    theme_color: '#c2410c',
    lang: 'pt-BR',
    categories: ['food', 'business', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
