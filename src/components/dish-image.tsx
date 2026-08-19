import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * Imagem do prato. Aceita um caminho em /public (renderizado com next/image,
 * já otimizado) ou um emoji, usado como ilustração enquanto não há foto.
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
  const isFile = /^(\/|https?:\/\/)/.test(image);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-linear-to-br from-cream-100 to-ember-100',
        className,
      )}
    >
      {isFile ? (
        <Image src={image} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />
      ) : (
        <span aria-hidden="true" className={cn('select-none', emojiClassName ?? 'text-4xl')}>
          {image}
        </span>
      )}
    </div>
  );
}
