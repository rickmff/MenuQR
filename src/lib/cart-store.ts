import { calculateDeliveryFee, calculateUnitPrice, isDeliveryFeeKnown } from './whatsapp';
import { findItemById } from './menu-utils';
import type { Business, CartLine, CartLineSelections, CustomerData, MenuCategory } from './types';

export const emptyCustomer: CustomerData = {
  name: '',
  phone: '',
  mode: 'delivery',
  zoneId: '',
  otherDistrict: '',
  street: '',
  number: '',
  complement: '',
  reference: '',
  payment: '',
  changeFor: '',
  notes: '',
};

/** O que mudou no cardápio desde que a sacola foi montada. */
export interface CartReview {
  /** Itens que saíram do cardápio. */
  removed: string[];
  /** Itens que o restaurante marcou como esgotados. */
  soldOut: string[];
  /** Itens que continuam à venda, mas por outro preço. */
  repriced: { name: string; from: number; to: number }[];
}

export interface CartState {
  cart: CartLine[];
  customer: CustomerData;
  /** Aviso da última reconciliação; some quando o cliente o dispensa. */
  review: CartReview | null;
}

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  /** false enquanto falta escolher o bairro: o total ainda não fecha. */
  deliveryFeeKnown: boolean;
}

export interface CartStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => CartState;
  getServerSnapshot: () => CartState;
  addItem: (itemId: string, quantity: number, selections: CartLineSelections, notes: string) => void;
  setQuantity: (uid: string, quantity: number) => void;
  removeLine: (uid: string) => void;
  clearCart: () => void;
  updateCustomer: (patch: Partial<CustomerData>) => void;
  dismissReview: () => void;
}

/**
 * Snapshot usado na renderização do servidor e na hidratação: sempre vazio,
 * porque o carrinho vive no navegador de cada cliente. Depois de hidratar,
 * o React troca para o snapshot real, sem divergência de HTML.
 */
const serverState: CartState = Object.freeze({ cart: [], customer: emptyCustomer, review: null });

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

/**
 * Reconfere a sacola guardada contra o cardápio de agora.
 *
 * A sacola sobrevive no localStorage por dias, e o cardápio muda no meio. Sem
 * isto, o cliente pede no preço de ontem, ou pede um prato que acabou ou que
 * nem existe mais — e só descobre pela conversa no WhatsApp.
 */
export function reviewCart(
  menu: MenuCategory[],
  cart: CartLine[],
): { cart: CartLine[]; review: CartReview | null } {
  const removed: string[] = [];
  const soldOut: string[] = [];
  const repriced: CartReview['repriced'] = [];
  const kept: CartLine[] = [];

  for (const line of cart) {
    const found = findItemById(menu, line.itemId);
    if (!found) {
      removed.push(line.name);
      continue;
    }
    if (!found.item.available) {
      soldOut.push(found.item.name);
      continue;
    }

    // O preço é recalculado com os complementos escolhidos, não só o do prato.
    const unitPrice = calculateUnitPrice(found.item, line.selections);
    if (unitPrice !== line.unitPrice) {
      repriced.push({ name: found.item.name, from: line.unitPrice, to: unitPrice });
    }
    kept.push({ ...line, name: found.item.name, unitPrice });
  }

  const changed = removed.length > 0 || soldOut.length > 0 || repriced.length > 0;
  return { cart: kept, review: changed ? { removed, soldOut, repriced } : null };
}

/**
 * Cria um carrinho isolado por restaurante: cada negócio tem a própria chave no
 * localStorage, então pedidos de lojas diferentes nunca se misturam.
 */
export function createCartStore(businessId: string, menu: MenuCategory[]): CartStore {
  const cartKey = `menuqr.cart.${businessId}`;
  const customerKey = 'menuqr.customer';

  let state: CartState = serverState;
  let loaded = false;
  const listeners = new Set<() => void>();

  const read = <T>(key: string, fallback: T): T => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };

  const load = () => {
    const stored = read<CartLine[]>(cartKey, []);
    const { cart, review } = reviewCart(menu, stored);
    state = {
      cart,
      customer: { ...emptyCustomer, ...read<Partial<CustomerData>>(customerKey, {}) },
      review,
    };
    // O que foi corrigido já vale para a próxima visita.
    if (review) persist();
  };

  const persist = () => {
    try {
      window.localStorage.setItem(cartKey, JSON.stringify(state.cart));
      // Troco e observações não são lembrados entre pedidos.
      const { changeFor, notes, ...customer } = state.customer;
      void changeFor;
      void notes;
      window.localStorage.setItem(customerKey, JSON.stringify(customer));
    } catch {
      /* navegação privada ou cota cheia: seguimos sem persistir */
    }
  };

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const update = (next: CartState) => {
    state = next;
    persist();
    emit();
  };

  return {
    subscribe(listener) {
      if (!loaded) {
        load();
        loaded = true;
      }
      listeners.add(listener);

      // Mantém as abas abertas em sincronia com o mesmo carrinho.
      const onStorage = (event: StorageEvent) => {
        if (event.key === cartKey || event.key === customerKey) {
          load();
          emit();
        }
      };
      window.addEventListener('storage', onStorage);

      return () => {
        listeners.delete(listener);
        window.removeEventListener('storage', onStorage);
      };
    },

    getSnapshot: () => state,
    getServerSnapshot: () => serverState,

    addItem(itemId, quantity, selections, notes) {
      const found = findItemById(menu, itemId);
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
              quantity: amount,
              unitPrice: calculateUnitPrice(found.item, selections),
              selections,
              notes: notes.trim(),
            },
          ];

      update({ ...state, cart });
    },

    setQuantity(uid, quantity) {
      const cart =
        quantity <= 0
          ? state.cart.filter((line) => line.uid !== uid)
          : state.cart.map((line) => (line.uid === uid ? { ...line, quantity } : line));
      update({ ...state, cart });
    },

    removeLine(uid) {
      update({ ...state, cart: state.cart.filter((line) => line.uid !== uid) });
    },

    clearCart() {
      update({ ...state, cart: [] });
    },

    updateCustomer(patch) {
      update({ ...state, customer: { ...state.customer, ...patch } });
    },

    dismissReview() {
      if (!state.review) return;
      update({ ...state, review: null });
    },
  };
}

/** Totais derivados do carrinho, do bairro escolhido e das regras do negócio. */
export function calculateTotals(business: Business, state: CartState): CartTotals {
  const itemCount = state.cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = state.cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const deliveryFee = calculateDeliveryFee(business, state.customer, subtotal);
  return {
    itemCount,
    subtotal,
    deliveryFee,
    total: subtotal + deliveryFee,
    deliveryFeeKnown: isDeliveryFeeKnown(business, state.customer, subtotal),
  };
}
