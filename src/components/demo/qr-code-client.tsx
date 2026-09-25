'use client';

import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { QrDownload } from '@/components/painel/qr-download';
import { QR_COLORS } from '@/components/painel/qr-style';

/**
 * QR code gerado no navegador (o servidor não participa no modo demonstração).
 * Os downloads são os mesmos do painel com banco (`QrDownload`).
 */
export function QrCodeClient({ url, size = 180 }: { url: string; size?: number }) {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toString(url, {
      type: 'svg',
      margin: 1,
      width: size,
      color: { ...QR_COLORS },
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
    return <div className="size-[200px] animate-pulse rounded-md bg-gray-50" aria-hidden="true" />;
  }

  return (
    <figure className="flex flex-col items-center gap-3">
      <div
        className="rounded-md border border-gray-200 bg-white p-3"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="flex flex-col items-center gap-3">
        <QrDownload url={url} svg={svg} />
      </figcaption>
    </figure>
  );
}
