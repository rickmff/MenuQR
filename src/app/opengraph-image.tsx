import { ImageResponse } from 'next/og';
import { platform } from '@/lib/platform';

export const alt = `${platform.name} — ${platform.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Imagem de compartilhamento da plataforma. */
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
          <span>🍽️</span>
          <span>{platform.name}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 940 }}>
            {platform.tagline}
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#e9dfd2', maxWidth: 940 }}>
            Cadastre seu restaurante, publique o cardápio e receba pedidos sem comissão.
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: '#e2703a' }}>menuqr.app</div>
      </div>
    ),
    size,
  );
}
