import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Nada para mostrar: ícone de linha em cinza, um título e, se ajudar, uma
 * frase e a ação que tira a pessoa dali.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: {
  /** Ícone Lucide, já com o tamanho (`size-12`). */
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** hero: o estado vazio é a tela inteira (sacola vazia) — ícone num círculo e título grande. */
  variant?: 'default' | 'hero';
  className?: string;
}) {
  const hero = variant === 'hero';
  return (
    <div className={cn('flex animate-fade-in flex-col items-center px-6 py-12 text-center', className)}>
      <span
        aria-hidden="true"
        className={hero ? 'grid size-24 place-items-center rounded-full bg-gray-100 text-gray-600' : 'text-gray-400'}
      >
        {icon}
      </span>
      <p
        className={
          hero
            ? 'mt-6 font-display text-h5 font-bold text-gray-900'
            : 'mt-4 text-subtitle font-semibold text-gray-700'
        }
      >
        {title}
      </p>
      {description && (
        <p className={cn('max-w-sm text-gray-600', hero ? 'mt-2 text-body1' : 'mt-1 text-body2')}>{description}</p>
      )}
      {action && <div className={hero ? 'mt-8' : 'mt-6'}>{action}</div>}
    </div>
  );
}
