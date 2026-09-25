'use client';

import { Info, ShoppingBag, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { BottomBar } from '@/components/store/bottom-bar';
import { CartLineRow } from '@/components/store/cart/cart-line';
import { ClosedNotice, ReviewNotice } from '@/components/store/cart/cart-notices';
import { DeliveryQuoteField } from '@/components/store/cart/delivery-quote-field';
import { OrderModeControl } from '@/components/store/cart/order-mode-control';
import type { Checkout } from '@/components/store/cart/use-checkout';
import { useStore } from '@/components/store/store-provider';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { describeNextOpening } from '@/lib/hours';

/**
 * Passo `cart` da sacola, como nos apps de delivery: "Sua sacola" com a
 * lixeira, quantos itens e de qual loja, os avisos, as linhas (com miniatura e
 * a pílula "− n +"), "Adicionar mais itens", Entrega | Retirada, o resumo e a
 * barra de baixo com o total e "Continuar ›".
 */
export function BagStep({ checkout, onClear }: { checkout: Checkout; onClear: () => void }) {
  const {
    business,
    cart,
    customer,
    review,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    deliveryFeeKnown,
    closeCart,
    dismissReview,
    goToStep,
  } = useStore();
  const { opening, belowMinimum, byDistance, toBeAgreed, set } = checkout;
  // Quem vai retirar não tem taxa para ver — nem CEP para digitar.
  const withDelivery = business.delivery.enabled && customer.mode === 'delivery';
  const bothModes = business.delivery.enabled && business.pickup.enabled;
  const emptyAction = useRef<HTMLButtonElement>(null);
  const empty = cart.length === 0;

  // Esvaziou (pela lixeira ou tirando a última linha): o foco vai para a saída.
  useEffect(() => {
    if (empty) emptyAction.current?.focus({ preventScroll: true });
  }, [empty]);

  if (empty) {
    return (
      <div className="flex flex-1 flex-col justify-center pb-safe-4">
        <EmptyState
          variant="hero"
          icon={<ShoppingBag className="size-10" />}
          title="Sua sacola está vazia"
          description="Escolha os itens do cardápio para começar seu pedido."
          action={
            <Button
              ref={emptyAction}
              variant="secondary"
              size="cta"
              pill
              after={<NavIcon />}
              onClick={closeCart}
              className="cursor-pointer"
            >
              Ver cardápio
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
        <div className="flex items-center justify-between gap-3 px-4 pt-2">
          <h3 className="font-display text-h5 font-bold text-gray-900">Sua sacola</h3>
          <IconButton
            label="Limpar sacola"
            icon={<Trash2 className="size-5" />}
            variant="tonal"
            onClick={onClear}
            className="cursor-pointer"
          />
        </div>
        <p className="mt-1 px-4 text-body1 text-gray-600">
          {itemCount} {itemCount === 1 ? 'item' : 'itens'} de{' '}
          <button
            type="button"
            onClick={closeCart}
            className="cursor-pointer font-semibold text-gray-900 underline underline-offset-2"
          >
            {business.name}
          </button>
        </p>

        {(!opening.open || review) && (
          <div className="mt-4 space-y-3 px-4">
            {!opening.open && <ClosedNotice next={describeNextOpening(opening)} />}
            {review && <ReviewNotice review={review} onDismiss={dismissReview} />}
          </div>
        )}

        <ul className="mt-6 space-y-6 px-4">
          {cart.map((line) => (
            <CartLineRow key={line.uid} line={line} />
          ))}
        </ul>

        <div className="mt-6 flex justify-end px-4">
          <Button variant="tertiary" size="sm" pill onClick={closeCart} className="cursor-pointer">
            Adicionar mais itens
          </Button>
        </div>

        <div className="mt-8 space-y-6 px-4">
          {/* A escolha fica ao lado do que ela muda: taxa, total, CEP e pedido
              mínimo. Quem esbarra no mínimo troca para retirada aqui mesmo, sem
              o aviso precisar mandar. Com um modo só, não há o que escolher. */}
          {bothModes && <OrderModeControl value={customer.mode} onChange={(mode) => set({ mode })} />}

          <dl className="space-y-2 text-body1 text-gray-700">
            {withDelivery && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Taxa de entrega</dt>
                  {/* Sem o bairro (ou sem o CEP), mostrar um número seria mentira. */}
                  <dd
                    className={cn(
                      'tabular-nums',
                      !deliveryFeeKnown && 'text-gray-600',
                      deliveryFeeKnown && deliveryFee === 0 && 'font-semibold text-positive',
                    )}
                  >
                    {!deliveryFeeKnown
                      ? toBeAgreed
                        ? 'a combinar'
                        : 'a calcular'
                      : deliveryFee === 0
                        ? 'Grátis'
                        : formatPrice(deliveryFee)}
                  </dd>
                </div>
              </>
            )}
            <div className="flex items-baseline justify-between gap-4 text-h6 font-bold text-gray-900">
              <dt>Total</dt>
              <dd className="tabular-nums">
                {withDelivery && !deliveryFeeKnown ? (
                  <>
                    {formatPrice(subtotal)}
                    <span className="text-body2 font-medium text-gray-600"> + entrega</span>
                  </>
                ) : (
                  formatPrice(total)
                )}
              </dd>
            </div>
          </dl>

          {/* O CEP aqui poupa o cliente de montar o pedido inteiro para só no fim
              descobrir quanto custa a entrega. */}
          {withDelivery && byDistance && <DeliveryQuoteField />}

          {belowMinimum && (
            <Banner tone="warning" radius="md" icon={<Info className="size-5" />}>
              Pedido mínimo para entrega: {formatPrice(business.delivery.minOrder)}.
            </Banner>
          )}
        </div>
      </div>

      <BottomBar
        position="static"
        className="shrink-0"
        total={withDelivery && deliveryFeeKnown ? total : subtotal}
        totalSuffix={withDelivery && !deliveryFeeKnown ? '+ entrega' : undefined}
        label="Continuar"
        after={<NavIcon className="size-5" />}
        onClick={() => goToStep('checkout')}
      />
    </>
  );
}
