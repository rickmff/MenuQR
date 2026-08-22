'use client';

import Link from 'next/link';
import { ShareButton } from '@/components/share-button';
import { useStore } from '@/components/store/store-provider';
import { useShareUrl } from '@/components/store/use-share-url';
import { formatPrice } from '@/lib/format';

/** Cabeçalho do cardápio com a marca do restaurante e o acesso ao carrinho. */
export function StoreHeader() {
  const { business, menu, itemCount, subtotal, openCart } = useStore();
  // Sem banco, o link tem de levar o cardápio junto: quem recebeu e repassa
  // manda um link que abre, e não um endereço vazio.
  const share = useShareUrl(business, menu);
  const isImage = /^(https?:\/\/|\/)/.test(business.logo);

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-ink-50/85 backdrop-blur-xl">
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
              <span className="hidden truncate text-xs text-ink-500 sm:block">{business.tagline}</span>
            )}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <ShareButton
            url={share.url}
            title={business.name}
            text={`Confira o cardápio do ${business.name} e peça pelo WhatsApp`}
          />

          <button type="button" onClick={() => openCart('cart')} className="btn btn-sm btn-dark relative">
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
      </div>
    </header>
  );
}
