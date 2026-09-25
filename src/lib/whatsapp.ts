import { chargesByDistance, formatDistance, isOutOfRange, maskPostalCode, quoteFee } from './delivery';
import { formatPrice, maskPhone, onlyDigits } from './format';
import { formatClock, getZonedDateParts, timeZoneForState } from './hours';
import type { UiText } from './i18n';
import { findItemById } from './menu-utils';
import type {
  Business,
  CartLine,
  CartLineSelections,
  CustomerData,
  MenuCategory,
  MenuItem,
  OrderMode,
} from './types';

/**
 * Bairro fora da área atendida. O cliente ainda consegue mandar o pedido, mas
 * ele sai marcado para o restaurante confirmar se entrega e por quanto — antes
 * disso, escolher o bairro era um beco sem saída.
 */
export const OUT_OF_AREA_ZONE = 'fora-da-area';

/**
 * Modo do pedido que vale para este restaurante. A preferência do cliente é
 * lembrada entre lojas, então pode chegar "entrega" numa loja que só faz
 * retirada — e o checkout pedia endereço e bairro sem ter como concluir.
 */
export function resolveOrderMode(business: Business, mode: OrderMode): OrderMode {
  if (mode === 'delivery' && !business.delivery.enabled && business.pickup.enabled) return 'pickup';
  if (mode === 'pickup' && !business.pickup.enabled && business.delivery.enabled) return 'delivery';
  return mode;
}

/**
 * Entrega sem taxa fechada: bairro fora da lista, ou restaurante que ainda não
 * cadastrou bairro nenhum. Nos dois casos o valor é combinado na conversa.
 */
export function isDeliveryToBeAgreed(business: Business, customer: CustomerData): boolean {
  if (customer.mode !== 'delivery') return false;
  // Cobrando por km, "a combinar" é o endereço longe demais. Enquanto o cliente
  // não cotou, a taxa não é combinada: ela é calculável, e o checkout pede o CEP.
  if (chargesByDistance(business)) {
    return customer.quote !== null && isOutOfRange(business, customer.quote.distanceKm);
  }
  return customer.zoneId === OUT_OF_AREA_ZONE || business.delivery.zones.length === 0;
}

/** Rótulos legíveis dos complementos escolhidos. */
export function describeSelections(item: MenuItem, selections: CartLineSelections) {
  const groups: { group: string; values: string[] }[] = [];
  for (const group of item.options) {
    const chosen = selections[group.id];
    if (chosen == null) continue;
    const ids = Array.isArray(chosen) ? chosen : [chosen];
    // Id repetido é quantidade: ['bacon', 'bacon'] vira "2x Bacon crocante".
    // Sem repetição a saída é a de sempre — a mensagem não muda para quem não usa.
    const counts = new Map<string, number>();
    for (const choiceId of ids) counts.set(choiceId, (counts.get(choiceId) ?? 0) + 1);
    const values: string[] = [];
    for (const [choiceId, count] of counts) {
      const name = group.choices.find((choice) => choice.id === choiceId)?.name;
      if (name) values.push(count > 1 ? `${count}x ${name}` : name);
    }
    if (values.length) groups.push({ group: group.name, values });
  }
  return groups;
}

/** Preço unitário = preço base + complementos escolhidos. */
export function calculateUnitPrice(item: MenuItem, selections: CartLineSelections): number {
  let total = item.price;
  for (const group of item.options) {
    const chosen = selections[group.id];
    if (chosen == null) continue;
    const ids = Array.isArray(chosen) ? chosen : [chosen];
    for (const choiceId of ids) {
      total += group.choices.find((choice) => choice.id === choiceId)?.price ?? 0;
    }
  }
  return total;
}

