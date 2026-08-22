'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** QR code gerado no navegador (o servidor não participa no modo demonstração). */
export function QrCodeClient({ url, size = 180 }: { url: string; size?: number }) {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      width: size,
      color: { dark: '#12100e', light: '#ffffff' },
    })
      .then((result) => {
        if (active) setSvg(result);
      })
      .catch(() => setSvg(''));
    return () => {
      active = false;
    };
  }, [url, size]);

  if (!svg) {
    return <div className="size-[200px] animate-pulse rounded-xl bg-ink-100" aria-hidden="true" />;
  }

  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return (
    <figure className="flex flex-col items-center gap-3">
      <div
        className="rounded-xl border border-ink-200 bg-white p-3"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="text-center text-xs text-ink-500">
        <a href={dataUrl} download="cardapio-qrcode.svg" className="font-semibold underline">
          Baixar QR code
        </a>
        <br />
        para imprimir nas mesas e embalagens
      </figcaption>
    </figure>
  );
}
