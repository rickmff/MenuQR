'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useCart } from '@/components/cart-provider';
import { cn } from '@/lib/cn';
import { formatPrice, isValidPhone, maskPhone, onlyDigits } from '@/lib/format';
import { describeNextOpening, getOpeningStatus } from '@/lib/hours';
import { getItemById } from '@/lib/menu';
import { restaurant } from '@/lib/restaurant';
import { buildOrderMessage, describeSelections, whatsappUrl } from '@/lib/whatsapp';
import type { CustomerData } from '@/lib/types';

type FieldName = 'name' | 'phone' | 'zoneId' | 'street' | 'number' | 'payment';
type Errors = Partial<Record<FieldName, string>>;

export function CartDrawer() {
  const {
    cart,
    customer,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    isOpen,
    step,
    lastOrderUrl,
    setQuantity,
    removeLine,
    clearCart,
    updateCustomer,
    closeCart,
    setStep,
    setLastOrderUrl,
  } = useCart();

  const [errors, setErrors] = useState<Errors>({});
  const [warning, setWarning] = useState('');
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // Fecha com Esc e devolve o foco ao painel ao abrir (WCAG 2.1.2).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeCart();
    };
    document.addEventListener('keydown', onKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeCart]);

  /** Troca de passo sempre limpa as mensagens do passo anterior. */
  const goToStep = (next: 'cart' | 'checkout' | 'done') => {
    setErrors({});
    setWarning('');
    setStep(next);
  };

  if (!isOpen) return null;

  const belowMinimum =
    customer.mode === 'delivery' && restaurant.delivery.minOrder > 0 && subtotal < restaurant.delivery.minOrder;

  const validate = (): boolean => {
    const next: Errors = {};
    if (!customer.name.trim()) next.name = 'Informe seu nome.';
    if (!isValidPhone(customer.phone)) next.phone = 'Informe um WhatsApp válido com DDD.';
    if (customer.mode === 'delivery') {
      if (!restaurant.delivery.zones.some((zone) => zone.id === customer.zoneId)) {
        next.zoneId = 'Escolha o bairro da entrega.';
      }
      if (!customer.street.trim()) next.street = 'Informe a rua.';
      if (!customer.number.trim()) next.number = 'Informe o número.';
    }
    if (!customer.payment.trim()) next.payment = 'Escolha a forma de pagamento.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submitOrder = () => {
    setWarning('');
    if (!cart.length) return;

    if (belowMinimum) {
      setWarning(
        `O pedido mínimo para entrega é ${formatPrice(restaurant.delivery.minOrder)}. ` +
          'Adicione mais itens ou escolha retirada no local.',
      );
      return;
    }
    if (!validate()) return;

    const status = getOpeningStatus(restaurant);
    if (!status.open && !restaurant.acceptOrdersWhenClosed) {
      setWarning(`Estamos fechados agora. ${describeNextOpening(status)}.`);
      return;
    }

    const message = buildOrderMessage({
      restaurant,
      cart,
      customer,
      totals: { subtotal, deliveryFee, total },
      scheduled: !status.open,
    });
    const url = whatsappUrl(restaurant.whatsapp, message);

    setLastOrderUrl(url);
    window.open(url, '_blank', 'noopener,noreferrer');
    clearCart();
    goToStep('done');
  };

  const set = (patch: Partial<CustomerData>) => updateCustomer(patch);

  return (
    <div
      className="fixed inset-0 z-90 flex justify-end bg-charcoal-900/55"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeCart();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full w-full max-w-md flex-col bg-cream-50 shadow-lift outline-none"
      >
        <header className="flex items-center gap-3 border-b border-cream-200 bg-white px-5 py-4">
          {step === 'checkout' && (
            <button
              type="button"
              onClick={() => goToStep('cart')}
              className="grid size-9 place-items-center rounded-full bg-cream-100 text-charcoal-700"
            >
              <span aria-hidden="true">←</span>
              <span className="sr-only">Voltar para o carrinho</span>
            </button>
          )}
          <h2 id={titleId} className="flex-1 font-display text-lg font-semibold">
            {step === 'checkout' ? 'Dados para entrega' : step === 'done' ? 'Pedido enviado' : 'Seu pedido'}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="grid size-9 place-items-center rounded-full bg-cream-100 text-charcoal-700"
          >
            <span aria-hidden="true">✕</span>
            <span className="sr-only">Fechar carrinho</span>
          </button>
        </header>

        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {cart.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-4xl" aria-hidden="true">
                    🛒
                  </p>
                  <p className="mt-4 font-medium">Seu carrinho está vazio</p>
                  <p className="mt-1 text-sm text-charcoal-500">
                    Escolha os itens do cardápio para começar seu pedido.
                  </p>
                  <Link
                    href="/cardapio"
                    onClick={closeCart}
                    className="mt-6 inline-block rounded-xl bg-ember-500 px-5 py-3 text-sm font-semibold text-white hover:bg-ember-600"
                  >
                    Ver o cardápio
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {cart.map((line) => {
                    const found = getItemById(line.itemId);
                    const groups = found ? describeSelections(found.item, line.selections) : [];
                    return (
                      <li key={line.uid} className="rounded-card border border-cream-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">{line.name}</p>
                            {groups.length > 0 && (
                              <ul className="mt-1 space-y-0.5 text-xs text-charcoal-500">
                                {groups.map((group) => (
                                  <li key={group.group}>
                                    {group.group}: {group.values.join(', ')}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {line.notes && <p className="mt-1 text-xs text-charcoal-500">Obs.: {line.notes}</p>}
                          </div>
                          <p className="shrink-0 font-semibold">{formatPrice(line.unitPrice * line.quantity)}</p>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-xl border border-cream-200 p-1">
                            <button
                              type="button"
                              onClick={() => setQuantity(line.uid, line.quantity - 1)}
                              className="grid size-8 place-items-center rounded-lg bg-cream-100 text-lg leading-none"
                            >
                              <span aria-hidden="true">−</span>
                              <span className="sr-only">Diminuir quantidade de {line.name}</span>
                            </button>
                            <span className="min-w-8 text-center text-sm font-semibold" aria-live="polite">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(line.uid, line.quantity + 1)}
                              className="grid size-8 place-items-center rounded-lg bg-cream-100 text-lg leading-none"
                            >
                              <span aria-hidden="true">+</span>
                              <span className="sr-only">Aumentar quantidade de {line.name}</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(line.uid)}
                            className="text-sm text-charcoal-500 underline-offset-4 hover:text-ember-600 hover:underline"
                          >
                            Remover<span className="sr-only"> {line.name}</span>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {cart.length > 0 && (
              <footer className="space-y-3 border-t border-cream-200 bg-white px-5 py-4">
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-charcoal-500">
                      Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
                    </dt>
                    <dd className="font-medium">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-cream-200 pt-2 text-lg font-bold">
                    <dt>Total</dt>
                    <dd>{formatPrice(subtotal)}</dd>
                  </div>
                </dl>
                {belowMinimum && (
                  <p className="rounded-xl bg-ember-50 px-3 py-2 text-xs text-ember-700">
                    Pedido mínimo para entrega: {formatPrice(restaurant.delivery.minOrder)}. Faltam{' '}
                    {formatPrice(restaurant.delivery.minOrder - subtotal)} — ou escolha retirada no local.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => goToStep('checkout')}
                  className="w-full rounded-xl bg-ember-500 px-5 py-3.5 font-semibold text-white transition-colors hover:bg-ember-600"
                >
                  Continuar
                </button>
                <button
                  type="button"
                  onClick={clearCart}
                  className="w-full rounded-xl px-5 py-2 text-sm text-charcoal-500 hover:text-ember-600"
                >
                  Esvaziar carrinho
                </button>
              </footer>
            )}
          </>
        )}

        {step === 'checkout' && (
          <>
            <form
              className="flex-1 space-y-4 overflow-y-auto px-5 py-5"
              onSubmit={(event) => {
                event.preventDefault();
                submitOrder();
              }}
            >
              <fieldset>
                <legend className="sr-only">Como deseja receber o pedido</legend>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-cream-100 p-1">
                  {restaurant.delivery.enabled && (
                    <ModeButton
                      active={customer.mode === 'delivery'}
                      onClick={() => set({ mode: 'delivery' })}
                      label="🛵 Entrega"
                    />
                  )}
                  {restaurant.pickup.enabled && (
                    <ModeButton
                      active={customer.mode === 'pickup'}
                      onClick={() => set({ mode: 'pickup' })}
                      label="🏠 Retirada"
                    />
                  )}
                </div>
              </fieldset>

              <Field label="Nome completo" required error={errors.name} htmlFor="cart-name">
                <input
                  id="cart-name"
                  name="name"
                  autoComplete="name"
                  value={customer.name}
                  onChange={(event) => set({ name: event.target.value })}
                  placeholder="Como devemos te chamar?"
                  className={inputClass(Boolean(errors.name))}
                />
              </Field>

              <Field
                label="WhatsApp"
                required
                error={errors.phone}
                hint="Usamos para confirmar o pedido e avisar da entrega."
                htmlFor="cart-phone"
              >
                <input
                  id="cart-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={maskPhone(customer.phone)}
                  onChange={(event) => set({ phone: onlyDigits(event.target.value) })}
                  placeholder="(11) 98765-4321"
                  className={inputClass(Boolean(errors.phone))}
                />
              </Field>

              {customer.mode === 'delivery' ? (
                <>
                  <Field label="Bairro" required error={errors.zoneId} htmlFor="cart-zone">
                    <select
                      id="cart-zone"
                      name="zoneId"
                      value={customer.zoneId}
                      onChange={(event) => set({ zoneId: event.target.value })}
                      className={inputClass(Boolean(errors.zoneId))}
                    >
                      <option value="">Selecione o bairro</option>
                      {restaurant.delivery.zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} — {formatPrice(zone.fee)} · {zone.eta}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Field label="Rua" required error={errors.street} htmlFor="cart-street">
                        <input
                          id="cart-street"
                          name="street"
                          autoComplete="address-line1"
                          value={customer.street}
                          onChange={(event) => set({ street: event.target.value })}
                          placeholder="Av. Brasil"
                          className={inputClass(Boolean(errors.street))}
                        />
                      </Field>
                    </div>
                    <div className="w-28">
                      <Field label="Número" required error={errors.number} htmlFor="cart-number">
                        <input
                          id="cart-number"
                          name="number"
                          inputMode="numeric"
                          value={customer.number}
                          onChange={(event) => set({ number: event.target.value })}
                          placeholder="123"
                          className={inputClass(Boolean(errors.number))}
                        />
                      </Field>
                    </div>
                  </div>

                  <Field label="Complemento" htmlFor="cart-complement">
                    <input
                      id="cart-complement"
                      name="complement"
                      autoComplete="address-line2"
                      value={customer.complement}
                      onChange={(event) => set({ complement: event.target.value })}
                      placeholder="Apto 45, bloco B"
                      className={inputClass(false)}
                    />
                  </Field>

                  <Field label="Ponto de referência" htmlFor="cart-reference">
                    <input
                      id="cart-reference"
                      name="reference"
                      value={customer.reference}
                      onChange={(event) => set({ reference: event.target.value })}
                      placeholder="Portão verde, ao lado da padaria"
                      className={inputClass(false)}
                    />
                  </Field>
                </>
              ) : (
                <div className="rounded-card border border-dashed border-cream-200 bg-white p-4 text-sm">
                  <p className="font-semibold">Retirada no local</p>
                  <p className="mt-1 text-charcoal-500">
                    {restaurant.address.street} — {restaurant.address.district}
                    <br />
                    Fica pronto em {restaurant.pickup.eta}
                  </p>
                </div>
              )}

              <Field label="Forma de pagamento" required error={errors.payment} htmlFor="cart-payment">
                <select
                  id="cart-payment"
                  name="payment"
                  value={customer.payment}
                  onChange={(event) => set({ payment: event.target.value })}
                  className={inputClass(Boolean(errors.payment))}
                >
                  <option value="">Selecione</option>
                  {restaurant.payments.map((payment) => (
                    <option key={payment} value={payment}>
                      {payment}
                    </option>
                  ))}
                </select>
              </Field>

              {customer.payment === 'Dinheiro' && (
                <Field
                  label="Precisa de troco para quanto?"
                  hint="Deixe em branco se não precisar de troco."
                  htmlFor="cart-change"
                >
                  <input
                    id="cart-change"
                    name="changeFor"
                    inputMode="decimal"
                    value={customer.changeFor}
                    onChange={(event) => set({ changeFor: event.target.value })}
                    placeholder="R$ 100,00"
                    className={inputClass(false)}
                  />
                </Field>
              )}

              <Field label="Observações do pedido" htmlFor="cart-notes">
                <textarea
                  id="cart-notes"
                  name="notes"
                  rows={2}
                  value={customer.notes}
                  onChange={(event) => set({ notes: event.target.value })}
                  placeholder="Ex.: campainha não funciona, ligar ao chegar"
                  className={inputClass(false)}
                />
              </Field>
            </form>

            <footer className="space-y-3 border-t border-cream-200 bg-white px-5 py-4">
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-charcoal-500">Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                {customer.mode === 'delivery' && (
                  <div className="flex justify-between">
                    <dt className="text-charcoal-500">Entrega</dt>
                    <dd className={cn(deliveryFee === 0 && customer.zoneId && 'font-semibold text-whatsapp-600')}>
                      {deliveryFee === 0 && customer.zoneId ? 'Grátis' : formatPrice(deliveryFee)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed border-cream-200 pt-2 text-lg font-bold">
                  <dt>Total</dt>
                  <dd>{formatPrice(total)}</dd>
                </div>
              </dl>

              {warning && (
                <p role="alert" className="rounded-xl bg-ember-50 px-3 py-2 text-xs text-ember-700">
                  {warning}
                </p>
              )}

              <button
                type="button"
                onClick={submitOrder}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp-500 px-5 py-3.5 font-semibold text-white transition-colors hover:bg-whatsapp-600"
              >
                <span aria-hidden="true">📲</span> Enviar pedido pelo WhatsApp
              </button>
              <p className="text-center text-xs text-charcoal-500">
                Abrimos a conversa com o pedido já escrito. É só apertar enviar.
              </p>
            </footer>
          </>
        )}

        {step === 'done' && (
          <div className="flex flex-1 flex-col justify-center gap-4 px-6 py-10 text-center">
            <p className="text-5xl" aria-hidden="true">
              ✅
            </p>
            <h3 className="font-display text-xl font-semibold">Pedido enviado!</h3>
            <p className="text-sm text-charcoal-500">
              Abrimos o WhatsApp do {restaurant.name} com o resumo do seu pedido.{' '}
              <strong className="text-charcoal-900">Confirme o envio na conversa</strong> para que a cozinha
              receba.
            </p>
            {lastOrderUrl && (
              <a
                href={lastOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-whatsapp-500 px-5 py-3.5 font-semibold text-white hover:bg-whatsapp-600"
              >
                Abrir o WhatsApp novamente
              </a>
            )}
            <button
              type="button"
              onClick={closeCart}
              className="rounded-xl px-5 py-2 text-sm text-charcoal-500 hover:text-ember-600"
            >
              Voltar ao cardápio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
        active ? 'bg-white text-charcoal-900 shadow-soft' : 'text-charcoal-500 hover:text-charcoal-900',
      )}
    >
      {label}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-ember-600">
              {' '}
              *
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-charcoal-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-ember-600">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return cn(
    'w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition-colors',
    'focus:border-ember-500',
    invalid ? 'border-ember-500' : 'border-cream-200',
  );
}
