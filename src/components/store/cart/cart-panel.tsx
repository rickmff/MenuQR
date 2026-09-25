'use client';

import { ChevronLeft, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { BagStep } from '@/components/store/cart/bag-step';
import { CheckoutStep } from '@/components/store/cart/checkout-step';
import { DoneStep } from '@/components/store/cart/done-step';
import { useCheckout } from '@/components/store/cart/use-checkout';
import { useStore } from '@/components/store/store-provider';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';

/**
 * O conteúdo da sacola: o topo com o "‹" flutuante e o título do passo, o
 * passo em si (com o rodapé dele) e a confirmação de limpar. Os passos trocam
 * com um fade curto, sem deslizar.
 *
 * Só é montado com a sacola aberta — é o que permite ao `useCheckout` ler o
 * relógio sem divergir do HTML servido.
 */
export function CartPanel({ titleId }: { titleId: string }) {
  const t = useTranslations('store.cart');
  const { step, closeCart, clearCart, goToStep } = useStore();
  const checkout = useCheckout();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 bg-white pt-safe">
        <div className="flex h-16 items-center gap-2 px-4">
          {step === 'checkout' ? (
            <IconButton
              label={t('backToBag')}
              icon={<ChevronLeft className="size-6" />}
              variant="raised"
              size="lg"
              onClick={() => goToStep('cart')}
              className="cursor-pointer"
            />
          ) : step === 'done' ? (
            <IconButton
              label={t('close')}
              icon={<X className="size-6" />}
              variant="raised"
              size="lg"
              onClick={closeCart}
              className="cursor-pointer"
            />
          ) : (
            <IconButton
              label={t('close')}
              icon={<ChevronLeft className="size-6" />}
              variant="raised"
              size="lg"
              onClick={closeCart}
              className="cursor-pointer"
            />
          )}
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-center text-body1 font-semibold text-gray-900">
            {t(`steps.${step}`)}
          </h2>
          {/* Mantém o título no centro. */}
          <span aria-hidden="true" className="size-11 shrink-0" />
        </div>
      </header>

      <div key={step} className="flex min-h-0 flex-1 animate-fade-in flex-col">
        {step === 'cart' && <BagStep checkout={checkout} onClear={() => setConfirmClear(true)} />}
        {step === 'checkout' && <CheckoutStep checkout={checkout} />}
        {step === 'done' && <DoneStep />}
      </div>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title={t('clearTitle')}
        description={t('clearDescription')}
        confirmLabel={t('clearConfirm')}
        onConfirm={clearCart}
        lockScroll={false}
        appearance="store"
      />
    </div>
  );
}
