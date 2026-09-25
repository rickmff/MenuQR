'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

type StepperSize = 'sm' | 'md' | 'lg';
type StepperVariant = 'outlined' | 'plain' | 'soft' | 'floating';

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
  /** sm: botões de 32 · md: 40 · lg: 56 (o stepper grande da página do prato). */
  size?: StepperSize;
  /**
   * outlined: pílula com borda (painel e telas antigas) · plain: só os glifos,
   * sem moldura · soft: pílula cinza sem borda (sacola, adicionais, página do
   * prato — o desenho dos apps de delivery) · floating: pílula branca com
   * sombra, por cima da foto na linha do cardápio.
   */
  variant?: StepperVariant;
  /**
   * vertical empilha "+ / número / −" numa coluna estreita, do tamanho de um
   * botão. Continua disponível para quem precisar de uma coluna estreita.
   */
  orientation?: 'horizontal' | 'vertical';
  /** Nome do item, para os rótulos de leitor de tela. */
  label: string;
  disabled?: boolean;
  className?: string;
}

const SIZES: Record<StepperSize, { button: string; icon: string; count: string }> = {
  sm: { button: 'size-8', icon: 'size-4', count: 'min-w-6 text-body2' },
  md: { button: 'size-10', icon: 'size-5', count: 'min-w-8 text-body1' },
  lg: { button: 'size-14', icon: 'size-6', count: 'min-w-10 text-subtitle' },
};

const FRAMES: Record<StepperVariant, string> = {
  outlined: 'rounded-sm border border-gray-300 bg-white',
  plain: '',
  soft: 'rounded-full bg-gray-100',
  floating: 'rounded-full bg-white shadow-medium',
};

/** As variantes antigas pintam os glifos de verde; as pílulas novas usam grafite, como na referência. */
const INK: Record<StepperVariant, string> = {
  outlined: 'text-primary',
  plain: 'text-primary',
  soft: 'text-gray-900',
  floating: 'text-gray-900',
};

export function Stepper({
  value,
  min = 1,
  max = 99,
  onChange,
  onRemove,
  size = 'md',
  variant = 'outlined',
  orientation = 'horizontal',
  label,
  disabled = false,
  className,
}: StepperProps) {
  const t = useTranslations('ui.stepper');
  const atMin = value <= min;
  const atMax = value >= max;
  const removes = atMin && onRemove !== undefined;
  const vertical = orientation === 'vertical';
  const pill = variant === 'soft' || variant === 'floating';
  const dimensions = SIZES[size];
  const button = cn(
    'press grid shrink-0 place-items-center disabled:cursor-not-allowed disabled:text-gray-400',
    INK[variant],
    dimensions.button,
    // Nas pílulas o toque escurece um círculo, não um quadrado; e o botão de 32
    // ganha o alvo de 44 (o número de 24 no meio separa as duas áreas).
    pill && 'relative rounded-full active:bg-black/5',
    pill && size === 'sm' && 'hit-44',
  );
  const icon = dimensions.icon;

  const decrease = (
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
        {removes ? t('remove', { label }) : t('decrease', { label })}
      </span>
    </button>
  );

  const count = (
    <span
      aria-live="polite"
      className={cn('text-center font-semibold tabular-nums text-gray-700', dimensions.count)}
    >
      {/* A key refaz o fade a cada mudança: o número "troca", não pisca. */}
      <span key={value} className="inline-block animate-fade-in">
        {value}
      </span>
      <span className="sr-only"> {t('units', { label })}</span>
    </span>
  );

  const increase = (
    <button
      type="button"
      className={button}
      disabled={disabled || atMax}
      onClick={() => onChange(Math.min(max, value + 1))}
    >
      <Plus aria-hidden="true" className={icon} />
      <span className="sr-only">{t('increase', { label })}</span>
    </button>
  );

  return (
    <div
      className={cn(
        'inline-flex items-center',
        // Em pé o aumentar vem em cima: é a leitura natural de uma coluna.
        vertical && 'flex-col',
        FRAMES[variant],
        disabled && 'opacity-60',
        className,
      )}
    >
      {vertical ? increase : decrease}
      {count}
      {vertical ? decrease : increase}
    </div>
  );
}
