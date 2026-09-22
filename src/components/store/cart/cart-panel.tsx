'use client';

import { ChevronLeft, X } from 'lucide-react';
import { useState } from 'react';
import { BagStep } from '@/components/store/cart/bag-step';
import { CheckoutStep } from '@/components/store/cart/checkout-step';
import { DoneStep } from '@/components/store/cart/done-step';
import { useCheckout } from '@/components/store/cart/use-checkout';
import { useStore } from '@/components/store/store-provider';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';

const TITLES = { cart: 'Sacola', checkout: 'Finalizar pedido', done: 'Pedido enviado' } as const;

/**
 * O conteúdo da sacola: app bar do passo, o passo em si e o rodapé de cada um.
 * Só é montado com a sacola aberta — é o que permite ao `useCheckout` ler o
 * relógio sem divergir do HTML servido.
 */
export function CartPanel({ titleId }: { titleId: string }) {
  const { step, cart, closeCart, clearCart } = useStore();
  const checkout = useCheckout();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-gray-200 bg-white pt-safe lg:pt-0">
        <div className="flex h-14 items-center gap-1 px-2">
          {step === 'checkout' ? (
            <IconButton
              label="Voltar para a sacola"
              icon={<ChevronLeft className="size-6" />}
              onClick={() => checkout.goToStep('cart')}
            />
          ) : (
            <IconButton label="Fechar sacola" icon={<X className="size-6" />} onClick={closeCart} />
          )}
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-center text-body1 font-semibold text-gray-700">
            {TITLES[step]}
          </h2>
          {step === 'cart' && cart.length > 0 ? (
            <Button variant="text" size="sm" className="-mr-1" onClick={() => setConfirmClear(true)}>
              Limpar
            </Button>
          ) : (
            // Mantém o título no centro quando não há ação à direita.
            <span aria-hidden="true" className="size-10 shrink-0" />
          )}
        </div>
      </header>

      {step === 'cart' && <BagStep checkout={checkout} />}
      {step === 'checkout' && <CheckoutStep checkout={checkout} />}
      {step === 'done' && <DoneStep />}

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Limpar sacola?"
        description="Todos os itens saem da sacola."
        confirmLabel="Limpar"
        onConfirm={clearCart}
        lockScroll={false}
      />
    </div>
  );
}
