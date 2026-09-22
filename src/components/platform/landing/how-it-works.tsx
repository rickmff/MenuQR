'use client';

import { Check, Copy, MessageCircle } from 'lucide-react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useRef, useState, type RefObject } from 'react';
import { ItemCard } from '@/components/store/item-card';
import { StoreProvider } from '@/components/store/store-provider';
import { Container } from '@/components/ui/container';
import { emptyCustomer } from '@/lib/cart-store';
import { sampleBusiness, sampleMenu } from '@/lib/demo/sample-data';
import { formatPrice, parseMoney } from '@/lib/format';
import { toCardItem } from '@/lib/menu-utils';
import { steps } from '@/lib/platform';
import type { Business, CartLine, MenuCategory } from '@/lib/types';
import { buildOrderMessage, calculateUnitPrice } from '@/lib/whatsapp';
import { EASE_OUT, SPRING, useTyped } from './motion';

const business: Business = { ...sampleBusiness, id: 'landing-steps' };
const item = sampleMenu.flatMap((category) => category.items).find((entry) => entry.options.length > 0)
  ?? sampleMenu[0]!.items[0]!;
const menu: MenuCategory[] = sampleMenu;

/**
 * Como funciona, do lado do lojista: um painel só, fixo na tela enquanto os três
 * passos rolam ao lado, que muda de estado em vez de trocar de imagem — o prato
 * sendo cadastrado, o link com o QR code, o pedido chegando como notificação.
 * No celular os passos vêm um abaixo do outro, cada um com o seu estado.
 */
export function HowItWorks({ qrSvg, storeUrl }: { qrSvg: string; storeUrl: string }) {
  // Três refs nomeados, não um array: o lint do React Compiler trata índice em
  // array de refs como leitura de ref durante o render.
  const first = useRef<HTMLLIElement>(null);
  const second = useRef<HTMLLIElement>(null);
  const third = useRef<HTMLLIElement>(null);
  const firstInView = useInView(first, { amount: 0.5 });
  const secondInView = useInView(second, { amount: 0.5 });
  const thirdInView = useInView(third, { amount: 0.5 });
  const active = thirdInView ? 2 : secondInView ? 1 : 0;

  return (
    <StoreProvider business={business} menu={menu} basePath={`/r/${business.slug}`}>
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <ol className="space-y-16 lg:space-y-0">
          <Step ref={first} index={0} visible={firstInView} qrSvg={qrSvg} storeUrl={storeUrl} />
          <Step ref={second} index={1} visible={secondInView} qrSvg={qrSvg} storeUrl={storeUrl} />
          <Step ref={third} index={2} visible={thirdInView} qrSvg={qrSvg} storeUrl={storeUrl} />
        </ol>

        <div className="hidden lg:block">
          <div className="sticky top-28">
            <Panel state={active} active qrSvg={qrSvg} storeUrl={storeUrl} />
          </div>
        </div>
      </Container>
    </StoreProvider>
  );
}

function Step({
  ref,
  index,
  visible,
  qrSvg,
  storeUrl,
}: {
  ref: RefObject<HTMLLIElement | null>;
  index: 0 | 1 | 2;
  visible: boolean;
  qrSvg: string;
  storeUrl: string;
}) {
  const step = steps[index];
  return (
    <li ref={ref} className="lg:flex lg:min-h-[70vh] lg:flex-col lg:justify-center">
      <p className="font-mono text-caption uppercase tracking-widest text-gray-600">
        {step.number} / {step.label}
      </p>
      <h3 className="mt-3 text-h5 font-bold tracking-tight text-gray-700 lg:text-h4">{step.title}</h3>
      <p className="mt-2 max-w-md text-body1 text-gray-600">{step.text}</p>
      <div className="mt-6 lg:hidden">
        <Panel state={index} active={visible} qrSvg={qrSvg} storeUrl={storeUrl} />
      </div>
    </li>
  );
}

