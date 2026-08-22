'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/components/store/store-provider';
import { formatPrice } from '@/lib/format';

/**
 * Barra fixa da sacola, como nos aplicativos de delivery: só aparece quando há
 * itens e some enquanto a gaveta do carrinho está aberta.
 */
export function CartBar() {
  const { itemCount, subtotal, isOpen, openCart } = useStore();
  const pathname = usePathname();

  // Na página do prato quem manda é o botão "Adicionar".
  if (itemCount === 0 || isOpen || pathname.includes('/item/')) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={() => openCart('cart')}
        className="pointer-events-auto mx-auto flex w-full max-w-lg items-center gap-3 rounded-2xl bg-(--tenant-brand) px-5 py-4 text-(--tenant-brand-text) shadow-lift transition-transform active:scale-[0.99]"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-white/25 text-xs font-bold">
          {itemCount}
        </span>
        <span className="font-semibold">Ver sacola</span>
        <span className="ml-auto font-display text-lg font-semibold">{formatPrice(subtotal)}</span>
      </button>
    </div>
  );
}
