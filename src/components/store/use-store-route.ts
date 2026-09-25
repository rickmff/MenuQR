'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/components/store/store-provider';

/**
 * Em que tela da loja estamos: o cardápio ou a página de um prato. Um lugar só
 * para a pergunta que três componentes faziam com `pathname.includes('/item/')`.
 * Na landing o pathname é `/` e a resposta é `menu`, como deve ser.
 */
export function useStoreRoute() {
  const { basePath, embedded } = useStore();
  const pathname = usePathname();
  const view: 'menu' | 'item' = pathname.startsWith(`${basePath}/item/`) ? 'item' : 'menu';
  return { view, pathname, basePath, embedded };
}
