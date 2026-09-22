'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * O checklist de configuração está recolhido?
 *
 * Fica no navegador de propósito: é preferência de quem olha a tela, não dado
 * do restaurante — não vale uma coluna no banco nem uma ida ao servidor a cada
 * clique. O progresso em si vem dos dados gravados (`setup-steps.ts`); aqui só
 * mora o "não quero ver isto agora".
 *
 * Módulo separado do componente para o formulário de negócio poder consultá-lo
 * sem importar o card — quem recolheu o checklist também não quer ser levado
 * de aba em aba ao salvar.
 */
const key = (businessId: string) => `menuqr.setup.${businessId}`;

const listeners = new Set<() => void>();
/** `useSyncExternalStore` exige a mesma referência entre renders. */
const cache = new Map<string, boolean>();

function read(businessId: string): boolean {
  const cached = cache.get(businessId);
  if (cached !== undefined) return cached;
  let value = false;
  try {
    value = window.localStorage.getItem(key(businessId)) === '1';
  } catch {
    // Navegador sem localStorage: o checklist aparece aberto.
  }
  cache.set(businessId, value);
  return value;
}

function write(businessId: string, value: boolean) {
  cache.set(businessId, value);
  try {
    if (value) window.localStorage.setItem(key(businessId), '1');
    else window.localStorage.removeItem(key(businessId));
  } catch {
    // Sem espaço ou em aba anônima: a escolha vale só para esta visita.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSetupCollapsed(businessId: string): [boolean, (value: boolean) => void] {
  // No servidor não há preferência: o HTML sai com o checklist aberto e a
  // hidratação bate.
  const collapsed = useSyncExternalStore(
    subscribe,
    () => read(businessId),
    () => false,
  );

  const set = useCallback((value: boolean) => write(businessId, value), [businessId]);

  return [collapsed, set];
}
