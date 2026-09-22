'use client';

import { cloneElement, useEffect, useId, useRef, useState, type ReactElement } from 'react';
import { cn } from '@/lib/cn';

export type TooltipPlacement = 'top' | 'bottom';
export type TooltipAlign = 'start' | 'center' | 'end';

const PLACEMENTS: Record<TooltipPlacement, string> = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
};

const ALIGNS: Record<TooltipAlign, string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

/**
 * Bolha escura com o motivo de uma ação — o mesmo preto do toast, sem seta.
 * Abre no hover, no foco pelo teclado e no toque; fecha no Esc, ao sair com o
 * mouse ou com o foco e ao tocar fora. O clique só abre: clicar no botão
 * bloqueado não pode fazer o motivo sumir.
 *
 * O texto fica sempre no DOM: com a bolha fechada ele é `sr-only`, para o
 * `aria-describedby` do gatilho continuar tendo o que ler.
 *
 * Gatilho bloqueado usa `aria-disabled`, nunca `disabled`: botão desabilitado
 * de verdade não recebe foco nem hover, e o motivo nunca apareceria para quem
 * navega pelo teclado.
 */
export function Tooltip({
  label,
  placement = 'top',
  align = 'center',
  children,
}: {
  label: string;
  placement?: TooltipPlacement;
  align?: TooltipAlign;
  /** Um único elemento: recebe o `aria-describedby` da bolha. */
  children: ReactElement<{ 'aria-describedby'?: string }>;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <span
      ref={wrapper}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen(true)}
    >
      {cloneElement(children, { 'aria-describedby': id })}
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'animate-fade-in pointer-events-none absolute z-60 w-max max-w-64 rounded-sm bg-gray-800 px-3 py-2 text-caption text-white shadow-high',
            PLACEMENTS[placement],
            ALIGNS[align],
          )}
        >
          {label}
        </span>
      ) : (
        <span id={id} role="tooltip" className="sr-only">
          {label}
        </span>
      )}
    </span>
  );
}
