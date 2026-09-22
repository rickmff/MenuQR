'use client';

import { ShoppingBag } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useStore } from '@/components/store/store-provider';
import { formatPrice } from '@/lib/format';

/**
 * Barra fixa da sacola, como no iFood: só aparece quando há itens e some
 * enquanto a sacola está aberta.
 */
export function CartBar() {
  const { itemCount, subtotal, isOpen, openCart } = useStore();
  const pathname = usePathname();

  // Na página do prato quem manda é o botão "Adicionar".
  if (itemCount === 0 || isOpen || pathname.includes('/item/')) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white px-4 pt-3 pb-safe-4 shadow-high">
      <button
        type="button"
        onClick={() => openCart('cart')}
        className="press mx-auto flex h-12 w-full max-w-lg animate-slide-up items-center justify-between rounded-sm bg-primary px-4 text-white active:bg-primary-pressed"
      >
        <span className="flex items-center gap-2 text-body2 font-semibold">
          <span className="relative">
            <ShoppingBag aria-hidden="true" className="size-5" />
            <span
              key={itemCount}
              className="absolute -right-2.5 -top-2 grid h-4 min-w-4 animate-badge-pop place-items-center rounded-full bg-white px-1 text-[10px] font-bold leading-none text-primary"
            >
              {itemCount}
            </span>
          </span>
          <span className="ml-1">Ver sacola</span>
        </span>
        <span className="text-body2 font-bold tabular-nums">{formatPrice(subtotal)}</span>
      </button>
    </div>
  );
}
