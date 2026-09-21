'use client';

import { X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { cn } from '@/lib/cn';

/** Duração da saída; precisa bater com --animate-sheet-out / --animate-pop-out. */
const EXIT_MS = 200;
/** Fração da altura que, arrastada para baixo, fecha o sheet. */
const DRAG_TO_CLOSE = 0.3;

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** Mostra o cabeçalho padrão (título + fechar). Sem título, o conteúdo traz a própria AppBar. */
  title?: string;
  /** id de um título que já existe no conteúdo (use com a AppBar da Sacola). */
  labelledBy?: string;
  ariaLabel?: string;
  children: ReactNode;
  /** Rodapé fixo (barra de ação), já com safe-area. */
  footer?: ReactNode;
  /** auto: altura do conteúdo até 90dvh, com alça · full: tela cheia (Sacola). */
  snap?: 'auto' | 'full';
  /** De onde entra no mobile. A Sacola entra pela direita, como página. */
  enterFrom?: 'bottom' | 'right';
  /** Em telas lg: vira dialog centrado (padrão) ou continua sheet. */
  desktop?: 'dialog' | 'sheet';
  /** Desligue se outro dono (o StoreProvider) já trava a rolagem do body. */
  lockScroll?: boolean;
  className?: string;
}

/**
 * Bottom sheet / dialog do iFood sobre o <dialog> nativo: showModal() entrega
 * foco preso, Esc, top layer e fundo inerte. O componente acrescenta o que o
 * navegador não dá — saída animada com desmontagem adiada, scrim próprio
 * (animável), arrastar para fechar e devolução do foco ao gatilho.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  labelledBy,
  ariaLabel,
  children,
  footer,
  snap = 'auto',
  enterFrom = 'bottom',
  desktop = 'dialog',
  lockScroll = true,
  className,
}: BottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; height: number } | null>(null);
  const titleId = useId();

  // `rendered` acompanha `open` na entrada e só cai depois da animação de saída.
  const [rendered, setRendered] = useState(open);
  const [previousOpen, setPreviousOpen] = useState(open);
  if (open !== previousOpen) {
    setPreviousOpen(open);
    if (open) setRendered(true);
  }
  const closing = rendered && !open;

  useEffect(() => {
    if (open || !rendered) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setRendered(false), reduce ? 0 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, rendered]);

  useEffect(() => {
    if (!rendered) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    // showModal() focaria o primeiro controle (o "fechar"), acendendo o anel de foco. O foco vai
    // para o painel — ou para quem o conteúdo marcar com data-autofocus (o campo de busca).
    const preferred = dialog.querySelector<HTMLElement>('[data-autofocus]');
    (preferred ?? panelRef.current)?.focus({ preventScroll: true });
    return () => {
      if (dialog.open) dialog.close();
      previous?.focus({ preventScroll: true });
    };
  }, [rendered]);

  useEffect(() => {
    if (!rendered || !lockScroll) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [rendered, lockScroll]);

  if (!rendered) return null;

  // Esc dispara `cancel`: cancelamos o fechamento nativo para poder animar a saída.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    drag.current = { startY: event.clientY, height: panel.offsetHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
    panel.style.transition = 'none';
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    const state = drag.current;
    if (!panel || !state) return;
    panel.style.transform = `translateY(${Math.max(0, event.clientY - state.startY)}px)`;
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    const state = drag.current;
    drag.current = null;
    if (!panel || !state) return;
    const distance = Math.max(0, event.clientY - state.startY);
    panel.style.transition = '';
    panel.style.transform = '';
    if (distance > state.height * DRAG_TO_CLOSE) {
      // A animação de saída parte de onde o dedo soltou (ver @keyframes slide-down).
      panel.style.setProperty('--drag-y', `${distance}px`);
      onClose();
    }
  };

  const fromRight = enterFrom === 'right';
  const asDialog = desktop === 'dialog';

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      aria-labelledby={labelledBy ?? (title !== undefined ? titleId : undefined)}
      aria-label={labelledBy === undefined && title === undefined ? ariaLabel : undefined}
      className={cn(
        'fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-gray-700 backdrop:bg-transparent open:flex',
        'items-end justify-center',
        asDialog && 'lg:items-center',
      )}
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn('absolute inset-0 bg-scrim', closing ? 'animate-fade-out' : 'animate-fade-in')}
      />

      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          // overflow-hidden: sem ele o rodapé branco cobre os cantos arredondados do dialog.
          'relative flex w-full flex-col overflow-hidden bg-white shadow-high outline-none',
          snap === 'full' ? 'h-dvh' : 'max-h-[90dvh] rounded-t-lg',
          fromRight
            ? closing
              ? 'animate-slide-out-right'
              : 'animate-slide-in-right'
            : closing
              ? 'animate-sheet-out'
              : 'animate-sheet-in',
          asDialog && 'lg:h-auto lg:max-h-[85dvh] lg:max-w-md lg:rounded-lg lg:shadow-highest',
          asDialog && (closing ? 'lg:animate-pop-out' : 'lg:animate-pop-in'),
          className,
        )}
      >
        {snap === 'auto' && (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            className={cn(
              'flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2',
              asDialog && 'lg:hidden',
            )}
          >
            <span aria-hidden="true" className="h-1 w-9 rounded-full bg-gray-300" />
          </div>
        )}

        {title !== undefined && (
          <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-2">
            <h2 id={titleId} className="text-subtitle font-bold text-gray-700">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="press grid size-10 shrink-0 place-items-center rounded-full text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            >
              <X aria-hidden="true" className="size-6" />
            </button>
          </header>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer !== undefined && (
          <div className="shrink-0 border-t border-gray-200 bg-white px-4 pt-4 pb-safe-4 lg:pb-4">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}
