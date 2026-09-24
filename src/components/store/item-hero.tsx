'use client';

import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useScrollRoot } from '@/components/store/scroll-root';
import { useBackToMenu } from '@/components/store/use-back-to-menu';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/cn';

/**
 * Topo da página do prato, como nos apps de delivery: a foto de borda a borda
 * e, por cima dela, só um "‹" branco flutuante — sem app bar. Quando a foto sai
 * da tela entra uma barra branca com o nome do prato atrás do botão (só no
 * celular; no desktop o prato é um painel e o nome já está à vista).
 *
 * O "‹" volta como num app (`useBackToMenu`): à loja na mesma posição se ela
 * está logo atrás, ou para o cardápio se a pessoa chegou direto pelo link.
 */
export function ItemHero({
  title,
  hasImage,
  children,
}: {
  title: string;
  hasImage: boolean;
  /** A foto (DishImage), renderizada no servidor. */
  children: ReactNode;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(!hasImage);
  const { back } = useBackToMenu();
  const scrollRoot = useScrollRoot();

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!hasImage || !sentinel) return;
    // 56px da barra + o notch, medidos: o rootMargin não aceita env().
    const top = 56 + Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top') || '0');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // A régua é o topo da área observada (na prévia, a moldura).
        const edge = entry.rootBounds?.top ?? top;
        setCompact(!entry.isIntersecting && entry.boundingClientRect.top < edge + 1);
      },
      { root: scrollRoot?.current ?? null, rootMargin: `-${Math.round(top)}px 0px 0px 0px` },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasImage, scrollRoot]);

  return (
    <>
      <div
        aria-hidden={!compact}
        inert={!compact}
        className={cn(
          'fixed inset-x-0 top-0 z-40 border-b border-gray-200 bg-white pt-safe transition-[opacity,transform] duration-150 ease-standard lg:hidden',
          compact ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
        )}
      >
        {/* A área segura fica no invólucro: com `h-14` e padding no mesmo elemento, o notch
            comeria a altura da barra. */}
        <p className="flex h-14 items-center truncate px-16 text-center text-body1 font-semibold text-gray-900">
          <span className="min-w-0 flex-1 truncate">{title}</span>
        </p>
      </div>

      <IconButton
        label="Voltar ao cardápio"
        icon={<ChevronLeft className="size-6" />}
        variant={compact ? 'plain' : 'raised'}
        size="lg"
        onClick={back}
        // No centro da faixa de 56px do topo: sobre a foto e sobre a barra com o nome, o mesmo lugar.
        className="fixed left-2 top-[calc(var(--safe-top)+0.375rem)] z-50 cursor-pointer focus-ring-photo lg:absolute lg:left-4 lg:top-4"
      />

      {hasImage ? <div className="relative">{children}</div> : <div className="h-16 lg:h-4" />}

      {/* Marca onde a foto termina: é o que decide a barra com o nome. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
    </>
  );
}
