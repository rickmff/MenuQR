import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A moldura do `TextField` (rótulo, dica, erro) para os campos que não são um
 * <input> simples: o link com o domínio do lado de dentro, o telefone com o
 * seletor de país, a cor. O mesmo desenho e as mesmas ligações: o erro é
 * `role="alert"` com o id `<id>-error`, a dica `<id>-hint`, e quem chama aponta
 * o campo para eles com `fieldDescription`.
 */
export function FieldFrame({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-body2 font-medium text-gray-700">
        {label}
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

/** O `aria-describedby` do campo: o erro quando há, senão a dica. */
export function fieldDescription(id: string, hint?: string, error?: string): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

/**
 * A borda do `TextField` posta num contêiner — para o campo que tem um pedaço
 * fixo do lado de dentro (o domínio antes do link). Engrossa no foco de
 * qualquer coisa dentro dele e fica vermelha no erro.
 */
export function framedFieldClass(invalid: boolean, extra?: string): string {
  return cn(
    'flex h-12 items-center rounded-sm border bg-white px-4 transition-[border-color,box-shadow] duration-150 ease-standard',
    invalid
      ? 'border-error focus-within:shadow-[inset_0_0_0_1px_var(--color-error)]'
      : 'border-gray-300 focus-within:border-primary focus-within:shadow-[inset_0_0_0_1px_var(--color-primary)]',
    extra,
  );
}
