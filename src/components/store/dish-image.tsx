import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * Imagem do prato. Aceita três formatos:
 * - arquivo do próprio projeto (`/pratos/x.jpg`) → otimizado pelo next/image;
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
  const isLocalFile = image.startsWith('/');
  const isRemote = /^https?:\/\//.test(image);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-linear-to-br from-cream-100 to-cream-200',
        className,
      )}
    >
      {isLocalFile ? (
        <Image src={image} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : isRemote ? (
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
        <span aria-hidden="true" className={cn('select-none', emojiClassName ?? 'text-4xl')}>
          {image || '🍽️'}
        </span>
      )}
    </div>
  );
}
