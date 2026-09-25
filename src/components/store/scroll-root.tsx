'use client';

import { createContext, useContext, type RefObject } from 'react';

/**
 * Quem rola a loja: a janela (público, `null`) ou a moldura da prévia do
 * painel, que é um contêiner rolável próprio. Observadores de interseção,
 * restauração de rolagem e "rolar ao topo" leem daqui.
 */
export const ScrollRootContext = createContext<RefObject<HTMLElement | null> | null>(null);

export function useScrollRoot(): RefObject<HTMLElement | null> | null {
  return useContext(ScrollRootContext);
}

export function readScrollTop(root: HTMLElement | null | undefined): number {
  return root ? root.scrollTop : window.scrollY;
}

export function writeScrollTop(root: HTMLElement | null | undefined, top: number): void {
  if (root) root.scrollTo({ top, behavior: 'instant' });
  else window.scrollTo({ top, behavior: 'instant' });
}
