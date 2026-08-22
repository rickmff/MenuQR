import { formatPrice, maskPhone, onlyDigits, parseMoney } from './format';
import { findItemById } from './menu-utils';
import type {
  Business,
  CartLine,
  CartLineSelections,
  CustomerData,
  MenuCategory,
  MenuItem,
} from './types';

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

export function buildOrderCode(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getDate())}${pad(date.getMonth() + 1)}-${pad(date.getHours())}${pad(date.getMinutes())}`;
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
}): string {
  const { business, menu, cart, customer, totals, scheduled } = params;
  const now = params.now ?? new Date();
  const lines: string[] = [];

  lines.push(`*NOVO PEDIDO — ${business.name}*`);
  lines.push(
    `Pedido #${buildOrderCode(now)} · ${now.toLocaleDateString('pt-BR')} às ` +
      now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
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
    lines.push(`Entrega: ${totals.deliveryFee > 0 ? formatPrice(totals.deliveryFee) : 'Grátis'}`);
  }
  lines.push(`*Total: ${formatPrice(totals.total)}*`);

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
    lines.push(`Bairro: ${zone?.name ?? '-'}`);
    if (customer.reference) lines.push(`Referência: ${customer.reference}`);
    if (zone?.eta) lines.push(`Previsão: ${zone.eta}`);
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
