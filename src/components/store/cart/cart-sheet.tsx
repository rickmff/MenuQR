'use client';

import { useId } from 'react';
import { CartPanel } from '@/components/store/cart/cart-panel';
import { popLayers } from '@/components/store/nav-layers';
import { useStore } from '@/components/store/store-provider';
import { BottomSheet } from '@/components/ui/bottom-sheet';

/**
 * A sacola: no celular, uma página que entra pela direita e ocupa a tela; no
 * desktop, um drawer de 440px encostado à direita. Os passos `cart` →
 * `checkout` → `done` trocam dentro dela, sem rota nova — cada um é uma camada
 * no histórico (`nav-layers.ts`).
 *
 * Esc, o scrim e o fechamento nativo do <dialog> (o voltar do Android) voltam
 * UM passo, como o voltar do sistema: de "Finalizar" para "Sacola", da
 * "Sacola" para o cardápio.
 *
 * O `StoreProvider` já trava a rolagem do fundo (`lockScroll={false}`), e o
 * `BottomSheet` cuida de foco preso, scrim e de devolver o foco ao gatilho.
 */
export function CartSheet() {
  const { isOpen } = useStore();
  const titleId = useId();

  return (
    <BottomSheet
      open={isOpen}
      onClose={() => popLayers(1)}
      labelledBy={titleId}
      snap="full"
      enterFrom="right"
      desktop="drawer"
      scroll="child"
      lockScroll={false}
    >
      <CartPanel titleId={titleId} />
    </BottomSheet>
  );
}
