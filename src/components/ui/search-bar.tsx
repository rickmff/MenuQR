'use client';

import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';

/**
 * Campo de busca dos apps de delivery: pílula cinza com a lupa, o "x" que
 * limpa e, fora dela, "Cancelar". Enter fecha o teclado (a lista já filtra
 * enquanto a pessoa digita); Esc cancela.
 *
 * Quem abre o campo foca pelo id DENTRO do toque (`flushSync` + `focus()`): no
 * iOS o teclado só aparece se o foco acontecer no mesmo gesto, e `autoFocus`
 * num campo recém-montado não garante isso.
 */
export function SearchBar({
  id,
  value,
  onChange,
  onClear,
  onCancel,
  placeholder: placeholderProp,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onCancel?: () => void;
  placeholder?: string;
  className?: string;
}) {
  const t = useTranslations('ui.searchBar');
  const tCommon = useTranslations('common');
  const placeholder = placeholderProp ?? t('placeholder');
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === 'Escape' && onCancel) {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-gray-100 pl-4 transition-colors duration-150 ease-standard focus-within:bg-white focus-within:shadow-medium">
        <Search aria-hidden="true" className="size-5 shrink-0 text-gray-400" />
        <input
          id={id}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          enterKeyHint="search"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-body1 text-gray-700 outline-none placeholder:text-gray-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={t('clear')}
            className="press grid size-11 shrink-0 cursor-pointer place-items-center rounded-full text-gray-600 active:bg-gray-200"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
      </div>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="press h-11 shrink-0 cursor-pointer rounded-full px-2 text-body1 font-semibold text-primary active:bg-gray-100"
        >
          {tCommon('cancel')}
        </button>
      )}
    </div>
  );
}