export interface OrderTotals {
  subtotal: number;
  deliveryFee: number;
  total: number;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** Sem I, L, O, 0 e 1: o número do pedido é lido em voz alta e redigitado na conversa. */
const ORDER_SUFFIX_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function randomOrderSuffix(): string {
  let suffix = '';
  for (let index = 0; index < 2; index += 1) {
    suffix += ORDER_SUFFIX_ALPHABET.charAt(Math.floor(Math.random() * ORDER_SUFFIX_ALPHABET.length));
  }
  return suffix;
}

/**
 * Número do pedido: data e hora no fuso do restaurante, mais um sufixo
 * sorteado. Sem servidor de pedidos não existe sequência, e só com a hora dois
 * clientes no mesmo minuto mandavam o mesmo número.
 */
export function buildOrderCode(
  date: Date,
  timeZone: string,
  suffix: string = randomOrderSuffix(),
): string {
  const { day, month, hour, minute } = getZonedDateParts(date, timeZone);
  return `${pad(day)}${pad(month)}-${pad(hour)}${pad(minute)}-${suffix}`;
}

/** Data de parede ("25/09/2026", "09/25/2026") sem passar por fuso de novo. */
function formatCalendarDate(year: number, month: number, day: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(Date.UTC(year, month - 1, day));
  } catch {
    return `${pad(day)}/${pad(month)}/${year}`;
  }
}

/**
 * Texto do pedido enviado ao WhatsApp do restaurante. Precisa ser legível
 * direto na conversa, sem depender do site. Sai no idioma de quem faz o
 * pedido (`text`); o preço continua em reais.
 */
export function buildOrderMessage(params: {
  business: Business;
  menu: MenuCategory[];
  cart: CartLine[];
  customer: CustomerData;
  totals: OrderTotals;
  /** Tradutor do namespace `ui` e idioma de quem pede (`useUiText()`). */
  text: UiText;
  scheduled?: boolean;
  now?: Date;
  /** Sufixo do número do pedido; sorteado quando omitido. Fixe em teste. */
  orderSuffix?: string;
}): string {
  const { business, menu, cart, customer, totals, scheduled } = params;
  const { t, locale } = params.text;
  const now = params.now ?? new Date();
  // A hora que o restaurante lê é a dele, não a do aparelho de quem pediu.
  const timeZone = timeZoneForState(business.address.state);
  const placed = getZonedDateParts(now, timeZone);
  const toBeAgreed = isDeliveryToBeAgreed(business, customer);
  // Sem bairros cadastrados não existe "fora da área": só falta combinar a taxa.
  // Cobrando por km, o "fora" existe sempre que o CEP passou do raio.
  const outOfArea =
    toBeAgreed && (chargesByDistance(business) || business.delivery.zones.length > 0);
  const lines: string[] = [];

  // Fora da área, o título avisa de cara que falta combinar a entrega — o
  // restaurante não pode ler isso como um pedido fechado.
  lines.push(
    outOfArea
      ? t('order.titleToConfirm', { business: business.name })
      : t('order.titleNew', { business: business.name }),
  );
  lines.push(
    t('order.header', {
      code: buildOrderCode(now, timeZone, params.orderSuffix),
      date: formatCalendarDate(placed.year, placed.month, placed.day, locale),
      time: formatClock(`${pad(placed.hour)}:${pad(placed.minute)}`, locale),
    }),
  );
  lines.push('');
  lines.push(t('order.items'));

  for (const line of cart) {
    lines.push(`${line.quantity}x ${line.name} — ${formatPrice(line.unitPrice * line.quantity)}`);
    const found = findItemById(menu, line.itemId);
    if (found) {
      for (const group of describeSelections(found.item, line.selections)) {
        lines.push(`   • ${group.group}: ${group.values.join(', ')}`);
      }
    }
    if (line.notes) lines.push(t('order.itemNotes', { notes: line.notes }));
  }

  lines.push('');
  lines.push(t('order.values'));
  lines.push(t('order.subtotal', { value: formatPrice(totals.subtotal) }));
  if (customer.mode === 'delivery') {
    const fee = totals.deliveryFee > 0 ? formatPrice(totals.deliveryFee) : t('order.free');
    lines.push(t('order.deliveryFee', { value: toBeAgreed ? t('order.toBeAgreed') : fee }));
  }
  lines.push(
    toBeAgreed
      ? t('order.totalPlusDelivery', { value: formatPrice(totals.subtotal) })
      : t('order.total', { value: formatPrice(totals.total) }),
  );

  lines.push('');
  lines.push(t('order.customer'));
  lines.push(t('order.name', { name: customer.name }));
  lines.push(t('order.whatsapp', { phone: maskPhone(customer.phone) }));

  lines.push('');
  if (customer.mode === 'delivery') {
    const zone = business.delivery.zones.find((entry) => entry.id === customer.zoneId);
    lines.push(t('order.delivery'));
    lines.push(
      t('order.address', {
        address:
          `${customer.street}, ${customer.number}` + (customer.complement ? ` — ${customer.complement}` : ''),
      }),
    );
    if (chargesByDistance(business) && customer.quote) {
      // O lojista confere de onde saiu a taxa sem ter que perguntar.
      lines.push(t('order.postalCode', { value: maskPostalCode(customer.quote.postalCode) }));
      if (customer.quote.label) lines.push(t('order.district', { value: customer.quote.label }));
      lines.push(t('order.distance', { distance: formatDistance(customer.quote.distanceKm, locale) }));
    } else {
      lines.push(t('order.district', { value: toBeAgreed ? customer.otherDistrict || '-' : (zone?.name ?? '-') }));
    }
    if (customer.reference) lines.push(t('order.reference', { value: customer.reference }));
    if (zone?.eta && !toBeAgreed) lines.push(t('order.eta', { value: zone.eta }));
    if (outOfArea && chargesByDistance(business)) {
      lines.push(t('order.outOfRadius'));
    } else if (outOfArea) {
      lines.push(t('order.outOfZones'));
    } else if (toBeAgreed) {
      lines.push(t('order.feeToBeAgreed'));
    }
  } else {
    lines.push(t('order.pickup'));
    const address = [business.address.street, business.address.district].filter(Boolean).join(' — ');
    if (address) lines.push(address);
    if (business.pickup.eta) lines.push(t('order.eta', { value: business.pickup.eta }));
  }

  if (customer.notes) {
    lines.push('');
    lines.push(t('order.notes'));
    lines.push(customer.notes);
  }

  if (scheduled) {
    lines.push('');
    lines.push(t('order.scheduled'));
  }

  return lines.join('\n');
}

