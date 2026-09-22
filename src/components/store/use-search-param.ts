'use client';

import { useSyncExternalStore } from 'react';

function subscribe(listener: () => void) {
  window.addEventListener('popstate', listener);
  return () => window.removeEventListener('popstate', listener);
}

const onServer = () => '';

/**
 * Um parâmetro da URL (`?editar=abc` → 'abc'), sem o `useSearchParams` do Next.
 *
 * As páginas da loja são estáticas (ISR), e nelas o hook do Next exige um
 * Suspense e joga a árvore inteira para renderizar só no navegador — os
 * complementos sumiriam do HTML servido. Aqui o servidor vê '' e o navegador,
 * depois de hidratar, o valor real; como o snapshot é relido a cada render, uma
 * navegação do Next (que re-renderiza) também atualiza o valor.
 */
export function useSearchParam(name: string): string {
  return useSyncExternalStore(
    subscribe,
    () => new URLSearchParams(window.location.search).get(name) ?? '',
    onServer,
  );
}
