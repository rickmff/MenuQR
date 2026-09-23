'use client';

import { cn } from '@/lib/cn';

/**
 * Interruptor do iFood: trilho cinza que fica verde, bolinha branca que
 * desliza em 150ms. É um <button role="switch">, então Espaço e Enter
 * alternam e o leitor de tela anuncia "ligado/desligado". O rótulo não
 * aparece: quem chama já mostra do que se trata ao lado.
 */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Nome acessível (vira `aria-label`). */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ease-standard disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-positive' : 'bg-gray-300',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-low transition-transform duration-150 ease-standard',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}
