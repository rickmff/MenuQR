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
  className,
}: {
  /** Ícone Lucide, já com o tamanho (`size-12`). */
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex animate-fade-in flex-col items-center px-6 py-12 text-center', className)}>
      <span aria-hidden="true" className="text-gray-400">
        {icon}
      </span>
      <p className="mt-4 text-subtitle font-semibold text-gray-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-body2 text-gray-600">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
