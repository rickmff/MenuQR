'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CartBar } from '@/components/store/cart-bar';
import { ItemCard } from '@/components/store/item-card';
import { StoreHeader } from '@/components/store/store-header';
import { StoreProvider, useStore } from '@/components/store/store-provider';
import { calculateTotals, emptyCustomer } from '@/lib/cart-store';
import { sampleBusiness, sampleMenu } from '@/lib/demo/sample-data';
import { toCardCategory } from '@/lib/menu-utils';
import type { Business, CustomerData, MenuCategory } from '@/lib/types';
import { buildOrderMessage } from '@/lib/whatsapp';
import { EASE_OUT, SPRING } from './motion';

/**
 * O produto rodando sozinho: o cardápio de exemplo com os componentes reais da
 * loja, um cursor que adiciona dois pratos, a barra da sacola subindo e a
 * mensagem que `buildOrderMessage` gera de verdade para essa sacola.
 *
 * A loja recebe outro id para a sacola da demo ficar isolada da sacola real do
 * cardápio de exemplo no localStorage.
 */
const business: Business = { ...sampleBusiness, id: 'landing-hero' };
const firstCategory = sampleMenu.find((category) => category.items.length >= 3) ?? sampleMenu[0]!;
const menu: MenuCategory[] = [
  {
    ...firstCategory,
    // Sem complementos obrigatórios todo prato ganha o "+" de adição rápida.
    items: firstCategory.items.slice(0, 3).map((item) => ({ ...item, options: [] })),
  },
];
const cards = toCardCategory(menu[0]!).items;
const customer: CustomerData = {
  ...emptyCustomer,
  name: 'Ana',
  phone: '11987654321',
  mode: 'delivery',
  zoneId: business.delivery.zones[0]?.id ?? '',
  street: 'Rua das Flores',
  number: '120',
  payment: 'Pix',
};
/** Fixo no carregamento do módulo: a mensagem não muda a cada render. */
const DEMO_NOW = new Date();

export function HeroDemo() {
  return (
    <StoreProvider business={business} menu={menu} basePath={`/r/${business.slug}`}>
      <Stage />
    </StoreProvider>
  );
}

function Stage() {
  const { cart, clearCart } = useStore();
  const reduced = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
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

    const run = async () => {
      clearCart();
      await wait(900);
      const buttons = Array.from(
        stageRef.current?.querySelectorAll<HTMLButtonElement>('button[aria-label^="Adicionar"]') ?? [],
      );
      for (const button of [buttons[0], buttons[2]]) {
        if (cancelled || !button) return;
        pointTo(button);
        await wait(650);
        setCursor((current) => ({ ...current, pressed: true }));
        button.click();
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
  }, [clearCart, reduced]);

  return (
    // `relative` aqui é a âncora da bolha, que é absoluta: aparecer e sumir não
    // pode reposicionar o telefone nem o resto do hero.
    <div className="relative mx-auto w-full max-w-[22rem] lg:mx-0 lg:max-w-[20rem]">
      <div
        ref={stageRef}
        className="relative h-[34rem] w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-highest"
      >
        {/* O transform faz este bloco ser a referência da barra da sacola, que é `fixed`. */}
        <div className="h-full transform-gpu overflow-hidden">
          <StoreHeader />
          <div className="flex gap-4 overflow-hidden whitespace-nowrap border-b border-gray-200 px-4 text-body2 font-semibold">
            {sampleMenu.slice(0, 3).map((category, index) => (
              <span
                key={category.slug}
                className={
                  index === 0
                    ? 'border-b-2 border-primary py-3 text-primary'
                    : 'py-3 text-gray-600'
                }
              >
                {category.name}
              </span>
            ))}
          </div>
          <ul className="divide-y divide-gray-200 px-4">
            {cards.map((item, index) => (
              <ItemCard key={item.id} item={item} basePath={`/r/${business.slug}`} priority={index === 0} />
            ))}
          </ul>
          <CartBar />
        </div>

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
      className="absolute inset-x-4 bottom-20 z-20 rounded-md border border-gray-200 bg-white p-4 shadow-highest lg:inset-x-auto lg:-right-40 lg:bottom-10 lg:w-[17rem]"
    >
      <p className="font-mono text-[11px] uppercase tracking-wide text-gray-600">WhatsApp · chega assim</p>
      <div className="mt-2 text-caption leading-relaxed text-gray-700">{children}</div>
    </motion.div>
  );
}

/** As linhas da mensagem real, uma a uma. `*negrito*` é a sintaxe do WhatsApp. */
function Message() {
  const { business: store, menu: storeMenu, cart } = useStore();
  const totals = calculateTotals(store, { cart, customer, review: null });
  const text = buildOrderMessage({ business: store, menu: storeMenu, cart, customer, totals, now: DEMO_NOW, orderSuffix: 'A1' });
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
