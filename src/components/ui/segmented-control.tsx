'use client';

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Opção que existe mas não vale nesta loja (ex.: "Retirada" desligada): aparece apagada. */
  disabled?: boolean;
  /** Segunda linha pequena sob o rótulo — "Indisponível". */
  hint?: string;
}

const SIZES = {
  md: 'h-10 text-body2',
  /** Cabeçalho da loja: rótulo de 16, com espaço para a segunda linha do `hint`. */
  lg: 'h-11 px-5 text-body1',
} as const;

/**
 * Duas ou três opções excludentes num trilho cinza, a ativa em branco — o
 * Entrega | Retirada do iFood. É um `radiogroup`: setas trocam a opção e o
 * foco vai junto (pulando as desabilitadas).
 *
 * `indicator="sliding"` troca o fundo de cada botão por uma pílula branca única
 * que desliza até a opção ativa, como nos apps de delivery. O padrão (`fill`)
 * é o desenho de sempre, usado pelo painel.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  indicator = 'fill',
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: keyof typeof SIZES;
  indicator?: 'fill' | 'sliding';
  className?: string;
}) {
  const sliding = indicator === 'sliding';
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    // Anda na direção pedida até achar uma opção habilitada (no máximo uma volta).
    for (let offset = 1; offset < options.length; offset += 1) {
      const index = (activeIndex + step * offset + options.length * offset) % options.length;
      const next = options[index];
      if (!next || next.disabled) continue;
      onChange(next.value);
      event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[index]?.focus();
      return;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn('flex rounded-full bg-gray-100 p-1', sliding ? 'relative gap-0' : 'gap-1', className)}
    >
      {sliding && (
        <span
          aria-hidden="true"
          style={{ '--segments': options.length, '--segment': activeIndex } as CSSProperties}
          className="pointer-events-none absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/var(--segments))] translate-x-[calc(var(--segment)*100%)] rounded-full bg-white shadow-low transition-transform duration-200 ease-standard"
        />
      )}
      {options.map((option) => {
        const active = option.value === value;
        const blocked = option.disabled === true;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={blocked || undefined}
            tabIndex={active ? 0 : -1}
            onClick={blocked ? undefined : () => onChange(option.value)}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full font-semibold',
              blocked ? 'cursor-not-allowed text-gray-400' : 'press',
              SIZES[size],
              sliding
                ? // Sobre o trilho `gray-100`, o `gray-600` fica em 4,14:1: o inativo é `gray-700`.
                  // Sem `transition-colors`: ele trocaria a lista da `press` e o toque perderia a escala.
                  cn('relative z-10 hit-y-44', !blocked && (active ? 'text-gray-900' : 'text-gray-700 hover:text-gray-900'))
                : cn(
                    'transition-colors duration-150 ease-standard',
                    !blocked && (active ? 'bg-white text-gray-700 shadow-low' : 'text-gray-600 hover:text-gray-700'),
                  ),
            )}
          >
            {option.icon && <span aria-hidden="true">{option.icon}</span>}
            {option.hint ? (
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate">{option.label}</span>
                <span className="truncate text-caption font-normal">{option.hint}</span>
              </span>
            ) : (
              <span className="truncate">{option.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
