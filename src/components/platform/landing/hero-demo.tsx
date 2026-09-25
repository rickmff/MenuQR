'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CartBar } from '@/components/store/cart-bar';
import { MenuBrowser } from '@/components/store/menu-browser';
import { ScrollRootContext } from '@/components/store/scroll-root';
import { StoreCover } from '@/components/store/store-cover';
import { StoreHeader } from '@/components/store/store-header';
import { StoreIdentity } from '@/components/store/store-identity';
import { StoreProvider, useStore } from '@/components/store/store-provider';
import { calculateTotals, emptyCustomer } from '@/lib/cart-store';
import { sampleBusiness, sampleMenu } from '@/lib/demo/sample-data';
import { toCardCategory } from '@/lib/menu-utils';
import type { Business, CustomerData, MenuCategory } from '@/lib/types';
import { buildOrderMessage } from '@/lib/whatsapp';
import { useUiText } from '@/lib/use-ui-text';
import { EASE_OUT, SPRING } from './motion';

/**
 * O produto rodando sozinho: a MESMA tela do cardápio público (capa,
 * identidade, abas fixas, cards com descrição e selo), montada com os
 * componentes da loja dentro de um aparelho que rola por dentro — como a
 * prévia do painel. Um cursor rola até a lista, adiciona dois pratos, a barra
 * da sacola sobe e a bolha mostra a mensagem que `buildOrderMessage` gera de
 * verdade para essa sacola.
 *
 * A loja recebe outro id para a sacola da demo ficar isolada da sacola real do
 * cardápio de exemplo no localStorage.
 */
const business: Business = { ...sampleBusiness, id: 'landing-hero' };
const menu: MenuCategory[] = sampleMenu
  .filter((category) => category.items.length > 0)
  .slice(0, 3)
  .map((category) => ({
    ...category,
    // Sem complementos obrigatórios todo prato ganha o "+" de adição rápida,
    // que é o que o cursor aperta. Descrição e selo ficam: são o card de hoje.
    items: category.items.slice(0, 4).map((item) => ({ ...item, options: [] })),
  }));
const cards = menu.map(toCardCategory);
/** Os dois pratos que o cursor adiciona: os dois primeiros da primeira categoria. */
const PICKS = [0, 1];
const customer: CustomerData = {
  ...emptyCustomer,
  name: 'Ana',
  phone: '11987654321',
  mode: 'delivery',
  zoneId: business.delivery.zones[0]?.id ?? '',
  street: 'Rua das Flores',
  number: '120',
};
/** Fixo no carregamento do módulo: a mensagem não muda a cada render. */
const DEMO_NOW = new Date();

export function HeroDemo() {
  return (
    <StoreProvider history={false} embedded business={business} menu={menu} basePath={`/r/${business.slug}`}>
      <Stage />
    </StoreProvider>
  );
}

