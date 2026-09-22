'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * A página do item, como no iFood, é só o item: a foto ocupa o topo e a barra
 * de adicionar o rodapé. O que a casca do cardápio põe em volta (cabeçalho da
 * loja, informações no fim) fica de fora nessa rota.
 */
export function HideOnItem({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname.includes('/item/')) return null;
  return <>{children}</>;
}
