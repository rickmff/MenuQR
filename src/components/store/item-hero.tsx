'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Topo da página do item, como no app do iFood: a foto de borda a borda com o
 * botão de voltar escuro por cima e, quando a foto sai da tela, uma app bar
 * branca com o nome do item no lugar. Sem foto, a app bar fica desde o início.
 *
 * Só no celular: no desktop o item vira um painel e o nome já está à vista.
 */
export function ItemHero({
  title,
  basePath,
  hasImage,
  children,
}: {
  title: string;
  basePath: string;
  hasImage: boolean;
  /** A foto (DishImage), renderizada no servidor. */
  children: ReactNode;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(!hasImage);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!hasImage || !sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry?.isIntersecting), {
      rootMargin: '-56px 0px 0px 0px',
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasImage]);

  return (
    <>
      <div
        aria-hidden={!compact}
        className={cn(
          'fixed inset-x-0 top-0 z-50 flex h-14 items-center gap-1 border-b border-gray-200 bg-white px-2 pt-safe transition-opacity duration-150 ease-standard lg:hidden',
          compact ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <Link
          href={basePath}
          aria-label="Voltar ao cardápio"
          className="press grid size-10 shrink-0 place-items-center rounded-full text-gray-700 active:bg-gray-100"
        >
          <ChevronLeft aria-hidden="true" className="size-6" />
        </Link>
        <p className="min-w-0 flex-1 truncate pr-10 text-body1 font-semibold text-gray-700">{title}</p>
      </div>

      {hasImage ? (
        <div className="relative">
          {children}
          <Link
            href={basePath}
            aria-label="Voltar ao cardápio"
            className="press absolute left-4 top-4 grid size-10 place-items-center rounded-full bg-gray-800/80 text-white"
          >
            <ChevronLeft aria-hidden="true" className="size-6" />
          </Link>
        </div>
      ) : (
        <div className="h-14 lg:hidden" />
      )}

      {/* Marca onde a foto termina: é o que decide se a app bar aparece. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </>
  );
}
