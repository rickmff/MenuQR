'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { StickyBottomBar } from '@/components/ui/sticky-bottom-bar';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';

/**
 * A barra de baixo dos apps de delivery: o total à esquerda, grande, e a
 * pílula da ação à direita ("Ver sacola ›", "Continuar ›"). Um desenho só para
 * o cardápio e para a Sacola.
 */
export function BottomBar({
  total,
  totalSuffix,
  label,
  after,
  onClick,
  position = 'fixed',
  className,
  buttonProps,
}: {
  total: number;
  /** Complemento pequeno do total ("+ entrega"). */
  totalSuffix?: ReactNode;
  label: string;
  after?: ReactNode;
  onClick?: () => void;
  position?: 'fixed' | 'sticky' | 'static';
  className?: string;
  buttonProps?: { 'data-cart-cta'?: boolean; 'aria-label'?: string };
}) {
  return (
    <StickyBottomBar position={position} className={className} innerClassName="flex max-w-page items-center justify-between gap-4">
      <p className="min-w-0 truncate">
        <span className="text-h6 font-bold tabular-nums text-gray-900">{formatPrice(total)}</span>
        {totalSuffix && <span className="text-body2 font-medium text-gray-600"> {totalSuffix}</span>}
      </p>
      <Button
        size="cta"
        pill
        after={after}
        onClick={onClick}
        className={cn('min-w-32 cursor-pointer')}
        {...buttonProps}
      >
        {label}
      </Button>
    </StickyBottomBar>
  );
}
