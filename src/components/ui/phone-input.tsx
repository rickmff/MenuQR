'use client';

import { ChevronDown, Search } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/cn';
import { onlyDigits } from '@/lib/format';
import {
  callingCodeOf,
  countryName,
  countryOptions,
  exampleNumber,
  formatNational,
  joinWhatsapp,
  readInternational,
  splitWhatsapp,
  type CountryCode,
} from '@/lib/phone';

export interface PhoneInputProps {
  /** Vai no campo visível: é nele que o `<label>` encosta. */
  id: string;
  /** Nome enviado no formulário. O valor sai como E.164: "+5511987654321". */
  name: string;
  /** Número guardado (só dígitos, com código do país). */
  defaultValue?: string;
  invalid?: boolean;
  required?: boolean;
  /** Id da dica ou do erro que descreve o campo (`aria-describedby` do número). */
  describedBy?: string;
  /**
   * Avisa a cada mudança do valor enviado — inclusive a troca de país, que não
   * passa por evento de input e por isso não chegava ao formulário.
   */
  onValueChange?: (value: string) => void;
}

/**
 * Campo de telefone com seletor de país. O lojista escolhe o país (ou cola um
 * número internacional, que o campo reconhece sozinho) e digita o resto com a
 * máscara daquele país; o formulário recebe um só valor, em E.164.
 *
 * O seletor é uma lista própria com busca, e não um `<select>`: são 245 países,
 * e achar "Portugal" rolando uma lista nativa é pior do que digitar "port".
 * Segue o padrão combobox + `aria-activedescendant` — o foco fica na busca e a
 * opção ativa é anunciada por ela.
 */
export function PhoneInput({
  id,
  name,
  defaultValue = '',
  invalid = false,
  required = false,
  describedBy,
  onValueChange,
}: PhoneInputProps) {
  const initial = useMemo(() => splitWhatsapp(defaultValue), [defaultValue]);
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [national, setNational] = useState(initial.national);
  const numberRef = useRef<HTMLInputElement>(null);

  const stored = joinWhatsapp(country, national);

  /** Troca o valor e avisa quem escuta, com o número no formato enviado. */
  const apply = (nextCountry: CountryCode, nextNational: string) => {
    setCountry(nextCountry);
    setNational(nextNational);
    const next = joinWhatsapp(nextCountry, nextNational);
    onValueChange?.(next ? `+${next}` : '');
  };

  const handleChange = (raw: string) => {
    // Número colado com "+": o país vem do próprio número e o seletor acompanha.
    if (raw.trim().startsWith('+')) {
      const international = readInternational(raw);
      if (!international) {
        apply(country, raw);
        return;
      }
      apply(international.country, international.national);
      return;
    }

    /*
     * Apagar um caractere da máscara não pode devolver o mesmo texto: sem isto,
     * o backspace em cima de ") " remonta a formatação e o campo trava.
     */
    const digits = onlyDigits(raw);
    const erasedMask = raw.length < national.length && digits === onlyDigits(national);
    apply(country, formatNational(erasedMask ? digits.slice(0, -1) : digits, country));
  };

  const chooseCountry = (next: CountryCode) => {
    apply(next, formatNational(national, next));
    numberRef.current?.focus();
  };

  return (
    <div>
      {/* O foco dos outros campos (`fieldClass`, `framedFieldClass`): a borda
          engrossa para 2px por sombra interna, vermelha enquanto o número está
          recusado. O `focus-within:border-primary` solto vencia o `border-error`
          e deixava o campo verde no meio da correção. */}
      <div
        className={cn(
          'flex h-12 items-center rounded-sm border bg-white transition-[border-color,box-shadow] duration-150 ease-standard',
          invalid
            ? 'border-error focus-within:shadow-[inset_0_0_0_1px_var(--color-error)]'
            : 'border-gray-300 focus-within:border-primary focus-within:shadow-[inset_0_0_0_1px_var(--color-primary)]',
        )}
      >
        <CountryPicker country={country} onSelect={chooseCountry} />
        <span aria-hidden="true" className="h-6 w-px shrink-0 bg-gray-300" />
        <input
          ref={numberRef}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={national}
          onChange={(event) => handleChange(event.target.value)}
          placeholder={exampleNumber(country)}
          className="h-full w-full min-w-0 rounded-r-sm bg-transparent px-4 text-body1 text-gray-700 outline-none placeholder:text-gray-400"
        />
      </div>
      {/* O formulário lê daqui: com o "+", o servidor sabe que o código do país já veio. */}
      <input type="hidden" name={name} value={stored ? `+${stored}` : ''} />
    </div>
  );
}

function CountryPicker({
  country,
  onSelect,
}: {
  country: CountryCode;
  onSelect: (next: CountryCode) => void;
}) {
  const t = useTranslations('ui.phoneInput');
  const locale = useLocale();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const terms = query
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (!terms.length) return countryOptions(locale);
    return countryOptions(locale).filter((option) => terms.every((term) => option.search.includes(term)));
  }, [query, locale]);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const closeOnOutside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  // A opção ativa acompanha o teclado: sem isto ela some da parte visível da lista.
  useEffect(() => {
    if (!open) return;
    list.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setQuery('');
    setActive(Math.max(countryOptions(locale).findIndex((option) => option.code === country), 0));
  };

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const choose = (code: CountryCode) => {
    setOpen(false);
    onSelect(code);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) => Math.min(Math.max(current + step, 0), matches.length - 1));
      return;
    }
    if (event.key === 'Enter') {
      // Sem isto, o Enter da busca envia o formulário inteiro.
      event.preventDefault();
      const option = matches[active];
      if (option) choose(option.code);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={root} className="relative h-full shrink-0">
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('country', { country: countryName(country, locale), code: callingCodeOf(country) })}
        className="press flex h-full items-center gap-1.5 rounded-l-sm px-4 text-body2 font-medium text-gray-700 hover:bg-gray-50"
      >
        <span>{country}</span>
        <span className="text-gray-600">+{callingCodeOf(country)}</span>
        <ChevronDown aria-hidden="true" className="size-4 text-gray-400" />
      </button>

      {open && (
        <div className="animate-fade-in absolute left-0 top-full z-30 mt-1 w-72 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-sm border border-gray-200 bg-white shadow-high">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-2.5">
            <Search aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
            <input
              ref={search}
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={matches[active] ? `${listId}-${matches[active].code}` : undefined}
              aria-label={t('searchCountry')}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={t('searchPlaceholder')}
              className="w-full min-w-0 bg-transparent text-body2 text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>

          <ul ref={list} id={listId} role="listbox" aria-label={t('countries')} className="max-h-64 overflow-y-auto py-1">
            {matches.map((option, index) => (
              <li
                key={option.code}
                id={`${listId}-${option.code}`}
                role="option"
                aria-selected={option.code === country}
                onClick={() => choose(option.code)}
                onMouseMove={() => setActive(index)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 px-4 py-2 text-body2',
                  index === active && 'bg-gray-100',
                  option.code === country ? 'font-medium text-gray-700' : 'text-gray-700',
                )}
              >
                <span className="w-6 shrink-0 text-gray-600">{option.code}</span>
                <span className="min-w-0 flex-1 truncate">{option.name}</span>
                <span className="shrink-0 text-gray-600">+{option.callingCode}</span>
              </li>
            ))}
            {!matches.length && (
              <li className="px-4 py-3 text-body2 text-gray-600">{t('noCountry')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
