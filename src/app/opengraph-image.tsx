import { ImageResponse } from 'next/og';
import { restaurant } from '@/lib/restaurant';

export const alt = `${restaurant.name} — ${restaurant.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Imagem de compartilhamento gerada no build (Open Graph e Twitter Card). */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1c1815 0%, #862c08 100%)',
          color: '#fbf8f4',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 34, fontWeight: 700 }}>
          <span>{restaurant.logo}</span>
          <span>{restaurant.name}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, lineHeight: 1.1, maxWidth: 900 }}>
            {restaurant.tagline}
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: '#e9dfd2', maxWidth: 900 }}>
            {`Delivery em ${restaurant.address.city} · pedido finalizado pelo WhatsApp`}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: '#e2703a' }}>
          {`${restaurant.address.street} — ${restaurant.address.district}`}
        </div>
      </div>
    ),
    size,
  );
}
