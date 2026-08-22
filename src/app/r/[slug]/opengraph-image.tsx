import { ImageResponse } from 'next/og';
import { normalizeHexColor, readableTextColor } from '@/lib/colors';
import { countItems, priceFrom } from '@/lib/menu-utils';
import { formatPrice } from '@/lib/format';
import { loadPublishedStore } from '@/server/store-data';

export const alt = 'Cardápio online';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Cada restaurante ganha a própria imagem de compartilhamento, na cor da marca. */
export default async function StoreOpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Sem banco (modo demonstração) a imagem sai com o texto padrão.
  const data = await loadPublishedStore(slug).catch(() => null);

  const business = data?.business;
  const brand = normalizeHexColor(business?.brandColor ?? '#c2410c');
  const ink = readableTextColor(brand);
  const name = business?.name ?? 'Cardápio online';
  const tagline = business?.tagline ?? 'Peça pelo WhatsApp';
  const city = business?.address.city ?? '';
  const total = data ? countItems(data.menu) : 0;
  const cheapest = data ? priceFrom(data.menu) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: brand,
          color: ink,
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 40 }}>
          <span>{business?.logo && business.logo.length <= 4 ? business.logo : '🍽️'}</span>
          <span style={{ fontWeight: 700 }}>{name}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', fontSize: 62, fontWeight: 700, lineHeight: 1.1, maxWidth: 940 }}>
            {tagline}
          </div>
          <div style={{ display: 'flex', fontSize: 30, opacity: 0.85 }}>
            {[
              city ? `Delivery em ${city}` : 'Delivery e retirada',
              total > 0 ? `${total} itens no cardápio` : null,
              cheapest > 0 ? `a partir de ${formatPrice(cheapest)}` : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, opacity: 0.8 }}>
          Peça pelo cardápio e finalize no WhatsApp
        </div>
      </div>
    ),
    size,
  );
}
