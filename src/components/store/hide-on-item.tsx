'use client';

import type { ReactNode } from 'react';
import { useStoreRoute } from '@/components/store/use-store-route';

/**
 * A página do item, como no iFood, é só o item: a foto ocupa o topo e a barra
 * de adicionar o rodapé. O que a casca do cardápio põe em volta (cabeçalho da
 * loja, informações no fim) fica de fora nessa rota.
 */
export function HideOnItem({ children }: { children: ReactNode }) {
  if (useStoreRoute().view === 'item') return null;
  return <>{children}</>;
}
