import { FadeImage } from '@/components/store/fade-image';
import { cn } from '@/lib/cn';
import { isUploadedImage } from '@/lib/format';

/**
 * Capa da loja, de borda a borda, com os botões flutuantes por cima. É a foto
 * que o lojista enviou na aba Identidade (`business_covers`) ou, sem ela, o
 * papel de parede da conversa do WhatsApp (D18) — o mesmo bege com o rabisco
 * próprio da landing, parado. Nada de texto sobre a capa: o nome fica na folha
 * branca logo abaixo, legível com qualquer foto.
 *
 * `priority`: a capa é o maior elemento da primeira dobra (o LCP) e nasce
 * visível, sem esperar a hidratação.
 */
export function StoreCover({ cover, alt, className }: { cover?: string; alt: string; className?: string }) {
  const photo = cover?.trim() ?? '';
  return (
    <div
      className={cn(
        'relative h-60 w-full overflow-hidden [overflow-anchor:none] lg:h-80',
        photo ? 'bg-gray-100' : 'cover-fallback',
        className,
      )}
    >
      {photo && (
        <FadeImage
          src={photo}
          alt={alt}
          sizes="100vw"
          priority
          optimized={isUploadedImage(photo) || photo.startsWith('/')}
        />
      )}
    </div>
  );
}
