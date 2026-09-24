'use client';

import { Info, ShoppingBag } from 'lucide-react';
import { CartLineRow } from '@/components/store/cart/cart-line';
import { ClosedNotice, ReviewNotice } from '@/components/store/cart/cart-notices';
import { DeliveryQuoteField } from '@/components/store/cart/delivery-quote-field';
import { OrderModeControl } from '@/components/store/cart/order-mode-control';
import type { Checkout } from '@/components/store/cart/use-checkout';
import { useStore } from '@/components/store/store-provider';
import { Avatar } from '@/components/ui/avatar';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { describeNextOpening } from '@/lib/hours';

/**
 * Passo `cart` da sacola: avisos, a loja com "Adicionar mais itens", as linhas
 * (com Editar e stepper), Entrega | Retirada, o resumo e o "Continuar" com o
 * total.
 */
export function BagStep({ checkout }: { checkout: Checkout }) {
  const { business, cart, customer, review, subtotal, deliveryFee, total, deliveryFeeKnown, closeCart, dismissReview } =
    useStore();
  const { opening, belowMinimum, byDistance, toBeAgreed, goToStep, set } = checkout;
  // Quem vai retirar não tem taxa para ver — nem CEP para digitar.
  const withDelivery = business.delivery.enabled && customer.mode === 'delivery';
  const bothModes = business.delivery.enabled && business.pickup.enabled;

  if (cart.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center">
        <EmptyState
          icon={<ShoppingBag className="size-12" />}
          title="Sua sacola está vazia"
          description="Escolha os itens do cardápio para começar seu pedido."
          action={
            <Button variant="secondary" onClick={closeCart}>
              Ver cardápio
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {(!opening.open || review) && (
          <div className="space-y-3 px-4 pt-4">
            {!opening.open && <ClosedNotice next={describeNextOpening(opening)} />}
            {review && <ReviewNotice review={review} onDismiss={dismissReview} />}
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-4">
          <Avatar logo={business.logo} name={business.name} size={40} />
          <p className="min-w-0 flex-1 truncate text-body2 font-semibold text-gray-700">{business.name}</p>
        </div>

        <div aria-hidden="true" className="h-2 bg-gray-50" />

        <ul className="divide-y divide-gray-200">
          {cart.map((line) => (
            <CartLineRow key={line.uid} line={line} />
          ))}
        </ul>

        <div aria-hidden="true" className="h-2 bg-gray-50" />

        <div className="space-y-4 px-4 py-4">
          {/* A escolha fica ao lado do que ela muda: taxa, total, CEP e pedido
              mínimo. Quem esbarra no mínimo troca para retirada aqui mesmo, sem
              o aviso precisar mandar. Com um modo só, não há o que escolher. */}
          {bothModes && <OrderModeControl value={customer.mode} onChange={(mode) => set({ mode })} />}

          <dl className="space-y-2 text-body2 text-gray-700">
            {withDelivery && (
              <>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-600">Taxa de entrega</dt>
                  {/* Sem o bairro (ou sem o CEP), mostrar um número seria mentira. */}
                  <dd className={cn('tabular-nums', !deliveryFeeKnown && 'text-gray-600')}>
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
            <div className="flex justify-between gap-4 text-body1 font-bold">
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
        </div>

        {/* O CEP aqui poupa o cliente de montar o pedido inteiro para só no fim
            descobrir quanto custa a entrega. */}
        {withDelivery && byDistance && (
          <div className="px-4 pb-4">
            <DeliveryQuoteField />
          </div>
        )}

        {belowMinimum && (
          <div className="px-4 pb-4">
            <Banner tone="warning" icon={<Info className="size-5" />}>
              Pedido mínimo para entrega: {formatPrice(business.delivery.minOrder)}.
            </Banner>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white px-4 pt-4 pb-safe-4 lg:pb-4">
        <Button
          fullWidth
          trailing={formatPrice(withDelivery && deliveryFeeKnown ? total : subtotal)}
          onClick={() => goToStep('checkout')}
        >
          Continuar
        </Button>
      </div>
    </>
  );
}
