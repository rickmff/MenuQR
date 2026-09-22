'use client';

import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

/**
 * Duas ou três opções excludentes num trilho cinza, a ativa em branco — o
 * Entrega | Retirada do iFood. É um `radiogroup`: setas trocam a opção e o
 * foco vai junto.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + step + options.length) % options.length];
    if (!next) return;
    onChange(next.value);
    event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[(index + step + options.length) % options.length]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn('flex gap-1 rounded-full bg-gray-100 p-1', className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'press flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full text-body2 font-semibold transition-colors duration-150 ease-standard',
              active ? 'bg-white text-gray-700 shadow-low' : 'text-gray-600 hover:text-gray-700',
            )}
          >
            {option.icon && <span aria-hidden="true">{option.icon}</span>}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
