'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { QUOTE_FIELD_ID } from '@/components/store/cart/delivery-quote-field';
import { useStore } from '@/components/store/store-provider';
import { chargesByDistance, isOutOfRange } from '@/lib/delivery';
import { formatPrice, isValidPhone } from '@/lib/format';
import { getOpeningStatus, timeZoneForState } from '@/lib/hours';
import { scrollBehavior } from '@/lib/reduced-motion';
import { buildOrderMessage, isDeliveryToBeAgreed, whatsappUrl } from '@/lib/whatsapp';
import type { CustomerData } from '@/lib/types';
import { useUiText } from '@/lib/use-ui-text';

export type FieldName =
  | 'name'
  | 'phone'
  | 'zoneId'
  | 'otherDistrict'
  | 'street'
  | 'number'
  | 'postalCode';
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
    step,
    goToStep,
    setLastOrderUrl,
  } = useStore();
  const uiText = useUiText();
  const t = useTranslations('store.checkout.errors');

  const [errors, setErrors] = useState<Errors>({});
  const [warning, setWarning] = useState('');

  // Troca de passo sempre limpa as mensagens do passo anterior — venha ela de
  // um botão ou do voltar do sistema, por isso a comparação é no render (o
  // passo é derivado do histórico).
  const [seenStep, setSeenStep] = useState(step);
  if (seenStep !== step) {
    setSeenStep(step);
    setErrors({});
    setWarning('');
  }

  const belowMinimum =
    customer.mode === 'delivery' && business.delivery.minOrder > 0 && subtotal < business.delivery.minOrder;

  // Restaurante sem bairros cadastrados: a entrega inteira é "a combinar", sem
  // obrigar o cliente a dizer que "meu bairro não está na lista" de uma lista vazia.
  const noZones = business.delivery.zones.length === 0;
  const toBeAgreed = isDeliveryToBeAgreed(business, customer);
  // Cobrando por km, o endereço do cliente é o CEP: o bairro sai do checkout e
  // "fora da área" passa a ser o CEP que caiu além do raio.
  const byDistance = chargesByDistance(business);
  const outOfArea = byDistance
    ? customer.quote !== null && isOutOfRange(business, customer.quote.distanceKm)
    : toBeAgreed && !noZones;
  const pickupAddress = [business.address.street, business.address.district, business.address.city]
    .filter(Boolean)
    .join(' — ');

  // O fuso é o do restaurante: o botão de enviar não pode seguir o do aparelho.
  const timeZone = timeZoneForState(business.address.state);
  const opening = getOpeningStatus(business.hours, timeZone);

  const validate = (): boolean => {
    const next: Errors = {};
    if (!customer.name.trim()) next.name = t('name');
    if (!isValidPhone(customer.phone)) next.phone = t('phone');
    if (customer.mode === 'delivery') {
      if (byDistance) {
        // Sem a cotação o total sairia sem entrega, e o restaurante receberia
        // um pedido sem saber quanto cobrar por ela.
        if (!customer.quote) next.postalCode = t('postalCode');
      } else if (toBeAgreed) {
        if (!customer.otherDistrict.trim()) next.otherDistrict = t('otherDistrict');
      } else if (!business.delivery.zones.some((zone) => zone.id === customer.zoneId)) {
        next.zoneId = t('zoneId');
      }
      if (!customer.street.trim()) next.street = t('street');
      if (!customer.number.trim()) next.number = t('number');
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
        postalCode: QUOTE_FIELD_ID,
      };
      // Centralizado: com o teclado aberto, o campo não fica sob o rodapé.
      const field = document.getElementById(ids[first]);
      field?.scrollIntoView({ block: 'center', behavior: scrollBehavior() });
      field?.focus({ preventScroll: true });
    }
    return Object.keys(next).length === 0;
  };

  const submitOrder = () => {
    setWarning('');
    if (!cart.length) return;

    if (belowMinimum) {
      // O Entrega | Retirada está logo acima: o aviso só diz quanto falta.
      setWarning(t('belowMinimum', { value: formatPrice(business.delivery.minOrder) }));
      return;
    }
    if (!validate()) return;

    // Reconfere no clique: a sacola pode ter ficado aberta até a loja fechar,
    // e aí a mensagem sai marcada como enviada com a loja fechada.
    const status = getOpeningStatus(business.hours, timeZone);

    const message = buildOrderMessage({
      business,
      menu,
      cart,
      customer,
      totals: { subtotal, deliveryFee, total },
      text: uiText,
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
    belowMinimum,
    noZones,
    byDistance,
    toBeAgreed,
    outOfArea,
    pickupAddress,
  };
}

export type Checkout = ReturnType<typeof useCheckout>;
