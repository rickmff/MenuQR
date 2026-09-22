'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface StepperProps {
  value: number;
  /** Menor quantidade selecionável. */
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  /**
   * Com onRemove, ao chegar no mínimo o "−" vira lixeira e remove o item — é
   * como a Sacola do iFood funciona. Sem ele, o "−" apenas desabilita.
   */
  onRemove?: () => void;
  size?: 'sm' | 'md';
  /** Nome do item, para os rótulos de leitor de tela. */
  label: string;
  disabled?: boolean;
  className?: string;
}

export function Stepper({
  value,
  min = 1,
  max = 99,
  onChange,
  onRemove,
  size = 'md',
  label,
  disabled = false,
  className,
}: StepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;
  const removes = atMin && onRemove !== undefined;
  const button = cn(
    'press grid shrink-0 place-items-center text-primary disabled:cursor-not-allowed disabled:text-gray-400',
    size === 'md' ? 'size-10' : 'size-8',
  );
  const icon = size === 'md' ? 'size-5' : 'size-4';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-sm border border-gray-300 bg-white',
        disabled && 'opacity-60',
        className,
      )}
    >
      <button
        type="button"
        className={button}
        disabled={disabled || (atMin && !removes)}
        onClick={() => (removes ? onRemove() : onChange(Math.max(min, value - 1)))}
      >
        {removes ? (
          <Trash2 aria-hidden="true" className={icon} />
        ) : (
          <Minus aria-hidden="true" className={icon} />
        )}
        <span className="sr-only">
          {removes ? `Remover ${label}` : `Diminuir quantidade de ${label}`}
        </span>
      </button>

      <span
        aria-live="polite"
        className={cn(
          'text-center font-semibold tabular-nums text-gray-700',
          size === 'md' ? 'min-w-8 text-body1' : 'min-w-6 text-body2',
        )}
      >
        {/* A key refaz o fade a cada mudança: o número "troca", não pisca. */}
        <span key={value} className="inline-block animate-fade-in">
          {value}
        </span>
        <span className="sr-only"> unidades de {label}</span>
      </span>

      <button
        type="button"
        className={button}
        disabled={disabled || atMax}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <Plus aria-hidden="true" className={icon} />
        <span className="sr-only">Aumentar quantidade de {label}</span>
      </button>
    </div>
  );
}
