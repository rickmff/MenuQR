'use client';

import { Bike, MessageCircle, Store } from 'lucide-react';
import { ClosedNotice } from '@/components/store/cart/cart-notices';
import { DeliveryQuoteField } from '@/components/store/cart/delivery-quote-field';
import type { Checkout } from '@/components/store/cart/use-checkout';
import { useStore } from '@/components/store/store-provider';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SelectField, TextArea, TextField } from '@/components/ui/text-field';
import { cn } from '@/lib/cn';
import { formatPrice, maskPhone, onlyDigits } from '@/lib/format';
import { describeNextOpening } from '@/lib/hours';
import { OUT_OF_AREA_ZONE } from '@/lib/whatsapp';
import type { OrderMode } from '@/lib/types';

const FORM_ID = 'checkout-form';

function SectionTitle({ children }: { children: string }) {
  return <h3 className="text-body1 font-semibold text-gray-700">{children}</h3>;
}

/**
 * Passo `checkout`: como receber, seus dados, endereço e observações; o resumo
 * e o "Fazer pedido pelo WhatsApp" no rodapé. Ids, `autoComplete` e mensagens
 * dos campos são os de sempre — é o que mantém o preenchimento automático do
 * navegador e as regras já testadas.
 */
export function CheckoutStep({ checkout }: { checkout: Checkout }) {
  const { business, customer, subtotal, deliveryFee, total, deliveryFeeKnown } = useStore();
  const {
    errors,
    warning,
    submitOrder,
    set,
    opening,
    noZones,
    byDistance,
    toBeAgreed,
    outOfArea,
    pickupAddress,
  } = checkout;

  const bothModes = business.delivery.enabled && business.pickup.enabled;

  return (
    <>
      <form
        id={FORM_ID}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        onSubmit={(event) => {
          event.preventDefault();
          submitOrder();
        }}
      >
        <div className="space-y-4 px-4 py-4">
          {!opening.open && <ClosedNotice next={describeNextOpening(opening)} />}

          {/* Com um modo só não há o que escolher: o seletor vira um rótulo. */}
          {bothModes ? (
            <SegmentedControl<OrderMode>
              label="Como deseja receber o pedido"
              value={customer.mode}
              onChange={(mode) => set({ mode })}
              options={[
                { value: 'delivery', label: 'Entrega', icon: <Bike className="size-5" /> },
                { value: 'pickup', label: 'Retirada', icon: <Store className="size-5" /> },
              ]}
            />
          ) : (
            <p className="flex items-center justify-center gap-2 rounded-full bg-gray-100 px-4 py-2.5 text-body2 font-semibold text-gray-700">
              {customer.mode === 'pickup' ? (
                <>
                  <Store aria-hidden="true" className="size-5" /> Somente retirada no local
                </>
              ) : (
                <>
                  <Bike aria-hidden="true" className="size-5" /> Somente entrega
                </>
              )}
            </p>
          )}
        </div>

        <div aria-hidden="true" className="h-2 bg-gray-50" />

        <div className="space-y-4 px-4 py-4">
          <SectionTitle>Seus dados</SectionTitle>
          <TextField
            id="cart-name"
            name="name"
            label="Nome completo"
            required
            autoComplete="name"
            value={customer.name}
            onChange={(event) => set({ name: event.target.value })}
            placeholder="Como devemos te chamar?"
            error={errors.name}
          />
          <TextField
            id="cart-phone"
            name="phone"
            label="WhatsApp"
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={maskPhone(customer.phone)}
            onChange={(event) => set({ phone: onlyDigits(event.target.value) })}
            placeholder="(11) 98765-4321"
            hint="Usamos para confirmar o pedido e avisar da entrega."
            error={errors.phone}
          />
        </div>

        <div aria-hidden="true" className="h-2 bg-gray-50" />

        <div className="space-y-4 px-4 py-4">
          {customer.mode === 'delivery' ? (
            <>
              <SectionTitle>Endereço de entrega</SectionTitle>
              {byDistance ? (
                <DeliveryQuoteField error={errors.postalCode} explainOutOfRange={false} />
              ) : noZones ? (
                <TextField
                  id="cart-other-district"
                  name="otherDistrict"
                  label="Bairro"
                  required
                  autoComplete="address-level3"
                  value={customer.otherDistrict}
                  onChange={(event) => set({ otherDistrict: event.target.value })}
                  placeholder="Vila Mariana"
                  hint={`${business.name} informa a taxa de entrega na conversa.`}
                  error={errors.otherDistrict}
                />
              ) : (
                <SelectField
                  id="cart-zone"
                  name="zoneId"
                  label="Bairro"
                  required
                  value={customer.zoneId}
                  onChange={(event) => set({ zoneId: event.target.value })}
                  error={errors.zoneId}
                >
                  <option value="">Selecione o bairro</option>
                  {business.delivery.zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} — {zone.fee > 0 ? formatPrice(zone.fee) : 'grátis'}
                      {zone.eta ? ` · ${zone.eta}` : ''}
                    </option>
                  ))}
                  <option value={OUT_OF_AREA_ZONE}>Meu bairro não está na lista</option>
                </SelectField>
              )}

              {/* Sem esta saída, quem mora fora da área simplesmente trava. */}
              {outOfArea && (
                <Card padding="sm" className="space-y-3">
                  <div>
                    <p className="text-body2 font-semibold text-gray-700">Vamos confirmar com o restaurante</p>
                    <p className="mt-1 text-body2 text-gray-600">
                      O pedido chega marcado como{' '}
                      <strong className="font-semibold text-gray-700">a confirmar</strong>: {business.name}{' '}
                      responde na conversa se entrega no seu {byDistance ? 'endereço' : 'bairro'} e por
                      quanto.
                    </p>
                  </div>
                  {/* Pelo CEP o bairro já veio junto: perguntar de novo seria
                      pedir o que o cliente acabou de informar. */}
                  {!byDistance && (
                    <TextField
                      id="cart-other-district"
                      name="otherDistrict"
                      label="Qual o seu bairro?"
                      required
                      value={customer.otherDistrict}
                      onChange={(event) => set({ otherDistrict: event.target.value })}
                      placeholder="Vila Mariana"
                      error={errors.otherDistrict}
                    />
                  )}
                  {business.pickup.enabled && (
                    <Button variant="secondary" fullWidth onClick={() => set({ mode: 'pickup' })}>
                      Prefiro retirar no local{business.pickup.eta ? ` (${business.pickup.eta})` : ''}
                    </Button>
                  )}
                </Card>
              )}

              <div className="flex gap-3">
                <TextField
                  id="cart-street"
                  name="street"
                  label="Rua"
                  required
                  autoComplete="address-line1"
                  value={customer.street}
                  onChange={(event) => set({ street: event.target.value })}
                  placeholder="Av. Brasil"
                  error={errors.street}
                  className="min-w-0 flex-1"
                />
                <TextField
                  id="cart-number"
                  name="number"
                  label="Número"
                  required
                  inputMode="numeric"
                  value={customer.number}
                  onChange={(event) => set({ number: event.target.value })}
                  placeholder="123"
                  error={errors.number}
                  className="w-28 shrink-0"
                />
              </div>

              <TextField
                id="cart-complement"
                name="complement"
                label="Complemento"
                autoComplete="address-line2"
                value={customer.complement}
                onChange={(event) => set({ complement: event.target.value })}
                placeholder="Apto 45, bloco B"
              />

              <TextField
                id="cart-reference"
                name="reference"
                label="Ponto de referência"
                value={customer.reference}
                onChange={(event) => set({ reference: event.target.value })}
                placeholder="Portão verde, ao lado da padaria"
              />
            </>
          ) : (
            <>
              <SectionTitle>Retirada no local</SectionTitle>
              <Card padding="sm" className="flex items-start gap-3">
                <Store aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-gray-600" />
                <p className="text-body2 text-gray-600">
                  {pickupAddress || 'Confirme o endereço com o restaurante na conversa.'}
                  {business.pickup.eta && (
                    <>
                      <br />
                      Fica pronto em {business.pickup.eta}
                    </>
                  )}
                </p>
              </Card>
            </>
          )}
        </div>

        <div aria-hidden="true" className="h-2 bg-gray-50" />

        <div className="space-y-4 px-4 py-4">
          <SectionTitle>Observações</SectionTitle>
          <TextArea
            id="cart-notes"
            name="notes"
            label="Observações do pedido"
            rows={2}
            value={customer.notes}
            onChange={(event) => set({ notes: event.target.value })}
            placeholder="Ex.: campainha não funciona, ligar ao chegar"
          />
        </div>
      </form>

      <div className="shrink-0 space-y-3 border-t border-gray-200 bg-white px-4 pt-4 pb-safe-4 lg:pb-4">
        <dl className="space-y-1 text-body2 text-gray-700">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-600">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          {customer.mode === 'delivery' && (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-600">Taxa de entrega</dt>
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
          )}
          <div className="flex justify-between gap-4 pt-1 text-body1 font-bold">
            <dt>Total</dt>
            {/* Antes do bairro, mostrar um total fechado seria mentira. */}
            <dd className="tabular-nums">
              {deliveryFeeKnown ? (
                formatPrice(total)
              ) : (
                <>
                  {formatPrice(subtotal)}{' '}
                  <span className="text-body2 font-medium text-gray-600">+ entrega</span>
                </>
              )}
            </dd>
          </div>
        </dl>

        {warning && (
          <Banner tone="warning" role="alert">
            {warning}
          </Banner>
        )}

        {/* `brand`: o último botão do fluxo abre o WhatsApp, e é o único lugar
          * do app onde o verde vivo com rótulo grafite cabe — é literalmente o
          * botão do WhatsApp (8,8:1, contra 4,68:1 do verde escuro com rótulo
          * branco). Medido no site deles, nenhum botão verde leva rótulo
          * branco. Os outros botões do app continuam `primary` (D21). */}
        <Button
          type="submit"
          form={FORM_ID}
          variant="brand"
          fullWidth
          leading={<MessageCircle aria-hidden="true" className="size-5" />}
        >
          {outOfArea ? 'Enviar para confirmar a entrega' : 'Fazer pedido pelo WhatsApp'}
        </Button>
        <p className="text-center text-caption text-gray-600">
          Abrimos a conversa com o pedido já escrito. É só apertar enviar.
        </p>
      </div>
    </>
  );
}
