'use client';

import { Check, Copy, ImagePlus, MessageCircle } from 'lucide-react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { DishImage } from '@/components/store/dish-image';
import { ItemCard } from '@/components/store/item-card';
import { StoreProvider } from '@/components/store/store-provider';
import { Container } from '@/components/ui/container';
import { Tag } from '@/components/ui/tag';
import { emptyCustomer } from '@/lib/cart-store';
import { cn } from '@/lib/cn';
import { sampleBusiness, sampleMenu } from '@/lib/demo/sample-data';
import { formatPrice, parseMoney } from '@/lib/format';
import { getZonedDateParts, timeZoneForState } from '@/lib/hours';
import { toCardItem } from '@/lib/menu-utils';
import { steps } from '@/lib/platform';
import type { Business, CartLine, MenuCategory, MenuItemCard } from '@/lib/types';
import { buildOrderMessage, calculateUnitPrice } from '@/lib/whatsapp';
import { EASE_OUT, SPRING, useTyped } from './motion';

type StepIndex = 0 | 1 | 2;

const business: Business = { ...sampleBusiness, id: 'landing-steps' };
const BASE_PATH = `/r/${business.slug}`;
const item = sampleMenu.flatMap((category) => category.items).find((entry) => entry.options.length > 0)
  ?? sampleMenu[0]!.items[0]!;
const menu: MenuCategory[] = sampleMenu;

/** A linha do meio da tela: o passo "ativo" é o que está sobre ela. */
const CENTER_LINE = '-50% 0px -50% 0px';

/**
 * Como funciona, do lado do lojista: um painel só, fixo na tela enquanto os três
 * passos rolam ao lado, que muda de estado em vez de trocar de imagem — o prato
 * sendo cadastrado, o link com o QR code, o pedido chegando no WhatsApp.
 * No celular os passos vêm um abaixo do outro, cada um com o seu estado.
 */
