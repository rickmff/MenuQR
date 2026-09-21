import QRCode from 'qrcode';
import { QrDraftNotice } from '@/components/demo/qr-code-client';

/**
 * QR code gerado no servidor, sem depender de serviço externo.
 * O SVG é embutido na página e também oferecido para download/impressão.
 */
export async function QrCode({
  url,
  size = 180,
  published,
}: {
  url: string;
  size?: number;
  /** Em rascunho o código vem com o aviso de que ainda não abre. */
  published: boolean;
}) {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    width: size,
    color: { dark: '#1c1815', light: '#ffffff' },
  });

  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return (
    <figure className="flex flex-col items-center gap-3">
      <div
        className="rounded-md border border-gray-200 bg-white p-3"
        // O SVG vem da biblioteca de QR code a partir da própria URL do cardápio.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {!published && (
        // Só aqui: com banco o endereço é o mesmo antes e depois de publicar. No modo
        // demonstração o link carrega o cardápio dentro dele e muda a cada edição.
        <QrDraftNotice>
          Até lá ele abre uma página de erro. O código não muda ao publicar: o que você baixar agora
          continua valendo.
        </QrDraftNotice>
      )}
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
