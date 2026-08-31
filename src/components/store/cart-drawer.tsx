'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useStore } from '@/components/store/store-provider';
import type { CartReview } from '@/lib/cart-store';
import { cn } from '@/lib/cn';
import { formatPrice, isValidPhone, maskPhone, onlyDigits } from '@/lib/format';
import { describeNextOpening, getOpeningStatus } from '@/lib/hours';
import { findItemById } from '@/lib/menu-utils';
import { OUT_OF_AREA_ZONE, buildOrderMessage, describeSelections, whatsappUrl } from '@/lib/whatsapp';
import type { CustomerData } from '@/lib/types';

type FieldName = 'name' | 'phone' | 'zoneId' | 'otherDistrict' | 'street' | 'number' | 'payment';
type Errors = Partial<Record<FieldName, string>>;

export function CartDrawer() {
  const {
    business,
    menu,
    cart,
    customer,
    review,
    itemCount,
    subtotal,
    deliveryFee,
    total,
    deliveryFeeKnown,
    isOpen,
    step,
    lastOrderUrl,
    setQuantity,
    removeLine,
    clearCart,
    updateCustomer,
    dismissReview,
    closeCart,
    setStep,
    setLastOrderUrl,
  } = useStore();

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
    customer.mode === 'delivery' && business.delivery.minOrder > 0 && subtotal < business.delivery.minOrder;

  const outOfArea = customer.mode === 'delivery' && customer.zoneId === OUT_OF_AREA_ZONE;

  // A gaveta só existe depois da hidratação, então ler o relógio aqui é seguro.
  const opening = getOpeningStatus(business.hours);
  // Fechado e sem agendamento: não adianta deixar o cliente preencher tudo
  // para descobrir no último clique.
  const closedForOrders = !opening.open && !business.acceptOrdersWhenClosed;

  const validate = (): boolean => {
    const next: Errors = {};
    if (!customer.name.trim()) next.name = 'Informe seu nome.';
    if (!isValidPhone(customer.phone)) next.phone = 'Informe um WhatsApp válido com DDD.';
    if (customer.mode === 'delivery') {
      if (outOfArea) {
        if (!customer.otherDistrict.trim()) next.otherDistrict = 'Informe o seu bairro.';
      } else if (!business.delivery.zones.some((zone) => zone.id === customer.zoneId)) {
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

    if (closedForOrders) {
      setWarning(`Estamos fechados agora. ${describeNextOpening(opening)}.`);
      return;
    }

    if (belowMinimum) {
      setWarning(
        `O pedido mínimo para entrega é ${formatPrice(business.delivery.minOrder)}. ` +
          'Adicione mais itens ou escolha retirada no local.',
      );
      return;
    }
    if (!validate()) return;

    // Reconfere no clique: a gaveta pode ter ficado aberta até a loja fechar.
    const status = getOpeningStatus(business.hours);
    if (!status.open && !business.acceptOrdersWhenClosed) {
      setWarning(`Estamos fechados agora. ${describeNextOpening(status)}.`);
      return;
    }

    const message = buildOrderMessage({
      business,
      menu,
      cart,
      customer,
      totals: { subtotal, deliveryFee, total },
      scheduled: !status.open,
    });
    const url = whatsappUrl(business.whatsapp, message);

    setLastOrderUrl(url);
    window.open(url, '_blank', 'noopener,noreferrer');
    clearCart();
    goToStep('done');
  };

  const set = (patch: Partial<CustomerData>) => updateCustomer(patch);

  return (
    <div
      className="fixed inset-0 z-90 flex justify-end bg-ink-950/55"
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
        className="flex h-full w-full max-w-md flex-col bg-ink-50 shadow-lift outline-none"
      >
        <header className="flex items-center gap-3 border-b border-ink-200 bg-white px-5 py-4">
          {step === 'checkout' && (
            <button
              type="button"
              onClick={() => goToStep('cart')}
              className="grid size-9 place-items-center rounded-full bg-ink-100 text-ink-700"
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
            className="grid size-9 place-items-center rounded-full bg-ink-100 text-ink-700"
          >
            <span aria-hidden="true">✕</span>
            <span className="sr-only">Fechar carrinho</span>
          </button>
        </header>

        {step === 'cart' && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-5">
              {!opening.open && (
                <ClosedNotice blocking={closedForOrders} next={describeNextOpening(opening)} />
              )}
              {review && <ReviewNotice review={review} onDismiss={dismissReview} />}
              {cart.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-4xl" aria-hidden="true">
                    🛒
                  </p>
                  <p className="mt-4 font-medium">Seu carrinho está vazio</p>
                  <p className="mt-1 text-sm text-ink-500">
                    Escolha os itens do cardápio para começar seu pedido.
                  </p>
                  <Link
                    href={`/r/${business.slug}`}
                    onClick={closeCart}
                    className="mt-6 inline-block rounded-xl bg-(--tenant-brand) px-5 py-3 text-sm font-semibold text-(--tenant-brand-text) hover:opacity-90"
                  >
                    Ver o cardápio
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {cart.map((line) => {
                    const found = findItemById(menu, line.itemId);
                    const groups = found ? describeSelections(found.item, line.selections) : [];
                    return (
                      <li key={line.uid} className="surface p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold">{line.name}</p>
                            {groups.length > 0 && (
                              <ul className="mt-1 space-y-0.5 text-xs text-ink-500">
                                {groups.map((group) => (
                                  <li key={group.group}>
                                    {group.group}: {group.values.join(', ')}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {line.notes && <p className="mt-1 text-xs text-ink-500">Obs.: {line.notes}</p>}
                          </div>
                          <p className="shrink-0 font-semibold">{formatPrice(line.unitPrice * line.quantity)}</p>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-xl border border-ink-200 p-1">
                            <button
                              type="button"
                              onClick={() => setQuantity(line.uid, line.quantity - 1)}
                              className="grid size-8 place-items-center rounded-lg bg-ink-100 text-lg leading-none"
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
                              className="grid size-8 place-items-center rounded-lg bg-ink-100 text-lg leading-none"
                            >
                              <span aria-hidden="true">+</span>
                              <span className="sr-only">Aumentar quantidade de {line.name}</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(line.uid)}
                            className="text-sm text-ink-500 underline-offset-4 hover:text-ink-950 hover:underline"
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
              <footer className="space-y-3 border-t border-ink-200 bg-white px-5 py-4">
                {/* Sem a entrega ainda, um só valor: repetir subtotal e total
                    com o mesmo número só ocupava espaço. */}
                <dl className="flex items-baseline justify-between text-lg font-bold">
                  <dt>
                    Total dos itens{' '}
                    <span className="text-sm font-medium text-ink-500">
                      ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
                    </span>
                  </dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </dl>
                {business.delivery.enabled && (
                  <p className="text-xs text-ink-500">
                    A entrega é calculada no próximo passo, quando você escolher o bairro.
                  </p>
                )}
                {belowMinimum && (
                  <p className="rounded-xl bg-ink-100 px-3 py-2 text-xs text-ink-950">
                    Pedido mínimo para entrega: {formatPrice(business.delivery.minOrder)}. Faltam{' '}
                    {formatPrice(business.delivery.minOrder - subtotal)} — ou escolha retirada no local.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => goToStep('checkout')}
                  disabled={closedForOrders}
                  className="w-full rounded-xl bg-(--tenant-brand) px-5 py-3.5 font-semibold text-(--tenant-brand-text) transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {closedForOrders ? 'Fechado agora' : 'Continuar'}
                </button>
                <button
                  type="button"
                  onClick={clearCart}
                  className="w-full rounded-xl px-5 py-2 text-sm text-ink-500 hover:text-ink-950"
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
              {!opening.open && (
                <ClosedNotice blocking={closedForOrders} next={describeNextOpening(opening)} />
              )}

              <fieldset>
                <legend className="sr-only">Como deseja receber o pedido</legend>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1">
                  {business.delivery.enabled && (
                    <ModeButton
                      active={customer.mode === 'delivery'}
                      onClick={() => set({ mode: 'delivery' })}
                      label="🛵 Entrega"
                    />
                  )}
                  {business.pickup.enabled && (
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
                      {business.delivery.zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} — {formatPrice(zone.fee)} · {zone.eta}
                        </option>
                      ))}
                      <option value={OUT_OF_AREA_ZONE}>Meu bairro não está na lista</option>
                    </select>
                  </Field>

                  {/* Sem esta saída, quem mora fora da área simplesmente trava. */}
                  {outOfArea && (
                    <div className="rounded-card border border-ink-200 bg-white p-4">
                      <p className="text-sm font-semibold">Vamos confirmar com o restaurante</p>
                      <p className="mt-1 text-sm text-ink-500">
                        O pedido chega marcado como <strong className="text-ink-950">a confirmar</strong>:
                        {' '}{business.name} responde na conversa se entrega no seu bairro e por quanto.
                      </p>

                      <div className="mt-3">
                        <Field label="Qual o seu bairro?" required error={errors.otherDistrict} htmlFor="cart-other-district">
                          <input
                            id="cart-other-district"
                            name="otherDistrict"
                            value={customer.otherDistrict}
                            onChange={(event) => set({ otherDistrict: event.target.value })}
                            placeholder="Vila Mariana"
                            className={inputClass(Boolean(errors.otherDistrict))}
                          />
                        </Field>
                      </div>

                      {business.pickup.enabled && (
                        <button
                          type="button"
                          onClick={() => set({ mode: 'pickup' })}
                          className="mt-3 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm font-semibold hover:border-(--tenant-brand-ink)"
                        >
                          Prefiro retirar no local ({business.pickup.eta})
                        </button>
                      )}
                    </div>
                  )}

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
                <div className="rounded-card border border-dashed border-ink-200 bg-white p-4 text-sm">
                  <p className="font-semibold">Retirada no local</p>
                  <p className="mt-1 text-ink-500">
                    {business.address.street} — {business.address.district}
                    <br />
                    Fica pronto em {business.pickup.eta}
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
                  {business.payments.map((payment) => (
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

            <footer className="space-y-3 border-t border-ink-200 bg-white px-5 py-4">
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-500">Subtotal</dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </div>
                {customer.mode === 'delivery' && (
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Entrega</dt>
                    <dd
                      className={cn(
                        !deliveryFeeKnown && 'text-ink-500',
                        deliveryFeeKnown && deliveryFee === 0 && 'font-semibold text-whatsapp-600',
                      )}
                    >
                      {!deliveryFeeKnown
                        ? outOfArea
                          ? 'a combinar'
                          : 'a calcular'
                        : deliveryFee === 0
                          ? 'Grátis'
                          : formatPrice(deliveryFee)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed border-ink-200 pt-2 text-lg font-bold">
                  <dt>Total</dt>
                  {/* Antes do bairro, mostrar um total fechado seria mentira. */}
                  <dd>
                    {deliveryFeeKnown ? (
                      formatPrice(total)
                    ) : (
                      <span>
                        {formatPrice(subtotal)}{' '}
                        <span className="text-sm font-medium text-ink-500">+ entrega</span>
                      </span>
                    )}
                  </dd>
                </div>
              </dl>

              {warning && (
                <p role="alert" className="rounded-xl bg-ink-100 px-3 py-2 text-xs text-ink-950">
                  {warning}
                </p>
              )}

              <button
                type="button"
                onClick={submitOrder}
                disabled={closedForOrders}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-whatsapp-500 px-5 py-3.5 font-semibold text-white transition-colors hover:bg-whatsapp-600 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-whatsapp-500"
              >
                <span aria-hidden="true">📲</span>{' '}
                {closedForOrders
                  ? 'Fechado agora'
                  : outOfArea
                    ? 'Enviar para confirmar a entrega'
                    : 'Enviar pedido pelo WhatsApp'}
              </button>
              <p className="text-center text-xs text-ink-500">
                {closedForOrders
                  ? describeNextOpening(opening)
                  : 'Abrimos a conversa com o pedido já escrito. É só apertar enviar.'}
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
            <p className="text-sm text-ink-500">
              Abrimos o WhatsApp do {business.name} com o resumo do seu pedido.{' '}
              <strong className="text-ink-950">Confirme o envio na conversa</strong> para que a cozinha
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
              className="rounded-xl px-5 py-2 text-sm text-ink-500 hover:text-ink-950"
            >
              Voltar ao cardápio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Loja fechada, avisado no topo da sacola — e não no último clique, depois de
 * o cliente já ter digitado endereço e telefone.
 */
function ClosedNotice({ blocking, next }: { blocking: boolean; next: string }) {
  return (
    <div
      className={cn(
        'mb-4 rounded-card border p-4',
        blocking ? 'border-flame-300 bg-flame-50' : 'border-ink-200 bg-white',
      )}
    >
      <p className="text-sm font-semibold">
        <span aria-hidden="true">🕒</span> Fechado agora
      </p>
      <p className="mt-1 text-sm text-ink-700">
        {next}.{' '}
        {blocking
          ? 'Você pode montar o pedido, mas só dá para enviar quando abrirmos.'
          : 'Seu pedido vai como agendamento — o restaurante confirma o horário na conversa.'}
      </p>
    </div>
  );
}

/**
 * O que mudou no cardápio enquanto a sacola esperava. Some quando o cliente
 * dispensa; até lá, ele vê exatamente o que foi corrigido e por quê.
 */
function ReviewNotice({ review, onDismiss }: { review: CartReview; onDismiss: () => void }) {
  return (
    <div role="status" className="mb-4 rounded-card border border-ink-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold">O cardápio mudou desde a sua última visita</p>
        <button
          type="button"
          onClick={onDismiss}
          className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700"
        >
          <span aria-hidden="true">✕</span>
          <span className="sr-only">Dispensar aviso</span>
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-ink-700">
        {review.soldOut.map((name) => (
          <li key={`esgotado-${name}`}>
            <strong className="font-semibold">{name}</strong> esgotou e saiu do seu pedido.
          </li>
        ))}
        {review.removed.map((name) => (
          <li key={`removido-${name}`}>
            <strong className="font-semibold">{name}</strong> não está mais no cardápio e saiu do seu
            pedido.
          </li>
        ))}
        {review.repriced.map((entry) => (
          <li key={`preco-${entry.name}`}>
            <strong className="font-semibold">{entry.name}</strong> mudou de {formatPrice(entry.from)}{' '}
            para {formatPrice(entry.to)}.
          </li>
        ))}
      </ul>
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
        active ? 'bg-white text-ink-950 shadow-soft' : 'text-ink-500 hover:text-ink-950',
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
            <span aria-hidden="true" className="text-flame-600">
              {' '}
              *
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        )}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-flame-600">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return cn('field-input', invalid && 'field-input-invalid');
}
