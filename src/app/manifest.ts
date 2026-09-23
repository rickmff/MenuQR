import type { MetadataRoute } from 'next';
import { platform } from '@/lib/platform';

/**
 * Manifesto da plataforma. Cores do sistema (D17/D21): `theme_color` é o
 * `primary` e o fundo de abertura é branco, o papel do conteúdo. O ícone
 * `maskable` é o mesmo desenho em sangria total, para o Android recortar no
 * formato que quiser sem perder os olhos do QR.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: `${platform.name} — ${platform.tagline}`,
    short_name: platform.name,
    description: platform.shortDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0b8639',
    lang: 'pt-BR',
    categories: ['food', 'business', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
