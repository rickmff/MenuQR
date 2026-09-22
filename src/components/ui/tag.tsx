import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export type TagTone = 'neutral' | 'promo' | 'positive' | 'warning' | 'error' | 'dark';

const TONES: Record<TagTone, string> = {
  neutral: 'bg-gray-100 text-gray-600',
  promo: 'bg-primary-tint text-primary-pressed',
  positive: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-gray-700',
  error: 'bg-error-bg text-error-pressed',
  // O "OBRIGATÓRIO" do iFood: caixa alta por estilo, não por texto.
  dark: 'bg-gray-800 uppercase tracking-wide text-white',
};

/** Rótulo curto: tag de item, status, selo de plano. Raio 4, nunca clicável. */
export function Tag({
  tone = 'neutral',
  size = 'sm',
  className,
  ...rest
}: { tone?: TagTone; size?: 'sm' | 'md' } & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...rest}
      className={cn(
        'inline-flex items-center gap-1 rounded-xs font-bold',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-caption',
        TONES[tone],
        className,
      )}
    />
  );
}
