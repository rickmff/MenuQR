'use client';

import { Bike, Store } from 'lucide-react';
import { ClosedNotice } from '@/components/store/cart/cart-notices';
import { DeliveryQuoteField } from '@/components/store/cart/delivery-quote-field';
import { OrderModeControl } from '@/components/store/cart/order-mode-control';
import type { Checkout } from '@/components/store/cart/use-checkout';
import { useStore } from '@/components/store/store-provider';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { SelectField, TextArea, TextField } from '@/components/ui/text-field';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { cn } from '@/lib/cn';
import { formatPrice, maskPhone, onlyDigits } from '@/lib/format';
import { describeNextOpening } from '@/lib/hours';
import { OUT_OF_AREA_ZONE } from '@/lib/whatsapp';

const FORM_ID = 'checkout-form';

function SectionTitle({ children }: { children: string }) {
  return <h3 className="font-display text-h6 font-bold text-gray-900">{children}</h3>;
}

/**
 * Passo `checkout`: como receber, seus dados, endereço e observações, em campos
 * cinza de cantos 12; o resumo e o "Fazer pedido pelo WhatsApp" no rodapé.
 * Ids, `autoComplete` e mensagens dos campos são os de sempre — é o que mantém o
 * preenchimento automático do navegador e as regras já testadas.
 *
 * Com o teclado aberto (algum campo com foco) o rodapé encolhe para o total e
 * o botão: o resumo e a legenda somem, e o campo continua à vista.
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
    // Com o teclado aberto (campo em foco, só no celular) somem o subtotal e a
    // taxa, e sobram o total, o CTA e a legenda. Só o que fica ACIMA do botão
    // some: ao tocar no CTA o campo perde o foco e as linhas voltam, e se algo
    // voltasse abaixo do botão ele subiria entre o mousedown e o mouseup, e o
    // clique cairia fora dele.
    <div className="flex min-h-0 flex-1 flex-col max-lg:[&:has(input:focus,select:focus,textarea:focus)_[data-summary]]:hidden">
      <form
        id={FORM_ID}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-8 [scroll-padding-bottom:6rem]"
        onSubmit={(event) => {
          event.preventDefault();
          submitOrder();
        }}
      >
        <div className="space-y-4 pt-2">
          {!opening.open && <ClosedNotice next={describeNextOpening(opening)} />}

          {/* Com um modo só não há o que escolher: o seletor vira um rótulo. */}
          {bothModes ? (
            <OrderModeControl value={customer.mode} onChange={(mode) => set({ mode })} />
          ) : (
            <p className="flex h-12 items-center justify-center gap-2 rounded-full bg-gray-100 px-4 text-body1 font-semibold text-gray-700">
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

        <div className="mt-8 space-y-4">
          <SectionTitle>Seus dados</SectionTitle>
          <TextField
            appearance="soft"
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
            appearance="soft"
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

        <div className="mt-8 space-y-4">
          {customer.mode === 'delivery' ? (
            <>
              <SectionTitle>Endereço de entrega</SectionTitle>
              {byDistance ? (
                <DeliveryQuoteField error={errors.postalCode} explainOutOfRange={false} />
              ) : noZones ? (
                <TextField
                  appearance="soft"
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
                  appearance="soft"
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
                <div className="space-y-3 rounded-lg bg-gray-50 p-4">
                  <div>
                    <p className="text-body2 font-semibold text-gray-700">Vamos confirmar com o restaurante</p>
                    {/* Sobre o gray-50 o corpo é gray-700: o gray-600 fica em 4,4:1. */}
                    <p className="mt-1 text-body2 text-gray-700">
                      O pedido chega marcado como{' '}
                      <strong className="font-semibold text-gray-700">a confirmar</strong>: {business.name}{' '}
                      responde na conversa se entrega no seu {byDistance ? 'endereço' : 'bairro'} e por
                      quanto.
                    </p>
                  </div>
                  {/* Pelo CEP o bairro já veio junto: perguntar de novo seria
                      pedir o que o cliente acabou de informar. */}
                  {/* Com contorno: o campo soft é gray-50 e sumiria dentro deste bloco gray-50. */}
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
                    <Button variant="secondary" size="cta" pill fullWidth onClick={() => set({ mode: 'pickup' })}>
                      Prefiro retirar no local{business.pickup.eta ? ` (${business.pickup.eta})` : ''}
                    </Button>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <TextField
                  appearance="soft"
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
                  appearance="soft"
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
                appearance="soft"
                id="cart-complement"
                name="complement"
                label="Complemento"
                autoComplete="address-line2"
                value={customer.complement}
                onChange={(event) => set({ complement: event.target.value })}
                placeholder="Apto 45, bloco B"
              />

              <TextField
                appearance="soft"
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
              <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-4">
                <Store aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-gray-600" />
                <p className="text-body1 text-gray-700">
                  {pickupAddress || 'Confirme o endereço com o restaurante na conversa.'}
                  {business.pickup.eta && (
                    <>
                      <br />
                      Fica pronto em {business.pickup.eta}
                    </>
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="mt-8 space-y-4">
          <SectionTitle>Observações</SectionTitle>
          <TextArea
            appearance="soft"
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

      <div className="shrink-0 space-y-3 bg-white px-4 pt-3 pb-safe-4 shadow-up">
        <dl className="space-y-1 text-body2 text-gray-700">
          <div data-summary className="flex justify-between gap-4">
            <dt className="text-gray-600">Subtotal</dt>
            <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          {customer.mode === 'delivery' && (
            <div data-summary className="flex justify-between gap-4">
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
          <div className="flex items-baseline justify-between gap-4 pt-1 text-h6 font-bold text-gray-900">
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
          <Banner tone="warning" radius="md" role="alert" className="animate-fade-in">
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
          size="cta"
          pill
          fullWidth
          after={<WhatsAppGlyph className="size-5" />}
          className="cursor-pointer"
        >
          {outOfArea ? 'Enviar para confirmar a entrega' : 'Fazer pedido pelo WhatsApp'}
        </Button>
        <p className="text-center text-caption text-gray-600">
          Abrimos a conversa com o pedido já escrito. É só apertar enviar.
        </p>
      </div>
    </div>
  );
}
