'use client';

import { CheckCircle2, CircleAlert } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';

const EXIT_MS = 200;
const DEFAULT_DURATION = 3000;
/** Com ação ("Ver sacola") a pessoa precisa de tempo para alcançar o botão (WCAG 2.2.1). */
const ACTION_DURATION = 5000;

export interface ToastOptions {
  message: string;
  tone?: 'neutral' | 'success' | 'error';
  action?: { label: string; onClick: () => void };
  /** Tempo na tela em ms (padrão 3000). */
  duration?: number;
}

interface ToastEntry extends ToastOptions {
  id: number;
  leaving: boolean;
}

type ToastFn = (options: ToastOptions | string) => void;

const ToastContext = createContext<ToastFn | null>(null);

/**
 * Snackbar do iFood: faixa escura no rodapé, uma por vez (a nova substitui a
 * atual), some sozinha. A região aria-live fica sempre montada — é isso que
 * faz o leitor de tela anunciar a mensagem.
 *
 * Limite conhecido: <dialog> modal vive no top layer e cobre o toast. Dentro de
 * sheets use feedback inline (ícone Copy -> Check) ou feche o sheet antes.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<ToastEntry | null>(null);
  const nextId = useRef(0);
  const timer = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setCurrent((entry) => (entry ? { ...entry, leaving: true } : entry));
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCurrent(null), EXIT_MS);
  }, []);

  const toast = useCallback<ToastFn>(
    (options) => {
      const normalized = typeof options === 'string' ? { message: options } : options;
      nextId.current += 1;
      if (timer.current !== null) window.clearTimeout(timer.current);
      setCurrent({ ...normalized, id: nextId.current, leaving: false });
      timer.current = window.setTimeout(
        dismiss,
        normalized.duration ?? (normalized.action ? ACTION_DURATION : DEFAULT_DURATION),
      );
    },
    [dismiss],
  );

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Acima da barra inferior da loja (--bottom-bar-height) e da área segura do aparelho. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-bar-height)+0.5rem+var(--safe-bottom))] z-80 flex justify-center px-4"
      >
        {current && (
          <div
            key={current.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-sm bg-gray-800 px-4 py-3 text-body2 text-white shadow-high',
              current.leaving ? 'animate-toast-out' : 'animate-toast-in',
            )}
          >
            {current.tone === 'success' && (
              <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-positive" />
            )}
            {current.tone === 'error' && (
              <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-error" />
            )}
            <p className="min-w-0 flex-1">{current.message}</p>
            {current.action && (
              <button
                type="button"
                onClick={() => {
                  current.action?.onClick();
                  dismiss();
                }}
                className="press shrink-0 rounded-xs font-semibold text-primary-tint"
              >
                {current.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return toast;
}
