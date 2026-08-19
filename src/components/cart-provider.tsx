'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import * as store from '@/lib/cart-store';
import type { CartLine, CartLineSelections, CustomerData } from '@/lib/types';

export type CheckoutStep = 'cart' | 'checkout' | 'done';

interface CartContextValue {
  cart: CartLine[];
  customer: CustomerData;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  isOpen: boolean;
  step: CheckoutStep;
  lastOrderUrl: string;
  addItem: (itemId: string, quantity: number, selections: CartLineSelections, notes: string) => void;
  setQuantity: (uid: string, quantity: number) => void;
  removeLine: (uid: string) => void;
  clearCart: () => void;
  updateCustomer: (patch: Partial<CustomerData>) => void;
  openCart: (step?: CheckoutStep) => void;
  closeCart: () => void;
  setStep: (step: CheckoutStep) => void;
  setLastOrderUrl: (url: string) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Estado do carrinho: os dados ficam num store externo (sincronizado com o
 * localStorage e entre abas) e o contexto cuida apenas do estado da interface.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<CheckoutStep>('cart');
  const [lastOrderUrl, setLastOrderUrl] = useState('');

  // Trava a rolagem do fundo enquanto a gaveta estiver aberta.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const openCart = useCallback((next: CheckoutStep = 'cart') => {
    setStep(next);
    setIsOpen(true);
  }, []);

  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const totals = store.calculateTotals(snapshot);
    return {
      cart: snapshot.cart,
      customer: snapshot.customer,
      ...totals,
      isOpen,
      step,
      lastOrderUrl,
      addItem: store.addItem,
      setQuantity: store.setQuantity,
      removeLine: store.removeLine,
      clearCart: store.clearCart,
      updateCustomer: store.updateCustomer,
      openCart,
      closeCart,
      setStep,
      setLastOrderUrl,
    };
  }, [snapshot, isOpen, step, lastOrderUrl, openCart, closeCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart precisa estar dentro de <CartProvider>.');
  return context;
}