function Stage() {
  const { addItem, cart, clearCart } = useStore();
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [cursor, setCursor] = useState({ x: 300, y: 520, visible: false, pressed: false });
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timers.push(window.setTimeout(resolve, reduced ? 0 : ms));
      });
    const pointTo = (element: Element) => {
      const stage = stageRef.current?.getBoundingClientRect();
      if (!stage || reduced) return;
      const rect = element.getBoundingClientRect();
      setCursor({
        x: rect.left - stage.left + rect.width / 2,
        y: rect.top - stage.top + rect.height / 2,
        visible: true,
        pressed: false,
      });
    };
    /** Os "+" dos cards, pela estrutura e não pelo rótulo, que muda com o idioma. */
    const addButtons = () =>
      Array.from(scrollRef.current?.querySelectorAll<HTMLButtonElement>('ul > li > div > button') ?? []);

    const run = async () => {
      const root = scrollRef.current;
      // Na volta do loop a lista sobe até a capa, em vez de saltar para ela.
      const looping = Boolean(root && root.scrollTop > 0);
      root?.scrollTo({ top: 0, behavior: looping && !reduced ? 'smooth' : 'instant' });
      clearCart();
      // Primeiro a loja como o cliente a abre: capa, nome, horário, entrega.
      await wait(looping ? 2200 : 1600);
      if (cancelled || !root) return;
      // Depois a rolagem até a lista: a barra compacta e as abas fixas entram
      // sozinhas, pelos mesmos observadores do cardápio de verdade. O primeiro
      // card para logo abaixo das abas.
      const first = addButtons()[0]?.closest('li');
      if (first) {
        const offset = first.getBoundingClientRect().top - root.getBoundingClientRect().top;
        root.scrollTo({ top: root.scrollTop + offset - 112, behavior: reduced ? 'instant' : 'smooth' });
      }
      await wait(1100);
      const buttons = addButtons();
      for (const index of PICKS) {
        const button = buttons[index];
        const item = cards[0]?.items[index];
        if (cancelled || !button || !item) return;
        pointTo(button);
        await wait(650);
        setCursor((current) => ({ ...current, pressed: true }));
        // O botão só serve de alvo do cursor: como a vitrine é inerte, o prato
        // entra pela sacola direto, sem depender de um clique no DOM.
        addItem(item.id, 1, {}, '');
        await wait(160);
        setCursor((current) => ({ ...current, pressed: false }));
        await wait(600);
      }
      if (cancelled) return;
      setCursor((current) => ({ ...current, visible: false }));
      setShowMessage(true);
      await wait(4800);
      if (cancelled || reduced) return;
      setShowMessage(false);
      await wait(400);
      if (!cancelled) run();
    };

    run();
    return () => {
      cancelled = true;
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [addItem, clearCart, reduced]);

  return (
    // `relative` aqui é a âncora da bolha, que é absoluta: aparecer e sumir não
    // pode reposicionar o telefone nem o resto do hero.
    <div className="relative mx-auto w-full max-w-[23.5rem] lg:mx-0 lg:max-w-[21.5rem]">
      <div
        ref={stageRef}
        className="relative h-[34rem] w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-highest"
      >
        {/* Vitrine: quem age aqui é só o cursor falso. `inert` tira o conteúdo do
            clique, do foco e do leitor de tela, e `pointer-events-none` mata hover,
            cursor de mão e a rolagem pela roda do mouse — sem isso, "Ver sacola"
            abria uma gaveta que não existe na demo e os cards levavam para o
            cardápio de exemplo.
            O transform faz deste bloco a referência de tudo o que na loja é
            `fixed` (a barra do topo e a da sacola), como em `EmbeddedShell`. */}
        <ScrollRootContext.Provider value={scrollRef}>
          <div
            inert
            data-phone
            className="pointer-events-none relative h-full transform-gpu overflow-hidden [--safe-bottom:0px] [--safe-top:0px] [--screen-height:34rem] [--top-inset:var(--top-bar-height)]"
          >
            <div ref={scrollRef} className="h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex min-h-full flex-col">
                <StoreHeader />
                <StoreCover cover={business.cover} alt="" />
                <div className="relative -mt-6 rounded-t-xl bg-white">
                  <div className="px-4">
                    <StoreIdentity />
                    <MenuBrowser categories={cards} basePath={`/r/${business.slug}`} />
                  </div>
                </div>
                <CartBar />
              </div>
            </div>
          </div>
        </ScrollRootContext.Provider>

        <FakeCursor {...cursor} />
      </div>

      <AnimatePresence>
        {showMessage && cart.length > 0 && (
          <Bubble>
            <Message />
          </Bubble>
        )}
      </AnimatePresence>
    </div>
  );
}

function FakeCursor({ x, y, visible, pressed }: { x: number; y: number; visible: boolean; pressed: boolean }) {
  return (
    <motion.svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-0 top-0 z-50 size-7 drop-shadow-md"
      initial={false}
      animate={{ x: x - 4, y: y - 3, opacity: visible ? 1 : 0, scale: pressed ? 0.85 : 1 }}
      transition={{ x: SPRING, y: SPRING, opacity: { duration: 0.2 }, scale: { duration: 0.1 } }}
    >
      <path d="M5 3l14 8-6 1.5L16 20l-3 1-3-7.5L5 17z" fill="#1a1a1a" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
    </motion.svg>
  );
}

function Bubble({ children }: { children: ReactNode }) {
  const t = useTranslations('platform.heroDemo');
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="absolute inset-x-4 bottom-20 z-20 rounded-md border border-gray-200 bg-white p-4 shadow-highest xl:inset-x-auto xl:-right-40 xl:bottom-10 xl:w-[17rem]"
    >
      <p className="font-display font-semibold text-[11px] text-gray-600">{t('bubbleTitle')}</p>
      <div className="mt-2 text-caption leading-relaxed text-gray-700">{children}</div>
    </motion.div>
  );
}

/** As linhas da mensagem real, uma a uma. `*negrito*` é a sintaxe do WhatsApp. */
function Message() {
  const { business: store, menu: storeMenu, cart } = useStore();
  const uiText = useUiText();
  const totals = calculateTotals(store, { cart, customer, review: null });
  const text = buildOrderMessage({
    business: store,
    menu: storeMenu,
    cart,
    customer,
    totals,
    text: uiText,
    now: DEMO_NOW,
    orderSuffix: 'A1',
  });
  // Sobre o telefone não cabem as 13 linhas da mensagem: mostra até o total (itens e
  // valores, o que o lojista lê primeiro) e sinaliza que segue.
  const full = text.split('\n').filter((line) => line.trim() !== '');
  // O total vem em negrito do WhatsApp (`*Total: …*`), então os asteriscos saem antes de comparar.
  const end = full.findIndex((line) => line.replaceAll('*', '').startsWith('Total:'));
  const lines = [...(end === -1 ? full.slice(0, 8) : full.slice(0, end + 1)), '…'];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
    >
      {lines.map((line, index) => (
        <motion.p
          key={index}
          variants={{ hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } } }}
          className="min-h-[1.2em] whitespace-pre-wrap"
        >
          {line.split('*').map((part, partIndex) =>
            partIndex % 2 === 1 ? (
              <strong key={partIndex} className="font-semibold text-gray-700">
                {part}
              </strong>
            ) : (
              <span key={partIndex}>{part}</span>
            ),
          )}
        </motion.p>
      ))}
    </motion.div>
  );
}
