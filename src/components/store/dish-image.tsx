import { FadeImage } from '@/components/store/fade-image';
import { cn } from '@/lib/cn';
import { isUploadedImage } from '@/lib/format';

type EmojiSize = 'sm' | 'md' | 'lg';

const EMOJI: Record<EmojiSize, string> = {
  sm: 'text-h5',
  md: 'text-[2.5rem]',
  lg: 'text-[5rem] sm:text-[7rem]',
};

/** Fundo sob a foto (ou o emoji). `white`: o prato "recortado" sobre branco da página do item. */
const SURFACES = { gray: 'bg-gray-100', white: 'bg-white' } as const;

/**
 * Imagem do prato. Aceita quatro formatos:
 * - foto enviada pelo painel (`/img/<uuid>`, BLOB no banco) → otimizada pelo
 *   next/image. Decisão consciente: o BLOB tem até 1200 px e o card mostra 96
 *   px; sem o otimizador um cardápio de 30 fotos baixaria vários MB no celular.
 *   A rota /img só entrega bytes com cache de um ano, o otimizador transforma
 *   uma vez por variante e guarda pelo mesmo prazo. Se a cota de otimização da
 *   Vercel apertar, a saída é trocar este ramo por um <img loading="lazy">;
 * - arquivo do próprio projeto (`/pratos/x.jpg`) → também otimizado;
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
  surface = 'gray',
  fade = false,
}: {
  image: string;
  alt: string;
  className?: string;
  emojiSize?: EmojiSize;
  sizes?: string;
  priority?: boolean;
  surface?: keyof typeof SURFACES;
  /** A foto entra com fade ao carregar (cardápio). Com `priority`, nasce visível. */
  fade?: boolean;
}) {
  const isOptimized = isUploadedImage(image) || image.startsWith('/');
  const isRemote = /^https?:\/\//.test(image);

  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden', SURFACES[surface], className)}>
      {isOptimized || isRemote ? (
        <FadeImage src={image} alt={alt} sizes={sizes} priority={priority} optimized={isOptimized} fade={fade} />
      ) : (
        <span aria-hidden="true" className={cn('select-none leading-none', EMOJI[emojiSize])}>
          {image}
        </span>
      )}
    </div>
  );
}
