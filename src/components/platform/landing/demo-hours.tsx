'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { sampleBusiness } from '@/lib/demo/sample-data';
import { DAY_NAMES, describeNextOpening, getOpeningStatus, timeZoneForState } from '@/lib/hours';
import { EASE_OUT } from './motion';

const business = sampleBusiness;
const timeZone = timeZoneForState(business.address.state);
/** Domingo 00:00 no fuso do restaurante; o controle avança em passos de 15 min a partir daqui. */
const WEEK_START = new Date('2026-09-20T03:00:00.000Z');
const STEP_MINUTES = 15;
const STEPS_PER_DAY = (24 * 60) / STEP_MINUTES;
const TOTAL_STEPS = 7 * STEPS_PER_DAY;
const SHORT_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const toMinutes = (value: string) => {
  const [hour = 0, minute = 0] = value.split(':').map(Number);
  return hour * 60 + minute;
};

/**
 * A semana do restaurante de exemplo desenhada como linha do tempo; arrastar a
 * hora passa por `getOpeningStatus`, a mesma regra que decide na loja se o
 * botão de adicionar está liberado.
 */
export function DemoHours() {
  const reduced = useReducedMotion();
  const sliderId = useId();
  // Terça, 19:30 — aberto.
  const [step, setStep] = useState(2 * STEPS_PER_DAY + (19 * 60 + 30) / STEP_MINUTES);
  const day = Math.floor(step / STEPS_PER_DAY);
  const minutes = (step % STEPS_PER_DAY) * STEP_MINUTES;
  const reference = new Date(WEEK_START.getTime() + step * STEP_MINUTES * 60_000);
  const status = getOpeningStatus(business.hours, timeZone, reference);
  const label = `${DAY_NAMES[day] ?? ''}, ${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  const canOrder = status.open || business.acceptOrdersWhenClosed;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 lg:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body1 font-semibold tabular-nums text-gray-700" aria-live="polite">
          {label}
        </p>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-caption font-semibold',
            status.open ? 'bg-success-bg text-success' : 'bg-gray-100 text-gray-700',
          )}
        >
          <span aria-hidden="true" className={cn('size-2 rounded-full', status.open ? 'bg-positive' : 'bg-gray-400')} />
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={describeNextOpening(status)}
              initial={{ opacity: 0, y: reduced ? 0 : 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduced ? 0 : -4 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
            >
              {describeNextOpening(status)}
            </motion.span>
          </AnimatePresence>
        </span>
      </div>

      {/* A semana: cada coluna é um dia; as barras vermelhas, os horários cadastrados. */}
      <div className="mt-5 grid grid-cols-7 gap-1" aria-hidden="true">
        {SHORT_DAYS.map((name, index) => (
          <div key={name} className="min-w-0">
            <div className="relative h-8 overflow-hidden rounded-xs bg-gray-100">
              {(business.hours[index] ?? []).map((range) => {
                const open = toMinutes(range.open);
                const close = toMinutes(range.close);
                return (
                  <span
                    key={`${range.open}-${range.close}`}
                    className="absolute inset-y-0 bg-primary/80"
                    style={{ left: `${(open / 1440) * 100}%`, width: `${((close - open) / 1440) * 100}%` }}
                  />
                );
              })}
              {index === day && (
                <span className="absolute inset-y-0 w-0.5 bg-gray-800" style={{ left: `${(minutes / 1440) * 100}%` }} />
              )}
            </div>
            <p className={cn('mt-1 text-center font-mono text-[11px]', index === day ? 'text-gray-700' : 'text-gray-400')}>{name}</p>
          </div>
        ))}
      </div>

      <label htmlFor={sliderId} className="sr-only">
        Dia e hora da semana
      </label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={TOTAL_STEPS - 1}
        step={1}
        value={step}
        onChange={(event) => setStep(Number(event.target.value))}
        className="mt-3 w-full accent-primary"
      />

      <div className="mt-5 flex items-center gap-3 border-t border-gray-200 pt-4">
        <Button className="min-w-0 flex-1" trailing="R$ 29,90" disabled={!canOrder}>
          {canOrder ? 'Adicionar' : 'Loja fechada'}
        </Button>
      </div>
    </div>
  );
}
