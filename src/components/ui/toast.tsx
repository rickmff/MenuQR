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
 * Onde o toast pousa. Classes literais por lugar (nunca montadas):
 *
 * - `store`: acima da barra inferior da loja (`--bottom-bar-height`: a
 *   CartBar e o CTA do prato) e da área segura do aparelho.
 * - `panel`: acima da barra de "Salvar" grudada no pé, quando houver uma
 *   (`--panel-bottom-inset`, ver `painel/bottom-inset.ts`), e da pílula do
 *   guia de configuração (16px de margem + 44px de pílula + 16px de folga —
 *   os mesmos 4,75rem da loja). Antes o toast do painel usava a altura da
 *   barra da loja e caía sobre a faixa "Não foi salvo" do formulário. Com o
 *   guia aberto no canto (`data-setup-docked`, a partir de `lg` ou de `xl`), o
 *   toast se centra no que sobra à esquerda dele, como a coluna: centrado na
 *   janela, entre `lg` e `xl` ele cobria o "Continuar configuração".
 */
const PLACEMENTS = {
  store: 'bottom-[calc(var(--bottom-bar-height)+0.5rem+var(--safe-bottom))]',
  panel:
    'bottom-[calc(var(--panel-bottom-inset,0px)+4.75rem+var(--safe-bottom))] lg:[html:has([data-setup-docked=lg])_&]:pr-(--setup-guide-reserve) xl:[html:has([data-setup-docked=xl])_&]:pr-(--setup-guide-reserve)',
} as const;

/**
 * Snackbar do iFood: faixa escura no rodapé, uma por vez (a nova substitui a
 * atual), some sozinha. A região aria-live fica sempre montada — é isso que
 * faz o leitor de tela anunciar a mensagem.
 *
 * Limite conhecido: <dialog> modal vive no top layer e cobre o toast. Dentro de
 * sheets use feedback inline (ícone Copy -> Check) ou feche o sheet antes.
 */
export function ToastProvider({
  children,
  placement = 'store',
}: {
  children: ReactNode;
  /** A loja (padrão) ou o painel do lojista. */
  placement?: keyof typeof PLACEMENTS;
}) {
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
      {/* Acima do que ocupa o pé da tela (ver `PLACEMENTS`). */}
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed inset-x-0 z-80 flex justify-center px-4',
          PLACEMENTS[placement],
        )}
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
