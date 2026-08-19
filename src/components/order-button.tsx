'use client';

import { useCart } from '@/components/cart-provider';
import { cn } from '@/lib/cn';

/** Abre o carrinho a partir de qualquer chamada para ação do site. */
export function OrderButton({
  children,
  className,
  step = 'cart',
}: {
  children: React.ReactNode;
  className?: string;
  step?: 'cart' | 'checkout';
}) {
  const { openCart } = useCart();
  return (
    <button type="button" onClick={() => openCart(step)} className={cn(className)}>
      {children}
    </button>
  );
}
