'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';
import { Tag } from '@/components/ui/tag';
import { cn } from '@/lib/cn';
import { emptyCustomer } from '@/lib/cart-store';
import { sampleBusiness } from '@/lib/demo/sample-data';
import { formatPrice } from '@/lib/format';
import { calculateDeliveryFee } from '@/lib/whatsapp';
import { EASE_OUT } from './motion';

const business = sampleBusiness;
const zones = business.delivery.zones;
const MIN = 20;
const MAX = 120;

/**
 * Bairro e valor do pedido nas mãos do visitante; taxa, prazo e o momento em
 * que a entrega vira grátis saem de `calculateDeliveryFee`, a função real.
 */
export function DemoDelivery() {
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [subtotal, setSubtotal] = useState(60);
  const sliderId = useId();
  const zone = zones.find((entry) => entry.id === zoneId) ?? zones[0];
  const fee = calculateDeliveryFee(business, { ...emptyCustomer, mode: 'delivery', zoneId }, subtotal);
  const belowMinimum = subtotal < business.delivery.minOrder;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 lg:p-6">
      <p className="font-mono text-[11px] uppercase tracking-widest text-gray-600">Bairro</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {zones.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-pressed={entry.id === zoneId}
            onClick={() => setZoneId(entry.id)}
            className={cn(
              'press h-8 rounded-full border px-3 text-body2 font-medium transition-colors duration-150 ease-standard',
              entry.id === zoneId ? 'border-gray-800 bg-gray-800 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50',
            )}
          >
            {entry.name}
          </button>
        ))}
      </div>

      <div className="mt-6 flex items-baseline justify-between">
        <label htmlFor={sliderId} className="font-mono text-[11px] uppercase tracking-widest text-gray-600">
          Valor do pedido
        </label>
        <Numeral value={formatPrice(subtotal)} className="text-body1 font-semibold text-gray-700" />
      </div>
      <input
        id={sliderId}
        type="range"
        min={MIN}
        max={MAX}
        step={5}
        value={subtotal}
        onChange={(event) => setSubtotal(Number(event.target.value))}
        className="mt-2 w-full accent-primary"
      />
      <div className="flex justify-between font-mono text-[11px] text-gray-400">
        <span>{formatPrice(MIN)}</span>
        <span>grátis acima de {formatPrice(business.delivery.freeAbove)}</span>
        <span>{formatPrice(MAX)}</span>
      </div>

      <dl className="mt-6 divide-y divide-gray-200 border-t border-gray-200 text-body2">
        <Row label="Prazo" value={zone?.eta ?? ''} />
        <Row label="Taxa de entrega" value={fee === 0 ? 'Grátis' : formatPrice(fee)} positive={fee === 0} />
        <Row label="Total" value={formatPrice(subtotal + fee)} strong />
      </dl>
      <div className="mt-3 min-h-6">
        <AnimatePresence>
          {belowMinimum && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Tag tone="warning" size="md">
                Pedido mínimo {formatPrice(business.delivery.minOrder)}
              </Tag>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Row({ label, value, positive = false, strong = false }: { label: string; value: string; positive?: boolean; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className={cn('text-gray-600', strong && 'font-semibold text-gray-700')}>{label}</dt>
      <dd>
        <Numeral
          value={value}
          className={cn('tabular-nums', strong ? 'text-body1 font-bold text-gray-700' : 'font-semibold', positive ? 'text-positive' : !strong && 'text-gray-700')}
        />
      </dd>
    </div>
  );
}

/** Número que troca com crossfade: o valor anterior sai, o novo entra. */
function Numeral({ value, className }: { value: string; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <span className={cn('relative inline-grid', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: reduced ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduced ? 0 : -6 }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
          className="[grid-area:1/1]"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