function Panel({ state, active, qrSvg, storeUrl }: { state: number; active: boolean; qrSvg: string; storeUrl: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      layout={!reduced}
      transition={SPRING}
      className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-high"
    >
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-gray-300" />
        <span className="size-2.5 rounded-full bg-gray-300" />
        <span className="size-2.5 rounded-full bg-gray-300" />
        <span className="ml-3 font-mono text-[11px] text-gray-600">
          {state === 0 ? 'painel / cardápio / novo prato' : state === 1 ? 'painel / visão geral' : 'WhatsApp'}
        </span>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state}
          initial={{ opacity: 0, y: reduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -8, transition: { duration: 0.2 } }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="p-4"
        >
          {state === 0 ? <StateCadastro active={active} /> : state === 1 ? <StateLink qrSvg={qrSvg} storeUrl={storeUrl} active={active} /> : <StatePedido active={active} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/** Passo 1: os campos são preenchidos e a linha do cardápio nasce ao lado. */
function StateCadastro({ active }: { active: boolean }) {
  const name = useTyped(item.name, active);
  const price = useTyped(formatPrice(item.price).replace('R$', '').trim(), name.done);
  const preview = { ...toCardItem(item), name: name.value || 'Novo prato', price: parseMoney(price.value) };

  return (
    <div className="grid gap-4">
      <Field label="Nome do prato" value={name.value} typing={active && !name.done} />
      <Field label="Preço" value={price.value ? `R$ ${price.value}` : ''} typing={name.done && !price.done} />
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-gray-600">Como aparece no cardápio</p>
        <ul className="mt-1 divide-y divide-gray-200">
          <ItemCard item={preview} basePath={`/r/${business.slug}`} />
        </ul>
      </div>
    </div>
  );
}

function Field({ label, value, typing }: { label: string; value: string; typing: boolean }) {
  return (
    <div>
      <p className="mb-1.5 text-body2 font-medium text-gray-700">{label}</p>
      <div className="flex h-12 items-center rounded-sm border border-gray-300 px-4 text-body1 text-gray-700">
        <span className={value ? '' : 'text-gray-400'}>{value || ' '}</span>
        {typing && <span aria-hidden="true" className="ml-px h-5 w-px animate-pulse bg-gray-700" />}
      </div>
    </div>
  );
}

/** Passo 2: o link do cardápio e o QR code real, que se desenha ao entrar. */
function StateLink({ qrSvg, storeUrl, active }: { qrSvg: string; storeUrl: string; active: boolean }) {
  const reduced = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Sem permissão de área de transferência: o link continua visível para copiar à mão.
    }
  };

  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-widest text-gray-600">Seu link</p>
        <div className="mt-2 flex items-center gap-2 rounded-sm border border-gray-300 px-3 py-2.5">
          <span className="min-w-0 flex-1 truncate font-mono text-body2 text-gray-700">{storeUrl.replace(/^https?:\/\//, '')}</span>
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? 'Link copiado' : 'Copiar link'}
            className="press grid size-8 shrink-0 place-items-center rounded-full text-gray-700 hover:bg-gray-50"
          >
            {copied ? <Check aria-hidden="true" className="size-4 text-positive" /> : <Copy aria-hidden="true" className="size-4" />}
          </button>
        </div>
        <p className="mt-2 text-caption text-gray-600">Para as redes, o Instagram e a bio.</p>
      </div>
      <motion.div
        aria-label="QR code do cardápio de exemplo"
        role="img"
        initial={false}
        animate={active && !reduced ? { clipPath: 'inset(0 0 0% 0)' } : { clipPath: active ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)' }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="mx-auto w-[9.5rem] rounded-md border border-gray-200 p-2 [&_svg]:size-full"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
    </div>
  );
}

/** Passo 3: o pedido chega como notificação, com o texto real da mensagem. */
function StatePedido({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div className="min-h-[14rem]">
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : -24, scale: reduced ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={SPRING}
            className="rounded-md border border-gray-200 bg-gray-50 p-4"
          >
            <div className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-success-bg text-success">
                <MessageCircle aria-hidden="true" className="size-3.5" />
              </span>
              <span className="text-caption font-semibold text-gray-700">WhatsApp</span>
              <span className="ml-auto text-caption text-gray-600">agora</span>
            </div>
            <NotificationBody />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Um pedido fixo (o prato com um complemento) passado pela função real da mensagem. */
const DEMO_NOW = new Date();
const single = item.options.find((group) => group.type === 'single');
const multi = item.options.find((group) => group.type === 'multi');
const selections = {
  ...(single?.choices[1] ? { [single.id]: single.choices[1].id } : {}),
  ...(multi?.choices[0] ? { [multi.id]: [multi.choices[0].id] } : {}),
};
const line: CartLine = {
  uid: 'demo',
  signature: 'demo',
  itemId: item.id,
  name: item.name,
  quantity: 1,
  unitPrice: calculateUnitPrice(item, selections),
  selections,
  notes: '',
};
const customer = { ...emptyCustomer, name: 'Ana', phone: '11987654321', mode: 'delivery' as const, zoneId: business.delivery.zones[0]?.id ?? '', street: 'Rua das Flores', number: '120', payment: 'Pix' };
const fee = business.delivery.zones[0]?.fee ?? 0;
const notification = buildOrderMessage({
  business,
  menu,
  cart: [line],
  customer,
  totals: { subtotal: line.unitPrice, deliveryFee: fee, total: line.unitPrice + fee },
  now: DEMO_NOW,
  orderSuffix: 'A1',
})
  .split('\n')
  .filter((entry) => entry.trim() !== '')
  .slice(0, 6);

function NotificationBody() {
  return (
    <div className="mt-2 space-y-0.5 text-caption text-gray-700">
      {notification.map((entry, index) => (
        <p key={index} className="whitespace-pre-wrap">
          {entry.split('*').map((part, partIndex) =>
            partIndex % 2 === 1 ? <strong key={partIndex} className="font-semibold">{part}</strong> : <span key={partIndex}>{part}</span>,
          )}
        </p>
      ))}
      <p className="text-gray-400">…</p>
    </div>
  );
}