export function HowItWorks({ qrSvg, storeUrl }: { qrSvg: string; storeUrl: string }) {
  // Três refs nomeados, não um array: o lint do React Compiler trata índice em
  // array de refs como leitura de ref durante o render.
  const first = useRef<HTMLLIElement>(null);
  const second = useRef<HTMLLIElement>(null);
  const third = useRef<HTMLLIElement>(null);
  // O passo ativo é o que cruza o meio da tela, não o "mais visível": assim a
  // troca acontece no ponto exato entre um texto e o outro, em qualquer altura
  // de tela, e nunca cedo demais.
  const firstOn = useInView(first, { margin: CENTER_LINE });
  const secondOn = useInView(second, { margin: CENTER_LINE });
  const thirdOn = useInView(third, { margin: CENTER_LINE });
  const current: StepIndex | null = thirdOn ? 2 : secondOn ? 1 : firstOn ? 0 : null;

  // Trava no último passo visto. Sem ela, ao sair da seção por baixo o painel —
  // ainda na tela por um instante — voltaria ao cadastro.
  const [active, setActive] = useState<StepIndex>(0);
  if (current !== null && current !== active) setActive(current);

  return (
    <StoreProvider business={business} menu={menu} basePath={BASE_PATH}>
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
        <ol className="space-y-16 lg:space-y-0">
          <Step ref={first} index={0} active={active} qrSvg={qrSvg} storeUrl={storeUrl} />
          <Step ref={second} index={1} active={active} qrSvg={qrSvg} storeUrl={storeUrl} />
          <Step ref={third} index={2} active={active} qrSvg={qrSvg} storeUrl={storeUrl} />
        </ol>

        {/* Faixa de 70vh centrada na tela, a mesma altura de cada passo: o
          * painel fica na vertical exata do texto que está sendo lido. */}
        <div className="hidden lg:block">
          <div className="sticky top-[15vh] flex h-[70vh] items-center">
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
  active,
  qrSvg,
  storeUrl,
}: {
  ref: RefObject<HTMLLIElement | null>;
  index: StepIndex;
  active: StepIndex;
  qrSvg: string;
  storeUrl: string;
}) {
  const step = steps[index];
  const isActive = active === index;
  // No celular cada passo tem o próprio painel, que anima uma vez, quando
  // entra na tela — e fica assim: subir e descer não apaga o que já apareceu.
  const panel = useRef<HTMLDivElement>(null);
  const seen = useInView(panel, { once: true, amount: 0.4 });

  return (
    <li
      ref={ref}
      className={cn(
        'transition-opacity duration-300 ease-standard lg:flex lg:min-h-[70vh] lg:flex-col lg:justify-center',
        !isActive && 'lg:opacity-40',
      )}
    >
      <p
        className={cn(
          'font-mono text-caption uppercase tracking-widest transition-colors duration-300 ease-standard',
          isActive ? 'text-primary' : 'text-gray-600',
        )}
      >
        {step.number} / {step.label}
      </p>
      <h3 className="mt-3 text-h5 font-bold tracking-tight text-gray-700 lg:text-h4">{step.title}</h3>
      <p className="mt-2 max-w-md text-body1 text-gray-600">{step.text}</p>
      <div ref={panel} className="mt-6 lg:hidden">
        <Panel state={index} active={seen} qrSvg={qrSvg} storeUrl={storeUrl} />
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ painel */

function Panel({ state, active, qrSvg, storeUrl }: { state: StepIndex; active: boolean; qrSvg: string; storeUrl: string }) {
  const reduced = useReducedMotion();
  return (
    // `layout="size"`, não `layout`: o painel do desktop é sticky, e animar a
    // posição faria a mola correr atrás da rolagem.
    <motion.div
      layout={reduced ? false : 'size'}
      transition={SPRING}
      className="w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-high"
    >
      <Chrome state={state} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state}
          initial={{ opacity: 0, y: reduced ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -8, transition: { duration: 0.2 } }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className={state === 2 ? 'bg-gray-50 p-4' : 'p-4'}
        >
          {state === 0 ? (
            <StateCadastro active={active} />
          ) : state === 1 ? (
            <StateLink qrSvg={qrSvg} storeUrl={storeUrl} active={active} />
          ) : (
            <StatePedido active={active} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

const CHROME_PATH: Record<0 | 1, string> = {
  0: 'painel / cardápio / novo prato',
  1: 'painel / compartilhar',
};

/**
 * A barra de cima do painel: janela do navegador nos dois primeiros passos
 * (é o lojista no painel) e cabeçalho de conversa no terceiro (é o lojista no
 * WhatsApp, recebendo a mensagem da cliente).
 */
function Chrome({ state }: { state: StepIndex }) {
  return (
    <div className="border-b border-gray-200 bg-white">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          transition={{ duration: 0.25 }}
          className="flex h-12 items-center gap-2 px-4"
        >
          {state === 2 ? (
            <>
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-success-bg text-caption font-bold text-success"
              >
                {customer.name.charAt(0)}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-body2 font-semibold text-gray-700">{customer.name}</p>
                <p className="text-[11px] text-gray-600">{CUSTOMER_PHONE}</p>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 text-caption text-gray-600">
                <MessageCircle aria-hidden="true" className="size-4 text-success" />
                WhatsApp
              </span>
            </>
          ) : (
            <>
              <span aria-hidden="true" className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-gray-300" />
                <span className="size-2.5 rounded-full bg-gray-300" />
                <span className="size-2.5 rounded-full bg-gray-300" />
              </span>
              <span className="ml-2 truncate font-mono text-[11px] text-gray-600">{CHROME_PATH[state]}</span>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------------------------------- 01 · cadastro */

/**
 * Passo 1: o formulário do prato se preenche sozinho — nome, preço, foto — e
 * a linha do cardápio nasce logo abaixo, com o componente real da loja.
 */
function StateCadastro({ active }: { active: boolean }) {
  const name = useTyped(item.name, active);
  const price = useTyped(formatPrice(item.price).replace('R$', '').trim(), name.done);
  const photo = useDelayed(price.done, 350);
  const saved = useDelayed(photo, 500);
  const preview: MenuItemCard = {
    ...toCardItem(item),
    name: name.value || 'Novo prato',
    price: parseMoney(price.value),
    image: photo ? item.image : '',
    description: '',
    tags: [],
  };

  return (
    <div className="grid gap-4">
      <Field label="Nome" value={name.value} placeholder="Ex.: X-Burger da casa" typing={active && !name.done} />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <Field label="Preço (R$)" value={price.value} placeholder="0,00" typing={name.done && !price.done} />
        <PhotoField filled={photo} />
      </div>
      <div>
        <div className="flex h-5 items-center justify-between">
          <p className="font-mono text-[11px] uppercase tracking-widest text-gray-600">Como aparece no cardápio</p>
          <AnimatePresence>
            {saved && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Tag tone="positive">
                  <Check aria-hidden="true" className="size-3" />
                  Salvo
                </Tag>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {/* Altura da linha com foto reservada de saída: a foto entra sem empurrar o painel. */}
        <ul className="mt-1 min-h-[7.5rem] divide-y divide-gray-200">
          <ItemCard item={preview} basePath={BASE_PATH} />
        </ul>
      </div>
    </div>
  );
}

function Field({ label, value, placeholder, typing }: { label: string; value: string; placeholder: string; typing: boolean }) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-body2 font-medium text-gray-700">{label}</p>
      <div
        className={cn(
          'flex h-12 items-center rounded-sm border px-4 text-body1 text-gray-700 transition-colors duration-150 ease-standard',
          typing ? 'border-gray-700' : 'border-gray-300',
        )}
      >
        <span className={cn('truncate', !value && 'text-gray-400')}>{value || placeholder}</span>
        {typing && <span aria-hidden="true" className="ml-px h-5 w-px shrink-0 animate-pulse bg-gray-700" />}
      </div>
    </div>
  );
}

/** O campo de foto do formulário real: um quadrado tracejado que recebe a imagem. */
function PhotoField({ filled }: { filled: boolean }) {
  const reduced = useReducedMotion();
  return (
    <div>
      <p className="mb-1.5 text-body2 font-medium text-gray-700">Foto</p>
      <div
        className={cn(
          'relative grid size-12 place-items-center overflow-hidden rounded-sm border text-gray-400 transition-colors duration-150 ease-standard',
          filled ? 'border-gray-200' : 'border-dashed border-gray-300',
        )}
      >
        <ImagePlus aria-hidden="true" className="size-5" />
        <AnimatePresence>
          {filled && (
            <motion.span
              initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={SPRING}
              className="absolute inset-0"
            >
              <DishImage image={item.image} alt="" emojiSize="sm" className="size-full" />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** `true` um instante depois de `flag` virar verdadeiro; volta a `false` com ele. */
function useDelayed(flag: boolean, ms: number): boolean {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(false);
  const [previous, setPrevious] = useState(flag);
  if (previous !== flag) {
    setPrevious(flag);
    if (!flag) setValue(false);
  }
  useEffect(() => {
    if (!flag) return;
    const timer = window.setTimeout(() => setValue(true), reduced ? 0 : ms);
    return () => window.clearTimeout(timer);
  }, [flag, ms, reduced]);
  return flag && value;
}

/* ------------------------------------------------------- 02 · compartilhe */

/** Passo 2: a tela de compartilhar do painel — link para copiar e o QR code real, que se desenha ao entrar. */
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
    <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-body2 font-semibold text-gray-700">{business.name}</p>
          <Tag tone="positive">No ar</Tag>
        </div>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-gray-600">Link do cardápio</p>
        <div className="mt-1.5 flex items-center gap-1 rounded-sm bg-gray-50 py-1 pl-3 pr-1">
          <span className="min-w-0 flex-1 truncate font-mono text-body2 text-gray-700">
            {storeUrl.replace(/^https?:\/\//, '')}
          </span>
          <button
            type="button"
            onClick={copy}
            aria-label={copied ? 'Link copiado' : 'Copiar link'}
            className="press grid size-9 shrink-0 place-items-center rounded-full text-gray-700 hover:bg-gray-100"
          >
            {copied ? <Check aria-hidden="true" className="size-4 text-positive" /> : <Copy aria-hidden="true" className="size-4" />}
          </button>
        </div>
        <p className="mt-2 text-caption text-gray-600">Para a bio do Instagram, o status do WhatsApp e o Google.</p>
      </div>

      {/* O cartão que o lojista imprime: QR code e o nome da casa. */}
      <figure className="justify-self-center rounded-md border border-gray-200 bg-white p-3 text-center">
        <motion.div
          role="img"
          aria-label="QR code do cardápio de exemplo"
          initial={{ clipPath: 'inset(0 0 100% 0)' }}
          animate={{ clipPath: active ? 'inset(0 0 0% 0)' : 'inset(0 0 100% 0)' }}
          transition={{ duration: reduced ? 0 : 0.6, ease: EASE_OUT }}
          className="mx-auto w-[7.5rem] [&_svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <figcaption className="mt-2 text-[11px] leading-tight text-gray-600">
          <span className="block font-semibold text-gray-700">{business.name}</span>
          para a mesa e a embalagem
        </figcaption>
      </figure>
    </div>
  );
}

/* ------------------------------------------------------------ 03 · receba */

/** Passo 3: a conversa no WhatsApp, com a mensagem real que a cliente envia. */
function StatePedido({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  return (
    // Altura do balão reservada: no celular ele chega depois, e a página não pode pular.
    <div className="min-h-[15.5rem]">
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0, y: reduced ? 0 : 16, scale: reduced ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={SPRING}
            style={{ transformOrigin: 'top left' }}
            className="max-w-[22rem] rounded-md rounded-tl-xs border border-gray-200 bg-white px-3 py-2 shadow-low"
          >
            <NotificationBody />
            <p className="mt-1 text-right text-[10px] leading-none text-gray-400">{MESSAGE_TIME}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Um pedido fixo (o prato com um complemento) passado pela função real da mensagem. */
const DEMO_NOW = new Date();
// A hora do balão sai do mesmo relógio da mensagem: o fuso do restaurante, não o do aparelho.
const placed = getZonedDateParts(DEMO_NOW, timeZoneForState(business.address.state));
const MESSAGE_TIME = `${String(placed.hour).padStart(2, '0')}:${String(placed.minute).padStart(2, '0')}`;
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
const customer = {
  ...emptyCustomer,
  name: 'Ana',
  phone: '11987654321',
  mode: 'delivery' as const,
  zoneId: business.delivery.zones[0]?.id ?? '',
  street: 'Rua das Flores',
  number: '120',
};
const CUSTOMER_PHONE = '(11) 98765-4321';
const fee = business.delivery.zones[0]?.fee ?? 0;
const fullMessage = buildOrderMessage({
  business,
  menu,
  cart: [line],
  customer,
  totals: { subtotal: line.unitPrice, deliveryFee: fee, total: line.unitPrice + fee },
  now: DEMO_NOW,
  orderSuffix: 'A1',
})
  .split('\n')
  .filter((entry) => entry.trim() !== '');
// Até o total, que é o que o lojista lê primeiro; o resto (cliente, endereço) fica sugerido pelas reticências.
const totalAt = fullMessage.findIndex((entry) => entry.replaceAll('*', '').startsWith('Total:'));
const notification = fullMessage.slice(0, totalAt === -1 ? 8 : Math.min(totalAt + 1, 10));

function NotificationBody() {
  return (
    <div className="space-y-0.5 text-caption text-gray-700">
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
