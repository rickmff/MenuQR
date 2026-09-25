import QRCode from 'qrcode';
import { QrDownload } from '@/components/painel/qr-download';
import { QR_COLORS } from '@/components/painel/qr-style';

/**
 * QR code gerado no servidor, sem depender de serviço externo. O SVG é
 * embutido na página; os downloads (PNG por padrão, SVG para gráfica) ficam
 * com `QrDownload`, o mesmo do modo demonstração.
 */
export async function QrCode({ url, size = 180 }: { url: string; size?: number }) {
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    width: size,
    color: { ...QR_COLORS },
  });

  return (
    <figure className="flex flex-col items-center gap-3">
      <div
        className="rounded-md border border-gray-200 bg-white p-3"
        // O SVG vem da biblioteca de QR code a partir da própria URL do cardápio.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="flex flex-col items-center gap-3">
        <QrDownload url={url} svg={svg} />
      </figcaption>
    </figure>
  );
}
