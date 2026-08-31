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
import { calculateTotals, createCartStore, type CartReview, type CartStore } from '@/lib/cart-store';
import type { Business, CartLine, CustomerData, MenuCategory } from '@/lib/types';

export type CheckoutStep = 'cart' | 'checkout' | 'done';

interface StoreContextValue {
  business: Business;
  menu: MenuCategory[];
  cart: CartLine[];
  customer: CustomerData;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryFeeKnown: boolean;
  /** O que mudou no cardápio desde que a sacola foi montada. */
  review: CartReview | null;
  isOpen: boolean;
  step: CheckoutStep;
  lastOrderUrl: string;
  addItem: CartStore['addItem'];
  setQuantity: CartStore['setQuantity'];
  removeLine: CartStore['removeLine'];
  clearCart: CartStore['clearCart'];
  updateCustomer: (patch: Partial<CustomerData>) => void;
  dismissReview: () => void;
  openCart: (step?: CheckoutStep) => void;
  closeCart: () => void;
  setStep: (step: CheckoutStep) => void;
  setLastOrderUrl: (url: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

/**
 * Estado do cardápio de um restaurante: os dados do carrinho ficam num store
 * externo por negócio (isolado no localStorage e sincronizado entre abas) e o
 * contexto cuida apenas do estado da interface.
 */
export function StoreProvider({
  business,
  menu,
  children,
}: {
  business: Business;
  menu: MenuCategory[];
  children: ReactNode;
}) {
  const [store] = useState<CartStore>(() => createCartStore(business.id, menu));
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

  const value = useMemo<StoreContextValue>(() => {
    const totals = calculateTotals(business, snapshot);
    return {
      business,
      menu,
      cart: snapshot.cart,
      customer: snapshot.customer,
      review: snapshot.review,
      ...totals,
      isOpen,
      step,
      lastOrderUrl,
      addItem: store.addItem,
      setQuantity: store.setQuantity,
      removeLine: store.removeLine,
      clearCart: store.clearCart,
      updateCustomer: store.updateCustomer,
      dismissReview: store.dismissReview,
      openCart,
      closeCart,
      setStep,
      setLastOrderUrl,
    };
  }, [business, menu, snapshot, store, isOpen, step, lastOrderUrl, openCart, closeCart]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore precisa estar dentro de <StoreProvider>.');
  return context;
}
