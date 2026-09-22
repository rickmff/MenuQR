'use client';

import { useId } from 'react';
import { CartPanel } from '@/components/store/cart/cart-panel';
import { useStore } from '@/components/store/store-provider';
import { BottomSheet } from '@/components/ui/bottom-sheet';

/**
 * A sacola do iFood: no celular, uma página que entra pela direita e ocupa a
 * tela; no desktop, um dialog centrado. Os passos `cart` → `checkout` → `done`
 * trocam dentro dela, sem rota nova.
 *
 * O `StoreProvider` já trava a rolagem do fundo (`lockScroll={false}`), e o
 * `BottomSheet` cuida de foco preso, Esc, scrim e de devolver o foco ao ícone
 * da sacola ao fechar.
 */
export function CartSheet() {
  const { isOpen, closeCart } = useStore();
  const titleId = useId();

  return (
    <BottomSheet
      open={isOpen}
      onClose={closeCart}
      labelledBy={titleId}
      snap="full"
      enterFrom="right"
      lockScroll={false}
    >
      <CartPanel titleId={titleId} />
    </BottomSheet>
  );
}
