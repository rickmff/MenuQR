'use client';

import Link from 'next/link';
import { useStore } from '@/components/store/store-provider';
import { formatPrice } from '@/lib/format';

/** Cabeçalho do cardápio com a marca do restaurante e o acesso ao carrinho. */
export function StoreHeader() {
  const { business, itemCount, subtotal, openCart } = useStore();
  const isImage = /^(https?:\/\/|\/)/.test(business.logo);

  return (
    <header className="sticky top-0 z-50 border-b border-cream-200 bg-cream-50/90 backdrop-blur-md">
      <div className="container-page flex h-(--header-height) items-center gap-4">
        <Link href={`/r/${business.slug}`} className="flex items-center gap-3 rounded-lg">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-(--tenant-brand) text-xl text-(--tenant-brand-text)"
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo} alt="" className="size-full object-cover" />
            ) : (
              business.logo
            )}
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-display text-lg font-semibold">{business.name}</span>
            {business.tagline && (
              <span className="hidden truncate text-xs text-charcoal-500 sm:block">{business.tagline}</span>
            )}
          </span>
        </Link>

        <button
          type="button"
          onClick={() => openCart('cart')}
          className="relative ml-auto flex items-center gap-2 rounded-xl bg-charcoal-900 px-4 py-2.5 text-sm font-semibold text-cream-50 transition-colors hover:bg-charcoal-700"
        >
          <span aria-hidden="true">🛒</span>
          <span className="hidden sm:inline">{itemCount > 0 ? formatPrice(subtotal) : 'Carrinho'}</span>
          <span className="sr-only">
            Abrir carrinho{itemCount > 0 ? ` com ${itemCount} itens` : ' vazio'}
          </span>
          {itemCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-(--tenant-brand) text-[11px] font-bold text-(--tenant-brand-text)">
              {itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
