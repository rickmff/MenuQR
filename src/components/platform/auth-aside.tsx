import { QrCode as QrIcon } from 'lucide-react';
import { AuthTilt } from '@/components/platform/auth-tilt';
import { sampleBusiness } from '@/lib/demo/sample-data';

/**
 * O que o MenuQR entrega ao lojista é isto: uma etiqueta com QR code para pôr
 * na mesa. A tela de conta mostra o artefato de verdade — o código abaixo abre
 * o cardápio de exemplo se for escaneado, não é desenho.
 *
 * Só aparece a partir de `lg`: no celular a tela é o formulário e mais nada.
 */
export function AuthAside({ qrSvg, storeUrl }: { qrSvg: string; storeUrl: string }) {
  return (
    <aside
      aria-label="Exemplo de etiqueta de mesa"
      className="dot-grid relative hidden place-items-center overflow-hidden border-l border-gray-200 bg-gray-50 p-10 lg:grid"
    >
      <AuthTilt>
        {/* A etiqueta impressa: papel branco, um pouco torto sobre a mesa. */}
        <figure className="w-[19rem] rounded-lg border border-gray-200 bg-white p-6 text-center shadow-highest">
          <figcaption className="text-caption font-semibold uppercase tracking-widest text-gray-600">
            Cardápio digital
          </figcaption>
          <p className="mt-1 text-subtitle font-bold text-gray-700">{sampleBusiness.name}</p>

          <div
            aria-hidden="true"
            className="mx-auto mt-5 w-[11rem] [&_svg]:size-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          <p className="mt-5 flex items-center justify-center gap-2 text-body2 font-semibold text-gray-700">
            <QrIcon aria-hidden="true" className="size-4 text-primary" />
            Aponte a câmera
          </p>
          <p className="mt-1 font-mono text-[11px] text-gray-400">
            {storeUrl.replace(/^https?:\/\//, '')}
          </p>
        </figure>
      </AuthTilt>

      <p className="absolute bottom-8 font-mono text-[11px] uppercase tracking-widest text-gray-400">
        QR real · abre um cardápio publicado
      </p>
    </aside>
  );
}
