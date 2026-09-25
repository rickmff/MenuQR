'use client';

import { usePathname, useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import {
  emitLayers,
  popLayers,
  pushLayer,
  readLayers,
  readLayersOnServer,
  replaceLayer,
  subscribeLayers,
  type Layer,
} from '@/components/store/nav-layers';
import { calculateTotals, createCartStore, type CartReview, type CartStore } from '@/lib/cart-store';
import { resolveOrderMode } from '@/lib/whatsapp';
import type { Business, CartLine, CustomerData, MenuCategory } from '@/lib/types';

export type CheckoutStep = 'cart' | 'checkout' | 'done';

interface StoreContextValue {
  business: Business;
  menu: MenuCategory[];
  /** Raiz dos links do cardápio: `/r/slug` no público, `/painel/previa` na prévia. */
  basePath: string;
  /** Dentro da moldura da prévia do painel (não na página pública). */
  embedded: boolean;
  /** Faixa extra do cardápio (o aviso do modo demonstração). */
  notice: ReactNode;
  cart: CartLine[];
  customer: CustomerData;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  deliveryFeeKnown: boolean;
  /** O que mudou no cardápio desde que a sacola foi montada. */
  review: CartReview | null;
  /** A sacola já foi lida do localStorage (antes disso ela está sempre vazia). */
  hydrated: boolean;
  isOpen: boolean;
  step: CheckoutStep;
  lastOrderUrl: string;
  searchOpen: boolean;
  search: string;
  aboutOpen: boolean;
  /** A capa saiu da tela: a barra compacta com o nome da loja aparece. */
  compactHeader: boolean;
  addItem: CartStore['addItem'];
  updateLine: CartStore['updateLine'];
  setQuantity: CartStore['setQuantity'];
  removeLine: CartStore['removeLine'];
  clearCart: CartStore['clearCart'];
  updateCustomer: (patch: Partial<CustomerData>) => void;
  dismissReview: () => void;
  openCart: (step?: CheckoutStep) => void;
  closeCart: () => void;
  /** Troca o passo da sacola pelo histórico (o voltar do sistema desfaz). */
  goToStep: (step: CheckoutStep) => void;
  /** Navega para o cardápio e abre a sacola quando ele estiver na tela. */
  openCartAfterNav: () => void;
  setLastOrderUrl: (url: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
  setSearch: (value: string) => void;
  openAbout: () => void;
  closeAbout: () => void;
  setCompactHeader: (compact: boolean) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);
/** O store da sacola, estável: para quem só lê um pedaço dela (ver `useCartSelector`). */
const CartStoreContext = createContext<CartStore | null>(null);
/**
 * Verdadeiro um quadro depois de a sacola ser lida do localStorage. O que
 * aparece ANTES disso (a barra, os badges e as pílulas de quem recarrega com a
 * sacola cheia) não anima a entrada: a pessoa não fez nada. Vale só como valor
 * inicial de quem monta — ver `useMountAnimation`.
 */
const SettledContext = createContext(false);

// ------------------------------------------------------- sessionStorage
// O link do último pedido fica na sessão da aba: quem volta do WhatsApp para
// esta página (o pop-up bloqueado navega a própria aba) ainda encontra o
// "Abrir o WhatsApp novamente". Nenhuma chave de localStorage muda.
const sessionListeners = new Set<() => void>();
function subscribeSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}
function readSession(key: string): string {
  try {
    return window.sessionStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function writeSession(key: string, value: string) {
  try {
    if (value) window.sessionStorage.setItem(key, value);
    else window.sessionStorage.removeItem(key);
  } catch {
    /* sessão indisponível: o link só não sobrevive a recarregar */
  }
  for (const listener of sessionListeners) listener();
}
const emptyOnServer = () => '';

const noopSubscribe = () => () => {};

/**
 * Estado do cardápio de um restaurante: os dados do carrinho ficam num store
 * externo por negócio (isolado no localStorage e sincronizado entre abas); a
 * Sacola, os passos dela e a busca são camadas no histórico (`nav-layers.ts`)
 * — abrir empurra uma entrada, e o voltar do sistema fecha a de cima.
 *
 * `history={false}` desliga as camadas: as vitrines da landing montam a loja
 * só para mostrar, e não podem mexer no histórico da página.
 */
export function StoreProvider({
  business,
  menu,
  basePath = `/r/${business.slug}`,
  embedded = false,
  history = true,
  notice = null,
  children,
}: {
  business: Business;
  menu: MenuCategory[];
  basePath?: string;
  embedded?: boolean;
  history?: boolean;
  notice?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [store] = useState<CartStore>(() => createCartStore(business.id, menu));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const hydrated = snapshot !== store.getServerSnapshot();
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    if (!hydrated || settled) return;
    const frame = window.requestAnimationFrame(() => setSettled(true));
    return () => window.cancelAnimationFrame(frame);
  }, [hydrated, settled]);

  const layers = useSyncExternalStore(
    history ? subscribeLayers : noopSubscribe,
    history ? readLayers : readLayersOnServer,
    readLayersOnServer,
  );
  const isOpen = layers.includes('cart');
  const step: CheckoutStep = layers.includes('done') ? 'done' : layers.includes('checkout') ? 'checkout' : 'cart';
  const searchOpen = layers.includes('search');

  const lastOrderKey = `menuqr.lastOrder.${business.id}`;
  const lastOrderUrl = useSyncExternalStore(subscribeSession, () => readSession(lastOrderKey), emptyOnServer);

  const [search, setSearch] = useState('');
  const [aboutOpen, setAboutOpen] = useState(false);
  // Nasce flutuante em todo lugar, prévia inclusive: quem liga a barra é o
  // observador da identidade (StoreIdentity) quando a capa sai da tela.
  const [compactHeader, setCompactHeader] = useState(false);

  // A busca é apagada quando a camada dela sai (Cancelar, voltar do sistema) —
  // mas não quando a pessoa só abriu um prato a partir dos resultados: aí a
  // camada some com a navegação e volta com o voltar, e o termo tem de estar lá.
  const [seen, setSeen] = useState({ searchOpen, pathname });
  if (seen.searchOpen !== searchOpen || seen.pathname !== pathname) {
    if (seen.searchOpen && !searchOpen && seen.pathname === pathname) setSearch('');
    setSeen({ searchOpen, pathname });
  }

  // Entradas criadas pelo próprio Next (Link, router.push/back) não disparam
  // nada que as camadas escutem: relê o histórico a cada troca de rota. O
  // HistoryUpdater do Next grava num useInsertionEffect, antes deste efeito.
  const pendingCart = useRef(false);
  useEffect(() => {
    if (!history) return;
    if (pendingCart.current && pathname === basePath) {
      pendingCart.current = false;
      pushLayer('cart');
    }
    emitLayers();
  }, [history, pathname, basePath]);

  // Enviado → voltar do sistema cai na Sacola, agora vazia. Não há o que ver
  // ali: volta mais uma e a pessoa está no cardápio.
  const previousLayers = useRef<readonly Layer[]>(layers);
  const cartEmpty = snapshot.cart.length === 0;
  useEffect(() => {
    const previous = previousLayers.current;
    previousLayers.current = layers;
    if (!history) return;
    if (previous[previous.length - 1] === 'done' && layers[layers.length - 1] === 'cart' && cartEmpty) {
      popLayers(1);
    }
  }, [history, layers, cartEmpty]);

  // Trava a rolagem do fundo enquanto a sacola estiver aberta.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  const openCart = useCallback(
    (next: CheckoutStep = 'cart') => {
      if (!history) return;
      if (!readLayers().includes('cart')) pushLayer('cart');
      if (next === 'checkout') pushLayer('checkout');
    },
    [history],
  );

  const closeCart = useCallback(() => {
    if (!history) return;
    const current = readLayers();
    const index = current.indexOf('cart');
    if (index >= 0) popLayers(current.length - index);
  }, [history]);

  const goToStep = useCallback(
    (next: CheckoutStep) => {
      if (!history) return;
      const current = readLayers();
      const top = current[current.length - 1];
      if (next === 'checkout') pushLayer('checkout');
      else if (next === 'done') {
        if (top === 'checkout') replaceLayer('done');
        else pushLayer('done');
      } else if (top === 'checkout' || top === 'done') popLayers(1);
    },
    [history],
  );

  const openCartAfterNav = useCallback(() => {
    pendingCart.current = true;
    router.replace(basePath);
  }, [router, basePath]);

  const openSearch = useCallback(() => {
    if (history) pushLayer('search');
  }, [history]);

  const closeSearch = useCallback(() => {
    if (!history) return;
    const current = readLayers();
    if (current[current.length - 1] === 'search') popLayers(1);
  }, [history]);

  const setLastOrderUrl = useCallback((url: string) => writeSession(lastOrderKey, url), [lastOrderKey]);
  const openAbout = useCallback(() => setAboutOpen(true), []);
  const closeAbout = useCallback(() => setAboutOpen(false), []);

  const value = useMemo<StoreContextValue>(() => {
    // O modo lembrado de outra loja só vale se esta também trabalhar com ele.
    const customer = {
      ...snapshot.customer,
      mode: resolveOrderMode(business, snapshot.customer.mode),
    };
    const totals = calculateTotals(business, { ...snapshot, customer });
    return {
      business,
      menu,
      basePath,
      embedded,
      notice,
      cart: snapshot.cart,
      customer,
      review: snapshot.review,
      ...totals,
      hydrated,
      isOpen,
      step,
      lastOrderUrl,
      searchOpen,
      search,
      aboutOpen,
      compactHeader,
      addItem: store.addItem,
      updateLine: store.updateLine,
      setQuantity: store.setQuantity,
      removeLine: store.removeLine,
      clearCart: store.clearCart,
      updateCustomer: store.updateCustomer,
      dismissReview: store.dismissReview,
      openCart,
      closeCart,
      goToStep,
      openCartAfterNav,
      setLastOrderUrl,
      openSearch,
      closeSearch,
      setSearch,
      openAbout,
      closeAbout,
      setCompactHeader,
    };
  }, [
    business,
    menu,
    basePath,
    embedded,
    notice,
    snapshot,
    store,
    hydrated,
    isOpen,
    step,
    lastOrderUrl,
    searchOpen,
    search,
    aboutOpen,
    compactHeader,
    openCart,
    closeCart,
    goToStep,
    openCartAfterNav,
    setLastOrderUrl,
    openSearch,
    closeSearch,
    openAbout,
    closeAbout,
  ]);

  return (
    <CartStoreContext.Provider value={store}>
      <SettledContext.Provider value={settled}>
        <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
      </SettledContext.Provider>
    </CartStoreContext.Provider>
  );
}

/**
 * Se o componente que está montando agora deve animar a entrada. A resposta é
 * congelada na montagem: quem montou na carga da página não anima nem depois.
 */
export function useMountAnimation(): boolean {
  const settled = useContext(SettledContext);
  const [animate] = useState(settled);
  return animate;
}

export function useStore(): StoreContextValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore precisa estar dentro de <StoreProvider>.');
  return context;
}

/**
 * Lê um pedaço da sacola sem re-renderizar a cada mudança dela: devolva um
 * valor primitivo (a quantidade de UM item, por exemplo) e o componente só
 * renderiza de novo quando esse valor mudar. É o que evita repintar a lista
 * inteira do cardápio a cada toque no "+".
 */
export function useCartSelector<T>(select: (cart: CartLine[]) => T): T {
  const store = useContext(CartStoreContext);
  if (!store) throw new Error('useCartSelector precisa estar dentro de <StoreProvider>.');
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.getSnapshot().cart),
    () => select(store.getServerSnapshot().cart),
  );
}

/** O store da sacola (estável), para as ações sem assinar o contexto inteiro. */
export function useCartStore(): CartStore {
  const store = useContext(CartStoreContext);
  if (!store) throw new Error('useCartStore precisa estar dentro de <StoreProvider>.');
  return store;
}
