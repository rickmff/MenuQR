import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BannerTone = 'info' | 'warning' | 'error' | 'success' | 'promo' | 'neutral';

const TONES: Record<BannerTone, { box: string; icon: string }> = {
  info: { box: 'bg-info-bg', icon: 'text-info' },
  warning: { box: 'bg-warning-bg', icon: 'text-gray-700' },
  error: { box: 'bg-error-bg', icon: 'text-error-pressed' },
  success: { box: 'bg-success-bg', icon: 'text-success' },
  promo: { box: 'bg-primary-tint', icon: 'text-primary-pressed' },
  neutral: { box: 'bg-gray-50', icon: 'text-gray-600' },
};

const RADIUS = {
  sm: 'rounded-sm p-3',
  /** Telas do cliente: cantos e respiro de cartão, como os avisos dos apps de delivery. */
  md: 'rounded-md p-4',
} as const;

/**
 * Aviso em faixa, como os do iFood: fundo claro do tom, ícone na cor cheia,
 * texto `gray-700`. Sem borda, sem sombra. `onDismiss` acrescenta o "x".
 */
export function Banner({
  tone = 'neutral',
  icon,
  title,
  children,
  onDismiss,
  role,
  radius = 'sm',
  className,
}: {
  tone?: BannerTone;
  icon?: ReactNode;
  title?: string;
  children?: ReactNode;
  onDismiss?: () => void;
  role?: 'status' | 'alert';
  radius?: keyof typeof RADIUS;
  className?: string;
}) {
  return (
    <div role={role} className={cn('flex gap-3 text-body2 text-gray-700', RADIUS[radius], TONES[tone].box, className)}>
      {icon && (
        <span aria-hidden="true" className={cn('mt-0.5 shrink-0', TONES[tone].icon)}>
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dispensar aviso"
          className="press -m-1.5 grid size-8 shrink-0 place-items-center self-start rounded-full text-gray-700 active:bg-black/5"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </div>
  );
}
