import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/**
 * Campo das telas de conta novas, na receita do `TextField` da skill
 * ifood-design: rótulo em cima, 48px de altura, raio 8, foco na borda (sem anel
 * difuso). Fica aqui enquanto o primitivo não existe em `src/components/ui/`.
 *
 * As cores da borda são escolhidas por condição, não somadas: sem
 * tailwind-merge, `border-gray-300` e `border-error` juntas disputariam a vez.
 */
export function AuthField({
  id,
  label,
  hint,
  error,
  className,
  ...rest
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const messageId = error ? `${id}-erro` : hint ? `${id}-dica` : undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-body2 font-medium text-gray-700">
        {label}
      </label>
      <input
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className={cn(
          'h-12 w-full rounded-sm border bg-white px-4 text-body1 text-gray-700 transition-colors duration-150 ease-standard placeholder:text-gray-400 focus:outline-none',
          error ? 'border-error' : 'border-gray-300 focus:border-primary',
        )}
      />
      {error ? (
        <p id={messageId} role="alert" className="mt-1 text-caption text-error">
          {error}
        </p>
      ) : (
        hint && (
          <p id={messageId} className="mt-1 text-caption text-gray-600">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
