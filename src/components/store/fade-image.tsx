'use client';

import Image from 'next/image';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/cn';

/**
 * Foto que entra com fade de 200ms quando termina de carregar, sobre o fundo
 * do contêiner. Com `priority` (capa, foto do prato, primeiros itens) nasce
 * visível: o LCP não pode esperar a hidratação.
 *
 * Imagem que já estava no cache chega antes da hidratação e o `onLoad` não
 * dispara de novo — o callback ref confere `complete` na montagem.
 */
export function FadeImage({
  src,
  alt,
  sizes,
  priority = false,
  optimized,
  fade = true,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** next/image (foto enviada ou do projeto) ou <img> comum (URL externa). */
  optimized: boolean;
  /** Sem fade, a foto aparece como sempre apareceu (painel). */
  fade?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const check = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete && node.naturalWidth > 0) setLoaded(true);
  }, []);
  const fades = fade && !priority;
  const className = cn(
    'object-cover',
    fades && 'transition-opacity duration-200 ease-standard',
    fades && (loaded ? 'opacity-100' : 'opacity-0'),
  );

  if (optimized) {
    return (
      <Image
        ref={check}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        onLoad={() => setLoaded(true)}
        className={className}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={check}
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => setLoaded(true)}
      className={cn('size-full', className)}
    />
  );
}
