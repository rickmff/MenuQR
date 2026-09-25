'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { QR_COLORS } from '@/components/painel/qr-style';

/** Lado do PNG: nítido numa folha A5 e ainda leve para mandar pelo WhatsApp. */
const PNG_SIZE = 1024;

/**
 * Os downloads do QR. O padrão é PNG: é o que o lojista abre no celular, manda
 * pelo WhatsApp para a gráfica e imprime sem programa nenhum — o SVG sozinho
 * não abria em quase nada. O SVG continua como opção discreta, para quem vai
 * ampliar o QR numa arte.
 *
 * O PNG é gerado no navegador, com a mesma biblioteca do QR da tela, e vira um
 * link de verdade (dá para salvar com o toque longo): serve igual ao painel com
 * banco e ao modo demonstração, sem rota nova no servidor.
 */
export function QrDownload({ url, svg }: { url: string; svg: string }) {
  const t = useTranslations('painel.qr');
  const [png, setPng] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      width: PNG_SIZE,
      margin: 2,
      color: { ...QR_COLORS },
    })
      .then((result) => {
        if (active) setPng(result);
      })
      .catch(() => {
        if (active) setPng(null);
      });
    return () => {
      active = false;
    };
  }, [url]);

  const svgHref = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return (
    <>
      <a
        href={png ?? undefined}
        download={t('fileName')}
        aria-disabled={png ? undefined : 'true'}
        className={cn(buttonClass({ variant: 'secondary', size: 'sm', disabled: !png }), 'justify-center')}
      >
        <Download aria-hidden="true" className="size-4" />
        {t('download')}
      </a>
      <a href={svgHref} download={t('fileNameSvg')} className="text-caption font-semibold text-gray-700 underline">
        {t('downloadSvg')}
      </a>
    </>
  );
}
