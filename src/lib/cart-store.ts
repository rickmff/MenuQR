import { getItemById } from './menu';
import { restaurant } from './restaurant';
import { calculateUnitPrice } from './whatsapp';
import type { CartLine, CartLineSelections, CustomerData } from './types';

const CART_KEY = 'menuqr.cart.v1';
const CUSTOMER_KEY = 'menuqr.customer.v1';

export const emptyCustomer: CustomerData = {
  name: '',
  phone: '',
  mode: 'delivery',
  zoneId: '',
  street: '',
  number: '',
  complement: '',
  reference: '',
  payment: '',
  changeFor: '',
  notes: '',
};

export interface CartState {
  cart: CartLine[];
  customer: CustomerData;
}

/**
 * Snapshot usado na renderização do servidor e na hidratação: sempre vazio,
 * porque o carrinho vive no navegador de cada cliente. Depois de hidratar,
 * o React troca para o snapshot real sem risco de divergência de HTML.
 */
const serverState: CartState = Object.freeze({ cart: [], customer: emptyCustomer });

let state: CartState = serverState;
let loaded = false;
const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist() {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    // Troco e observações não são lembrados entre pedidos.
    const { changeFor, notes, ...customer } = state.customer;
    void changeFor;
    void notes;
    window.localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customer));
  } catch {
    /* navegação privada ou cota cheia: seguimos sem persistir */
  }
}

function loadFromStorage() {
  state = {
    cart: read<CartLine[]>(CART_KEY, []),
    customer: { ...emptyCustomer, ...read<Partial<CustomerData>>(CUSTOMER_KEY, {}) },
  };
}

function emit() {
  for (const listener of listeners) listener();
}

function update(next: CartState) {
  state = next;
  persist();
  emit();
}

export function subscribe(listener: () => void): () => void {
  if (!loaded) {
    loadFromStorage();
    loaded = true;
  }
  listeners.add(listener);

  // Mantém as abas abertas em sincronia com o mesmo carrinho.
  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_KEY || event.key === CUSTOMER_KEY) {
      loadFromStorage();
      emit();
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function getSnapshot(): CartState {
  return state;
}

export function getServerSnapshot(): CartState {
  return serverState;
}

/** Assinatura usada para juntar linhas idênticas do carrinho. */
function signatureOf(itemId: string, selections: CartLineSelections, notes: string): string {
  const parts = Object.keys(selections)
    .sort()
    .map((groupId) => {
      const chosen = selections[groupId];
      const ids = Array.isArray(chosen) ? [...chosen].sort() : [chosen];
      return `${groupId}:${ids.join('+')}`;
    });
  return `${itemId}|${parts.join('|')}|${notes.trim().toLowerCase()}`;
}

export function addItem(
  itemId: string,
  quantity: number,
  selections: CartLineSelections,
  notes: string,
) {
  const found = getItemById(itemId);
  if (!found) return;

  const amount = Math.max(1, Math.trunc(quantity) || 1);
  const signature = signatureOf(itemId, selections, notes);
  const existing = state.cart.find((line) => line.signature === signature);

  const cart = existing
    ? state.cart.map((line) =>
        line.signature === signature ? { ...line, quantity: line.quantity + amount } : line,
      )
    : [
        ...state.cart,
        {
          uid: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          signature,
          itemId,
          name: found.item.name,
          slug: `${found.category.slug}/${found.item.slug}`,
          quantity: amount,
          unitPrice: calculateUnitPrice(found.item, selections),
          selections,
          notes: notes.trim(),
        },
      ];

  update({ ...state, cart });
}

export function setQuantity(uid: string, quantity: number) {
  const cart =
    quantity <= 0
      ? state.cart.filter((line) => line.uid !== uid)
      : state.cart.map((line) => (line.uid === uid ? { ...line, quantity } : line));
  update({ ...state, cart });
}

export function removeLine(uid: string) {
  update({ ...state, cart: state.cart.filter((line) => line.uid !== uid) });
}

export function clearCart() {
  update({ ...state, cart: [] });
}

export function updateCustomer(patch: Partial<CustomerData>) {
  update({ ...state, customer: { ...state.customer, ...patch } });
}

/** Totais derivados do carrinho e do bairro escolhido. */
export function calculateTotals(current: CartState) {
  const itemCount = current.cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = current.cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  let deliveryFee = 0;
  if (current.customer.mode === 'delivery') {
    const { freeAbove, zones } = restaurant.delivery;
    const zone = zones.find((entry) => entry.id === current.customer.zoneId);
    deliveryFee = freeAbove > 0 && subtotal >= freeAbove ? 0 : (zone?.fee ?? 0);
  }

  return { itemCount, subtotal, deliveryFee, total: subtotal + deliveryFee };
}
