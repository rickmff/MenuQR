'use client';

import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { cn } from '@/lib/cn';

export type TooltipPlacement = 'top' | 'bottom';
export type TooltipAlign = 'start' | 'center' | 'end';

const PLACEMENTS: Record<TooltipPlacement, string> = {
  top: 'bottom-full mb-2',
  bottom: 'top-full mt-2',
};

/**
 * O alinhamento pedido vale a partir do `sm`. No celular a bolha nasce sempre
 * no início do gatilho: com `end` num botão encostado na margem esquerda ela
 * saía pela borda da tela (o motivo de "Publicar cardápio" aparecia cortado).
 */
const ALIGNS: Record<TooltipAlign, string> = {
  start: 'left-0',
  center: 'left-0 sm:left-1/2 sm:-translate-x-1/2',
  end: 'left-0 sm:left-auto sm:right-0',
};

/** Folga mínima entre a bolha e a borda da janela, a mesma do gutter do painel. */
const EDGE = 16;

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
  const bubble = useRef<HTMLSpanElement>(null);

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

  // As classes de alinhamento resolvem o caso comum; o que ainda sobrar para
  // fora da janela (gatilho no meio da linha, texto longo) é empurrado de volta
  // aqui, medindo antes da pintura. Escreve no DOM, não em estado: é só posição.
  useLayoutEffect(() => {
    const element = bubble.current;
    if (!open || !element) return;
    element.style.transform = '';
    const rect = element.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    let shift = 0;
    if (rect.right > width - EDGE) shift = width - EDGE - rect.right;
    if (rect.left + shift < EDGE) shift = EDGE - rect.left;
    if (shift !== 0) element.style.transform = `translateX(${Math.round(shift)}px)`;
  }, [open, label]);

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
          ref={bubble}
          id={id}
          role="tooltip"
          className={cn(
            'animate-fade-in pointer-events-none absolute z-60 w-max max-w-[min(16rem,calc(100vw-2rem))] rounded-sm bg-gray-800 px-3 py-2 text-caption text-white shadow-high',
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
