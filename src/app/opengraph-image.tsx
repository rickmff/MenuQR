import { ImageResponse } from 'next/og';
import { platform } from '@/lib/platform';
import { platformText, platformTitle } from '@/lib/platform-text';
import { siteUrl } from '@/lib/site';

/**
 * Em pt-BR, o idioma padrão, e não no da requisição: o endereço da imagem é o
 * mesmo nos dois idiomas e quem a busca é o robô da rede social, que não
 * manda cookie — ler o idioma só tornaria a imagem dinâmica, sem ganho.
 */
const text = platformText();

export const alt = platformTitle();
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const host = new URL(siteUrl).host.replace(/^www\./, '');

/** A marca, no mesmo desenho de `platform/logo.tsx`: três olhos de QR sobre o verde vivo. */
function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect width="32" height="32" rx="8" fill="#25d366" />
      <g fill="#ffffff">
        <rect x="7" y="7" width="8" height="8" rx="2" />
        <rect x="17" y="7" width="8" height="8" rx="2" />
        <rect x="7" y="17" width="8" height="8" rx="2" />
        <rect x="17" y="17" width="3.5" height="3.5" rx="1" />
        <rect x="21.5" y="21.5" width="3.5" height="3.5" rx="1" />
      </g>
      <g fill="#25d366">
        <rect x="9.5" y="9.5" width="3" height="3" rx="0.75" />
        <rect x="19.5" y="9.5" width="3" height="3" rx="0.75" />
        <rect x="9.5" y="19.5" width="3" height="3" rx="0.75" />
      </g>
    </svg>
  );
}

/**
 * Imagem de compartilhamento da plataforma. Grafite chapado com a marca e o
 * endereço no verde vivo — o mesmo bloco final da landing (D19): um verde por
 * dobra, e o verde em tela cheia leria como cor institucional.
 */
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
          background: '#111b21',
          color: '#ffffff',
          padding: 72,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 40, fontWeight: 600 }}>
          <Mark size={64} />
          <span>{platform.name}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 66, fontWeight: 600, lineHeight: 1.05, maxWidth: 980 }}>
            {text('tagline')}
          </div>
          <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.3, color: '#d1d7db', maxWidth: 940 }}>
            {text('meta.ogImageText')}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 28, color: '#25d366' }}>{host}</div>
      </div>
    ),
    size,
  );
}
