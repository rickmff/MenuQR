import Image from 'next/image';
import { cn } from '@/lib/cn';
import { isUploadedImage } from '@/lib/format';

/**
 * Imagem do prato. Aceita quatro formatos:
 * - arquivo do próprio projeto (`/pratos/x.jpg`) → otimizado pelo next/image;
 * - foto enviada pelo painel (`/img/<uuid>`) → <img> comum: ela já sai do
 *   navegador do lojista reduzida e em WebP, e é servida com cache de um ano.
 *   Passar pelo otimizador seria recomprimir o que já está comprimido, com uma
 *   ida a mais ao banco a cada variação de tamanho;
 * - URL externa cadastrada pelo lojista → <img> comum, porque o otimizador só
 *   aceita domínios declarados em next.config e o lojista pode usar qualquer um;
 * - emoji → ilustração padrão, sem requisição de rede.
 */
export function DishImage({
  image,
  alt,
  className,
  emojiClassName,
  sizes = '(max-width: 768px) 96px, 128px',
  priority = false,
}: {
  image: string;
  alt: string;
  className?: string;
  emojiClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const isUploaded = isUploadedImage(image);
  const isLocalFile = image.startsWith('/') && !isUploaded;
  const isPlainImg = isUploaded || /^https?:\/\//.test(image);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-linear-to-br from-ink-100 to-ink-200',
        className,
      )}
    >
      {isLocalFile ? (
        <Image src={image} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : isPlainImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className={cn('select-none', emojiClassName ?? 'text-h3')}>
          {image || '🍽️'}
        </span>
      )}
    </div>
  );
}
