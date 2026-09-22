import { ChevronDown } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

/** Campo do iFood: 48px, raio 8, borda `gray-300` que vira `primary` no foco. Sem anel difuso. */
export function fieldClass(invalid: boolean, extra?: string): string {
  return cn(
    'w-full rounded-sm border bg-white px-4 text-body1 text-gray-700 transition-colors duration-150 ease-standard placeholder:text-gray-400 focus:outline-none',
    invalid ? 'border-error' : 'border-gray-300 focus:border-primary',
    extra,
  );
}

/**
 * Rótulo, campo, dica e erro — a mesma moldura para input, select e textarea.
 * O erro é `role="alert"` e o campo aponta para ele por `aria-describedby`.
 */
function FieldShell({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: FieldShellProps & { children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-body2 font-medium text-gray-700">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="text-gray-600">
              {' '}
              *
            </span>
            <span className="sr-only"> (obrigatório)</span>
          </>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-caption text-gray-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-caption font-medium text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function TextField({
  id,
  label,
  hint,
  error,
  required,
  className,
  ...input
}: FieldShellProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        {...input}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={fieldClass(Boolean(error), 'h-12')}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
  ...select
}: FieldShellProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'className'>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        <select
          {...select}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, hint, error)}
          className={fieldClass(Boolean(error), 'h-12 appearance-none pr-10')}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-gray-600"
        />
      </div>
    </FieldShell>
  );
}

export function TextArea({
  id,
  label,
  hint,
  error,
  required,
  className,
  ...textarea
}: FieldShellProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'className'>) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        {...textarea}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={fieldClass(Boolean(error), 'min-h-24 resize-none py-3')}
      />
    </FieldShell>
  );
}
