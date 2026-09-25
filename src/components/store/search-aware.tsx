'use client';

import type { ReactNode } from 'react';
import { useStore } from '@/components/store/store-provider';

/**
 * Some com a busca aberta: capa e cabeçalho da loja saem da frente e a tela
 * vira a lista de resultados, como nos apps de delivery. Continua no HTML
 * (só `hidden`): buscadores e a volta da busca não refazem nada.
 */
export function SearchAware({ children }: { children: ReactNode }) {
  const { searchOpen } = useStore();
  return <div className={searchOpen ? 'hidden' : undefined}>{children}</div>;
}
