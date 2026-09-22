'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useStore } from '@/components/store/store-provider';
import type { CartReview } from '@/lib/cart-store';
import { cn } from '@/lib/cn';
import { formatPrice, isValidPhone, maskPhone, onlyDigits } from '@/lib/format';
import { describeNextOpening, getOpeningStatus, timeZoneForState } from '@/lib/hours';
import { findItemById } from '@/lib/menu-utils';
import {
  OUT_OF_AREA_ZONE,
  buildOrderMessage,
  describeSelections,
  isDeliveryToBeAgreed,
  whatsappUrl,
} from '@/lib/whatsapp';
import type { CustomerData } from '@/lib/types';

type FieldName = 'name' | 'phone' | 'zoneId' | 'otherDistrict' | 'street' | 'number';
type Errors = Partial<Record<FieldName, string>>;

export function CartDrawer() {
  const {
    business,
    menu,
    basePath,
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

  // Restaurante sem bairros cadastrados: a entrega inteira é "a combinar", sem
  // obrigar o cliente a dizer que "meu bairro não está na lista" de uma lista vazia.
  const noZones = business.delivery.zones.length === 0;
  const toBeAgreed = isDeliveryToBeAgreed(business, customer);
  const outOfArea = toBeAgreed && !noZones;
  const pickupAddress = [business.address.street, business.address.district, business.address.city]
    .filter(Boolean)
    .join(' — ');

  // A gaveta só existe depois da hidratação, então ler o relógio aqui é seguro.
  // O fuso é o do restaurante: o botão de enviar não pode seguir o do aparelho.
  const timeZone = timeZoneForState(business.address.state);
  const opening = getOpeningStatus(business.hours, timeZone);
  // Fechado e sem agendamento: não adianta deixar o cliente preencher tudo
  // para descobrir no último clique.
  const closedForOrders = !opening.open && !business.acceptOrdersWhenClosed;

  const validate = (): boolean => {
    const next: Errors = {};
    if (!customer.name.trim()) next.name = 'Informe seu nome.';
    if (!isValidPhone(customer.phone)) next.phone = 'Informe um WhatsApp válido com DDD.';
    if (customer.mode === 'delivery') {
      if (toBeAgreed) {
        if (!customer.otherDistrict.trim()) next.otherDistrict = 'Informe o seu bairro.';
      } else if (!business.delivery.zones.some((zone) => zone.id === customer.zoneId)) {
        next.zoneId = 'Escolha o bairro da entrega.';
      }
      if (!customer.street.trim()) next.street = 'Informe a rua.';
      if (!customer.number.trim()) next.number = 'Informe o número.';
    }
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
    const status = getOpeningStatus(business.hours, timeZone);
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

    // Tudo gravado ANTES de abrir o link: o desvio abaixo navega a própria aba,
    // e há navegador embutido que carrega o window.open nela mesma. clearCart()
    // grava no localStorage na hora; o passo "done" e o link ficam na memória
    // para quem volta do WhatsApp para esta página.
    setLastOrderUrl(url);
    clearCart();
    goToStep('done');

    // Sem `noopener` nos features: com ele o retorno é sempre null e não dá para
    // saber se abriu. O vínculo com a aba nova é cortado à mão, logo em seguida.
    const opened = window.open(url, '_blank');
    if (opened) {
      opened.opener = null;
    } else {
      // Pop-up bloqueado em silêncio (navegador embutido do Instagram/Facebook):
      // a própria aba segue para o link, e o link universal do wa.me abre o app.
      // `assign` equivale a atribuir `location.href`, que o lint do React
      // Compiler barra por ser escrita em global.
      window.location.assign(url);
    }
  };

  /** Corrigiu o campo, o erro dele some — sem esperar o próximo envio. */
  const set = (patch: Partial<CustomerData>) => {
    updateCustomer(patch);
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) delete next[key as FieldName];
      // Trocar o bairro ou o modo muda quais campos de endereço valem.
      if ('zoneId' in patch || 'mode' in patch) {
        delete next.zoneId;
        delete next.otherDistrict;
      }
      return next;
    });
  };

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
          <h2 id={titleId} className="flex-1 font-display text-subtitle font-semibold">
            {step === 'checkout'
              ? customer.mode === 'pickup'
                ? 'Dados para retirada'
                : 'Dados para entrega'
              : step === 'done'
                ? 'Pedido enviado'
                : 'Seu pedido'}
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
                  <p className="text-h3" aria-hidden="true">
                    🛒
                  </p>
                  <p className="mt-4 font-medium">Seu carrinho está vazio</p>
                  <p className="mt-1 text-body2 text-ink-500">
                    Escolha os itens do cardápio para começar seu pedido.
                  </p>
                  <Link
                    href={basePath}
                    onClick={closeCart}
                    className="mt-6 inline-block rounded-md bg-(--tenant-brand) px-5 py-3 text-body2 font-semibold text-(--tenant-brand-text) hover:opacity-90"
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
                              <ul className="mt-1 space-y-0.5 text-caption text-ink-500">
                                {groups.map((group) => (
                                  <li key={group.group}>
                                    {group.group}: {group.values.join(', ')}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {line.notes && <p className="mt-1 text-caption text-ink-500">Obs.: {line.notes}</p>}
                          </div>
                          <p className="shrink-0 font-semibold">{formatPrice(line.unitPrice * line.quantity)}</p>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 rounded-md border border-ink-200 p-1">
                            <button
                              type="button"
                              onClick={() => setQuantity(line.uid, line.quantity - 1)}
                              className="grid size-8 place-items-center rounded-sm bg-ink-100 text-subtitle leading-none"
                            >
                              <span aria-hidden="true">−</span>
                              <span className="sr-only">Diminuir quantidade de {line.name}</span>
                            </button>
                            <span className="min-w-8 text-center text-body2 font-semibold" aria-live="polite">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => setQuantity(line.uid, line.quantity + 1)}
                              className="grid size-8 place-items-center rounded-sm bg-ink-100 text-subtitle leading-none"
                            >
                              <span aria-hidden="true">+</span>
                              <span className="sr-only">Aumentar quantidade de {line.name}</span>
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(line.uid)}
                            className="text-body2 text-ink-500 underline-offset-4 hover:text-ink-950 hover:underline"
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
                <dl className="flex items-baseline justify-between text-subtitle font-bold">
                  <dt>
                    Total dos itens{' '}
                    <span className="text-body2 font-medium text-ink-500">
                      ({itemCount} {itemCount === 1 ? 'item' : 'itens'})
                    </span>
                  </dt>
                  <dd>{formatPrice(subtotal)}</dd>
                </dl>
                {business.delivery.enabled && (
                  <p className="text-caption text-ink-500">
                    A entrega é calculada no próximo passo, quando você escolher o bairro.
                  </p>
                )}
                {belowMinimum && (
                  <p className="rounded-md bg-ink-100 px-3 py-2 text-caption text-ink-950">
                    Pedido mínimo para entrega: {formatPrice(business.delivery.minOrder)}. Faltam{' '}
                    {formatPrice(business.delivery.minOrder - subtotal)} — ou escolha retirada no local.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => goToStep('checkout')}
                  disabled={closedForOrders}
                  className="w-full rounded-md bg-(--tenant-brand) px-5 py-3.5 font-semibold text-(--tenant-brand-text) transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {closedForOrders ? 'Fechado agora' : 'Continuar'}
                </button>
                <button
                  type="button"
                  onClick={clearCart}
                  className="w-full rounded-md px-5 py-2 text-body2 text-ink-500 hover:text-ink-950"
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

              {/* Com um modo só não há o que escolher: o seletor vira um aviso. */}
              {business.delivery.enabled && business.pickup.enabled ? (
                <fieldset>
                  <legend className="sr-only">Como deseja receber o pedido</legend>
                  <div className="grid grid-cols-2 gap-1 rounded-md bg-ink-100 p-1">
                    <ModeButton
                      active={customer.mode === 'delivery'}
                      onClick={() => set({ mode: 'delivery' })}
                      label="🛵 Entrega"
                    />
                    <ModeButton
                      active={customer.mode === 'pickup'}
                      onClick={() => set({ mode: 'pickup' })}
                      label="🏠 Retirada"
                    />
                  </div>
                </fieldset>
              ) : (
                <p className="rounded-md bg-ink-100 px-4 py-2.5 text-center text-body2 font-semibold">
                  {customer.mode === 'pickup' ? '🏠 Somente retirada no local' : '🛵 Somente entrega'}
                </p>
              )}

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
                  {noZones ? (
                    <Field
                      label="Bairro"
                      required
                      error={errors.otherDistrict}
                      hint={`${business.name} informa a taxa de entrega na conversa.`}
                      htmlFor="cart-other-district"
                    >
                      <input
                        id="cart-other-district"
                        name="otherDistrict"
                        autoComplete="address-level3"
                        value={customer.otherDistrict}
                        onChange={(event) => set({ otherDistrict: event.target.value })}
                        placeholder="Vila Mariana"
                        className={inputClass(Boolean(errors.otherDistrict))}
                      />
                    </Field>
                  ) : (
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
                            {zone.name} — {zone.fee > 0 ? formatPrice(zone.fee) : 'grátis'}
                            {zone.eta ? ` · ${zone.eta}` : ''}
                          </option>
                        ))}
                        <option value={OUT_OF_AREA_ZONE}>Meu bairro não está na lista</option>
                      </select>
                    </Field>
                  )}

                  {/* Sem esta saída, quem mora fora da área simplesmente trava. */}
                  {outOfArea && (
                    <div className="rounded-card border border-ink-200 bg-white p-4">
                      <p className="text-body2 font-semibold">Vamos confirmar com o restaurante</p>
                      <p className="mt-1 text-body2 text-ink-500">
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
                          className="mt-3 w-full rounded-md border border-ink-200 px-4 py-2.5 text-body2 font-semibold hover:border-(--tenant-brand-ink)"
                        >
                          Prefiro retirar no local{business.pickup.eta ? ` (${business.pickup.eta})` : ''}
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
                <div className="rounded-card border border-dashed border-ink-200 bg-white p-4 text-body2">
                  <p className="font-semibold">Retirada no local</p>
                  <p className="mt-1 text-ink-500">
                    {pickupAddress || 'Confirme o endereço com o restaurante na conversa.'}
                    {business.pickup.eta && (
                      <>
                        <br />
                        Fica pronto em {business.pickup.eta}
                      </>
                    )}
                  </p>
                </div>
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
              <dl className="space-y-1 text-body2">
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
                        ? toBeAgreed
                          ? 'a combinar'
                          : 'a calcular'
                        : deliveryFee === 0
                          ? 'Grátis'
                          : formatPrice(deliveryFee)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-dashed border-ink-200 pt-2 text-subtitle font-bold">
                  <dt>Total</dt>
                  {/* Antes do bairro, mostrar um total fechado seria mentira. */}
                  <dd>
                    {deliveryFeeKnown ? (
                      formatPrice(total)
                    ) : (
                      <span>
                        {formatPrice(subtotal)}{' '}
                        <span className="text-body2 font-medium text-ink-500">+ entrega</span>
                      </span>
                    )}
                  </dd>
                </div>
              </dl>

              {warning && (
                <p role="alert" className="rounded-md bg-ink-100 px-3 py-2 text-caption text-ink-950">
                  {warning}
                </p>
              )}

              <button
                type="button"
                onClick={submitOrder}
                disabled={closedForOrders}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-whatsapp-500 px-5 py-3.5 font-semibold text-white transition-colors hover:bg-whatsapp-600 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-whatsapp-500"
              >
                <span aria-hidden="true">📲</span>{' '}
                {closedForOrders
                  ? 'Fechado agora'
                  : outOfArea
                    ? 'Enviar para confirmar a entrega'
                    : 'Enviar pedido pelo WhatsApp'}
              </button>
              <p className="text-center text-caption text-ink-500">
                {closedForOrders
                  ? describeNextOpening(opening)
                  : 'Abrimos a conversa com o pedido já escrito. É só apertar enviar.'}
              </p>
            </footer>
          </>
        )}

        {step === 'done' && (
          <div className="flex flex-1 flex-col justify-center gap-4 px-6 py-10 text-center">
            <p className="text-h2" aria-hidden="true">
              ✅
            </p>
            <h3 className="font-display text-h6 font-semibold">Pedido enviado!</h3>
            <p className="text-body2 text-ink-500">
              Abrimos o WhatsApp do {business.name} com o resumo do seu pedido.{' '}
              <strong className="text-ink-950">Confirme o envio na conversa</strong> para que a cozinha
              receba.
            </p>
            {lastOrderUrl && (
              <a
                href={lastOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-whatsapp-500 px-5 py-3.5 font-semibold text-white hover:bg-whatsapp-600"
              >
                Abrir o WhatsApp novamente
              </a>
            )}
            <button
              type="button"
              onClick={closeCart}
              className="rounded-md px-5 py-2 text-body2 text-ink-500 hover:text-ink-950"
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
      <p className="text-body2 font-semibold">
        <span aria-hidden="true">🕒</span> Fechado agora
      </p>
      <p className="mt-1 text-body2 text-ink-700">
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
        <p className="text-body2 font-semibold">O cardápio mudou desde a sua última visita</p>
        <button
          type="button"
          onClick={onDismiss}
          className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700"
        >
          <span aria-hidden="true">✕</span>
          <span className="sr-only">Dispensar aviso</span>
        </button>
      </div>
      <ul className="mt-2 space-y-1 text-body2 text-ink-700">
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
        {review.changed.map((name) => (
          <li key={`opcoes-${name}`}>
            As opções de <strong className="font-semibold">{name}</strong> mudaram. Ele saiu do seu
            pedido — adicione de novo para escolher.
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
        'rounded-sm px-4 py-2.5 text-body2 font-semibold transition-colors',
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-body2 font-semibold">
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
      {hint && !error && <p className="mt-1 text-caption text-ink-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-caption font-medium text-flame-600">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return cn('field-input', invalid && 'field-input-invalid');
}
