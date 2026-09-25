'use client';

import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** QR code gerado no navegador (o servidor não participa no modo demonstração). */
export function QrCodeClient({ url, size = 180 }: { url: string; size?: number }) {
  const t = useTranslations('demo.qr');
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
    return <div className="size-[200px] animate-pulse rounded-md bg-gray-50" aria-hidden="true" />;
  }

  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return (
    <figure className="flex flex-col items-center gap-3">
      <div
        className="rounded-md border border-gray-200 bg-white p-3"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="text-center text-caption text-gray-600">
        <a href={dataUrl} download={t('fileName')} className="font-semibold underline">
          {t('download')}
        </a>
        <br />
        {t('caption')}
      </figcaption>
    </figure>
  );
}
