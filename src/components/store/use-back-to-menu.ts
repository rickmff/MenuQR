'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';
import { adoptNavMarker, currentNavOrigin, type NavOrigin } from '@/components/store/nav-marker';
import { useStore } from '@/components/store/store-provider';
import { NAV_BACK } from '@/components/store/store-screen';

/**
 * O "voltar" da página do prato, como num app:
 * - veio do cardápio ou da Sacola nesta visita → `router.back()`: a loja
 *   reaparece na mesma posição (e com a Sacola aberta, se foi de lá), sem
 *   empilhar entrada nova;
 * - chegou direto pelo QR/link → `router.replace(basePath)`: o cardápio toma o
 *   lugar do prato e o próximo voltar sai do site, como um app aberto por link.
 */
export function useBackToMenu(): { back: () => void; origin: () => NavOrigin | null } {
  const router = useRouter();
  const { basePath, business, embedded } = useStore();

  useEffect(() => {
    adoptNavMarker(business.slug);
  }, [business.slug]);

  const origin = useCallback(() => currentNavOrigin(), []);

  const back = useCallback(() => {
    if (currentNavOrigin() !== null && window.history.length > 1) router.back();
    // O cardápio entra pela esquerda, o prato sai pela direita. Na prévia não:
    // a transição é da página inteira e vazaria da moldura (o ItemCard também
    // não manda o nav-forward lá).
    else router.replace(basePath, embedded ? undefined : { transitionTypes: [NAV_BACK] });
  }, [router, basePath, embedded]);

  return { back, origin };
}
