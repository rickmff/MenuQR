import { formatPrice, maskPhone, onlyDigits, parseMoney } from './format';
import { getZonedDateParts, timeZoneForState } from './hours';
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
  return customer.zoneId === OUT_OF_AREA_ZONE || business.delivery.zones.length === 0;
}

/** Rótulos legíveis dos complementos escolhidos. */
export function describeSelections(item: MenuItem, selections: CartLineSelections) {
  const groups: { group: string; values: string[] }[] = [];
  for (const group of item.options) {
    const chosen = selections[group.id];
    if (chosen == null) continue;
    const ids = Array.isArray(chosen) ? chosen : [chosen];
    const values = ids
      .map((choiceId) => group.choices.find((choice) => choice.id === choiceId)?.name)
      .filter((name): name is string => Boolean(name));
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

/**
 * Texto do pedido enviado ao WhatsApp do restaurante. Precisa ser legível
 * direto na conversa, sem depender do site.
 */
export function buildOrderMessage(params: {
  business: Business;
  menu: MenuCategory[];
  cart: CartLine[];
  customer: CustomerData;
  totals: OrderTotals;
  scheduled?: boolean;
  now?: Date;
  /** Sufixo do número do pedido; sorteado quando omitido. Fixe em teste. */
  orderSuffix?: string;
}): string {
  const { business, menu, cart, customer, totals, scheduled } = params;
  const now = params.now ?? new Date();
  // A hora que o restaurante lê é a dele, não a do aparelho de quem pediu.
  const timeZone = timeZoneForState(business.address.state);
  const placed = getZonedDateParts(now, timeZone);
  const toBeAgreed = isDeliveryToBeAgreed(business, customer);
  // Sem bairros cadastrados não existe "fora da área": só falta combinar a taxa.
  const outOfArea = toBeAgreed && business.delivery.zones.length > 0;
  const lines: string[] = [];

  // Fora da área, o título avisa de cara que falta combinar a entrega — o
  // restaurante não pode ler isso como um pedido fechado.
  lines.push(outOfArea ? `*PEDIDO A CONFIRMAR — ${business.name}*` : `*NOVO PEDIDO — ${business.name}*`);
  lines.push(
    `Pedido #${buildOrderCode(now, timeZone, params.orderSuffix)} · ` +
      `${pad(placed.day)}/${pad(placed.month)}/${placed.year} às ${pad(placed.hour)}:${pad(placed.minute)}`,
  );
  lines.push('');
  lines.push('*🧾 Itens*');

  for (const line of cart) {
    lines.push(`${line.quantity}x ${line.name} — ${formatPrice(line.unitPrice * line.quantity)}`);
    const found = findItemById(menu, line.itemId);
    if (found) {
      for (const group of describeSelections(found.item, line.selections)) {
        lines.push(`   • ${group.group}: ${group.values.join(', ')}`);
      }
    }
    if (line.notes) lines.push(`   • Obs.: ${line.notes}`);
  }

  lines.push('');
  lines.push('*💰 Valores*');
  lines.push(`Subtotal: ${formatPrice(totals.subtotal)}`);
  if (customer.mode === 'delivery') {
    const fee = totals.deliveryFee > 0 ? formatPrice(totals.deliveryFee) : 'Grátis';
    lines.push(`Entrega: ${toBeAgreed ? 'a combinar' : fee}`);
  }
  lines.push(
    toBeAgreed
      ? `*Total: ${formatPrice(totals.subtotal)} + entrega*`
      : `*Total: ${formatPrice(totals.total)}*`,
  );

  lines.push('');
  lines.push('*👤 Cliente*');
  lines.push(`Nome: ${customer.name}`);
  lines.push(`WhatsApp: ${maskPhone(customer.phone)}`);

  lines.push('');
  if (customer.mode === 'delivery') {
    const zone = business.delivery.zones.find((entry) => entry.id === customer.zoneId);
    lines.push('*🛵 Entrega*');
    lines.push(
      `Endereço: ${customer.street}, ${customer.number}` +
        (customer.complement ? ` — ${customer.complement}` : ''),
    );
    lines.push(`Bairro: ${toBeAgreed ? customer.otherDistrict || '-' : (zone?.name ?? '-')}`);
    if (customer.reference) lines.push(`Referência: ${customer.reference}`);
    if (zone?.eta && !toBeAgreed) lines.push(`Previsão: ${zone.eta}`);
    if (outOfArea) {
      lines.push('⚠️ Bairro fora da lista de entrega — confirme se atende e qual a taxa.');
    } else if (toBeAgreed) {
      lines.push('⚠️ Taxa de entrega a combinar — informe o valor ao cliente.');
    }
  } else {
    lines.push('*🏠 Retirada no local*');
    const address = [business.address.street, business.address.district].filter(Boolean).join(' — ');
    if (address) lines.push(address);
    if (business.pickup.eta) lines.push(`Previsão: ${business.pickup.eta}`);
  }

  lines.push('');
  lines.push('*💳 Pagamento*');
  lines.push(customer.payment || 'A combinar');
  if (customer.payment === 'Dinheiro') {
    const change = parseMoney(customer.changeFor);
    lines.push(
      change > totals.total
        ? `Troco para ${formatPrice(change)} (levar ${formatPrice(change - totals.total)})`
        : 'Não precisa de troco',
    );
  }
  if (customer.payment === 'Pix' && business.pixKey) {
    lines.push(`Chave Pix: ${business.pixKey}`);
  }

  if (customer.notes) {
    lines.push('');
    lines.push('*📝 Observações*');
    lines.push(customer.notes);
  }

  if (scheduled) {
    lines.push('');
    lines.push('_Pedido enviado com a loja fechada — favor confirmar o horário._');
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
  return zones.find((zone) => zone.id === customer.zoneId)?.fee ?? 0;
}

/**
 * A taxa só é um número de verdade depois que o bairro entra (ou quando o
 * subtotal já garante frete grátis). Antes disso o total tem de dizer que
 * falta calcular, em vez de mostrar a entrega como zero.
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
  return zones.some((zone) => zone.id === customer.zoneId);
}
