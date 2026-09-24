import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Uma informação operacional da loja — "30-45 min / Tempo de entrega": ícone
 * num círculo cinza, o valor em destaque e a legenda embaixo. Duas lado a lado
 * no cabeçalho da loja, como nos apps de delivery.
 */
export function InfoCell({
  icon,
  value,
  label,
  tone = 'neutral',
  className,
}: {
  /** Ícone Lucide sem tamanho: a célula põe 16px. */
  icon: ReactNode;
  value: ReactNode;
  label: string;
  /** positive: o valor é uma boa notícia ("Grátis") e vai em verde. */
  tone?: 'neutral' | 'positive';
  className?: string;
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-700 [&>svg]:size-4"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'truncate text-body1 font-semibold',
            tone === 'positive' ? 'text-positive' : 'text-gray-900',
          )}
        >
          {value}
        </p>
        <p className="truncate text-body2 text-gray-600">{label}</p>
      </div>
    </div>
  );
}
