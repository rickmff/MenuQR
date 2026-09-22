'use client';

import { useState } from 'react';
import { useStore, type CheckoutStep } from '@/components/store/store-provider';
import { formatPrice, isValidPhone } from '@/lib/format';
import { describeNextOpening, getOpeningStatus, timeZoneForState } from '@/lib/hours';
import { buildOrderMessage, isDeliveryToBeAgreed, whatsappUrl } from '@/lib/whatsapp';
import type { CustomerData } from '@/lib/types';

export type FieldName = 'name' | 'phone' | 'zoneId' | 'otherDistrict' | 'street' | 'number';
export type Errors = Partial<Record<FieldName, string>>;

/**
 * Estado e regras do checkout, separados da apresentação. A lógica é a da
 * sacola antiga, mantida como está: mensagens de validação, ordem do envio e
 * os desvios de loja fechada, pedido mínimo e bairro fora da área.
 *
 * Só pode rodar depois da hidratação — a sacola aberta —, porque lê o relógio.
 * Numa página em cache, o relógio do servidor mostraria o status errado.
 */
export function useCheckout() {
  const {
    business,
    menu,
    cart,
    customer,
    subtotal,
    deliveryFee,
    total,
    updateCustomer,
    clearCart,
    setStep,
    setLastOrderUrl,
  } = useStore();

  const [errors, setErrors] = useState<Errors>({});
  const [warning, setWarning] = useState('');

  /** Troca de passo sempre limpa as mensagens do passo anterior. */
  const goToStep = (next: CheckoutStep) => {
    setErrors({});
    setWarning('');
    setStep(next);
  };

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
    // Ao enviar com erro, o foco vai para o primeiro campo inválido.
    const first = (Object.keys(next) as FieldName[])[0];
    if (first) {
      const ids: Record<FieldName, string> = {
        name: 'cart-name',
        phone: 'cart-phone',
        zoneId: 'cart-zone',
        otherDistrict: 'cart-other-district',
        street: 'cart-street',
        number: 'cart-number',
      };
      document.getElementById(ids[first])?.focus();
    }
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

    // Reconfere no clique: a sacola pode ter ficado aberta até a loja fechar.
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

  return {
    errors,
    warning,
    goToStep,
    submitOrder,
    set,
    opening,
    closedForOrders,
    belowMinimum,
    noZones,
    toBeAgreed,
    outOfArea,
    pickupAddress,
  };
}

export type Checkout = ReturnType<typeof useCheckout>;
