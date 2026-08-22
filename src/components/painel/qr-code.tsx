import QRCode from 'qrcode';

/**
 * QR code gerado no servidor, sem depender de serviço externo.
 * O SVG é embutido na página e também oferecido para download/impressão.
 */
export async function QrCode({ url, size = 180 }: { url: string; size?: number }) {
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
        className="rounded-xl border border-cream-200 bg-white p-3"
        // O SVG vem da biblioteca de QR code a partir da própria URL do cardápio.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <figcaption className="text-center text-xs text-charcoal-500">
        <a href={dataUrl} download="cardapio-qrcode.svg" className="font-semibold underline">
          Baixar QR code
        </a>
        <br />
        para imprimir nas mesas e embalagens
      </figcaption>
    </figure>
  );
}