export function whatsappUrl(phone: string, message: string): string {
  return `https://wa.me/${onlyDigits(phone)}?text=${encodeURIComponent(message)}`;
}

/** Taxa de entrega considerando frete grátis e o bairro escolhido. */
export function calculateDeliveryFee(business: Business, customer: CustomerData, subtotal: number): number {
  if (customer.mode !== 'delivery') return 0;
  const { freeAbove, zones } = business.delivery;
  if (freeAbove > 0 && subtotal >= freeAbove) return 0;
  if (chargesByDistance(business)) return quoteFee(business, customer.quote) ?? 0;
  return zones.find((zone) => zone.id === customer.zoneId)?.fee ?? 0;
}

/**
 * A taxa só é um número de verdade depois que o bairro entra — ou, na loja que
 * cobra por km, depois que o CEP foi cotado. Antes disso o total tem de dizer
 * que falta calcular, em vez de mostrar a entrega como zero.
 */
export function isDeliveryFeeKnown(
  business: Business,
  customer: CustomerData,
  subtotal: number,
): boolean {
  if (customer.mode !== 'delivery') return true;
  if (isDeliveryToBeAgreed(business, customer)) return false;
  const { freeAbove, zones } = business.delivery;
  if (freeAbove > 0 && subtotal >= freeAbove) return true;
  if (chargesByDistance(business)) return quoteFee(business, customer.quote) !== null;
  return zones.some((zone) => zone.id === customer.zoneId);
}
