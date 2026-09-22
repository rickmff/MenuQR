import Image from 'next/image';
import { cn } from '@/lib/cn';

type EmojiSize = 'sm' | 'md' | 'lg';

const EMOJI: Record<EmojiSize, string> = {
  sm: 'text-h5',
  md: 'text-h3',
  lg: 'text-[5rem] sm:text-[7rem]',
};

/**
 * Imagem do prato. Aceita três formatos:
 * - arquivo do próprio projeto (`/pratos/x.jpg`) → otimizado pelo next/image;
 * - URL externa cadastrada pelo lojista → <img> comum, porque o otimizador só
 *   aceita domínios declarados em next.config e o lojista pode usar qualquer um;
 * - emoji → ilustração sobre o cinza claro, sem requisição de rede.
 *
 * Sem imagem nenhuma, quem chama decide não renderizar (linha só de texto).
 */
export function DishImage({
  image,
  alt,
  className,
  emojiSize = 'md',
  sizes = '(max-width: 768px) 96px, 128px',
  priority = false,
}: {
  image: string;
  alt: string;
  className?: string;
  emojiSize?: EmojiSize;
  sizes?: string;
  priority?: boolean;
}) {
  const isLocalFile = image.startsWith('/');
  const isRemote = /^https?:\/\//.test(image);

  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden bg-gray-100', className)}>
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
        <span aria-hidden="true" className={cn('select-none leading-none', EMOJI[emojiSize])}>
          {image}
        </span>
      )}
    </div>
  );
}
