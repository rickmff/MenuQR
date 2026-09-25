import { NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { localeFromRequest } from '@/i18n/locale';
import { normalizeHexColor } from '@/lib/colors';
import { nameFromSlug } from '@/lib/format';
import { loadPublishedStore } from '@/server/store-data';

/**
 * Manifesto por restaurante: instalado na tela inicial, o aplicativo abre o
 * cardápio daquela loja (e não a página da plataforma), com o nome e a cor
 * da marca dela.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Fora do `[locale]`: o idioma vem do cookie do seletor ou do navegador.
  const locale = await localeFromRequest();
  const t = await getTranslations({ locale, namespace: 'store.manifest' });
  // Sem banco (modo demonstração) ainda vale entregar um manifesto utilizável.
  const data = await loadPublishedStore(slug).catch(() => null);
  const business = data?.business;

  // Sem banco (modo demonstração), o nome sai do próprio endereço da loja.
  const name = business?.name ?? nameFromSlug(slug);
  const brand = normalizeHexColor(business?.brandColor ?? '#0b8639');

  // O rótulo do atalho tem pouco espaço na tela inicial: nomes curtos passam
  // inteiros e os longos são cortados em palavra inteira, nunca no meio.
  const shortName =
    name.length <= 15
      ? name
      : name.slice(0, 15).replace(/\s+\S*$/, '').replace(/[\s&-]+$/, '') || name.slice(0, 15);

  return NextResponse.json(
    {
      name: business?.tagline ? `${name} — ${business.tagline}` : name,
      short_name: shortName,
      description: business?.description || t('description', { name }),
      start_url: `/r/${slug}`,
      scope: `/r/${slug}`,
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: brand,
      lang: locale,
      categories: ['food'],
      icons: [
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: '/icone-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icone-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        // O texto muda com o idioma de quem pede: sem cache compartilhado, que
        // entregaria o manifesto de um idioma a quem lê o outro.
        'Cache-Control': 'private, max-age=300',
        Vary: 'Cookie, Accept-Language',
      },
    },
  );
}
