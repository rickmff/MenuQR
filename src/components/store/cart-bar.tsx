'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { BottomBar } from '@/components/store/bottom-bar';
import { useMountAnimation, useStore } from '@/components/store/store-provider';
import { useStoreRoute } from '@/components/store/use-store-route';
import { NavIcon } from '@/components/ui/button-icons';
import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/reduced-motion';

const EXIT_MS = 200;

/**
 * Barra fixa do cardápio: o subtotal e "Ver sacola ›". Sobe quando o primeiro
 * item entra e desce quando a sacola esvazia; com a sacola aberta ela fica
 * invisível (mas montada, para o foco voltar a ela quando a sacola fechar).
 * Na página do prato quem manda é o botão "Adicionar".
 *
 * Deixa, no fim da página, um espaço da altura dela: sem isso a barra cobria
 * o fim do rodapé.
 */
export function CartBar() {
  const { itemCount, subtotal, isOpen, openCart } = useStore();
  const { view } = useStoreRoute();
  const wanted = itemCount > 0 && view !== 'item';

  // Desmontagem adiada, como no BottomSheet: a barra desce antes de sumir.
  const [rendered, setRendered] = useState(wanted);
  const [previous, setPrevious] = useState(wanted);
  if (wanted !== previous) {
    setPrevious(wanted);
    if (wanted) setRendered(true);
  }
  const leaving = rendered && !wanted;
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(() => setRendered(false), prefersReducedMotion() ? 0 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  if (!rendered) return null;
  return (
    <>
      <div aria-hidden="true" className="h-[calc(var(--bottom-bar-height)+var(--safe-bottom))]" />
      <Bar subtotal={subtotal} leaving={leaving} hidden={isOpen} onOpen={() => openCart('cart')} />
    </>
  );
}

function Bar({
  subtotal,
  leaving,
  hidden,
  onOpen,
}: {
  subtotal: number;
  leaving: boolean;
  hidden: boolean;
  onOpen: () => void;
}) {
  // Quem recarrega com a sacola cheia não vê a barra "chegar": ela já estava lá.
  const t = useTranslations('store.cartBar');
  const animate = useMountAnimation();
  return (
    <div
      // Com a sacola aberta a barra fica atrás do dialog: invisível e fora do
      // Tab, mas montada — o foco volta para ela quando a sacola fechar.
      inert={hidden || leaving}
      className={cn(
        hidden && 'invisible',
        leaving ? 'animate-sheet-out' : animate && 'animate-slide-up',
        'fixed inset-x-0 bottom-0 z-40',
      )}
    >
      <BottomBar
        total={subtotal}
        label={t('viewBag')}
        after={<NavIcon className="size-5" />}
        onClick={onOpen}
        position="static"
        buttonProps={{ 'data-cart-cta': true }}
      />
    </div>
  );
}
