'use client';

import { TriangleAlert } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/**
 * Aviso de rascunho, colado no QR code. O código aparece antes de publicar para o
 * lojista já ir preparando a arte, mas em rascunho o endereço responde 404: quem
 * imprime nessa hora distribui um código que abre uma página de erro. Por isso o
 * aviso fica entre o código e o link de baixar, e não no topo da tela.
 *
 * Um componente só para o QR do servidor e o do modo demonstração, para o texto
 * não divergir. `children` recebe o que só vale num dos modos.
 */
export function QrDraftNotice({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex w-full gap-3 rounded-sm bg-warning-bg p-3 text-left text-body2 text-gray-700">
      <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <p>
        <strong className="font-semibold">Publique antes de imprimir.</strong> Este QR code só funciona
        depois que o cardápio for publicado.{children && <> {children}</>}
      </p>
    </div>
  );
}

/** QR code gerado no navegador (o servidor não participa no modo demonstração). */
export function QrCodeClient({
  url,
  size = 180,
  published,
}: {
  url: string;
  size?: number;
  /** Em rascunho o código vem com o aviso de que ainda não abre. */
  published: boolean;
}) {
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
      {!published && <QrDraftNotice />}
      <figcaption className="text-center text-caption text-gray-600">
        <a href={dataUrl} download="cardapio-qrcode.svg" className="font-semibold underline">
          Baixar QR code
        </a>
        <br />
        para imprimir nas mesas e embalagens
      </figcaption>
    </figure>
  );
}
