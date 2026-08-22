'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/components/store/store-provider';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { calculateUnitPrice } from '@/lib/whatsapp';
import type { CartLineSelections, MenuItem } from '@/lib/types';

/** Escolha de complementos, quantidade e observação de um item do cardápio. */
export function ItemOrderPanel({ item }: { item: MenuItem }) {
  const { addItem, openCart } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [selections, setSelections] = useState<CartLineSelections>(() => {
    const initial: CartLineSelections = {};
    for (const group of item.options) {
      if (group.type === 'single' && group.required && group.choices[0]) {
        initial[group.id] = group.choices[0].id;
      }
      if (group.type === 'multi') initial[group.id] = [];
    }
    return initial;
  });

  const unitPrice = useMemo(() => calculateUnitPrice(item, selections), [item, selections]);

  const toggleMulti = (groupId: string, choiceId: string, max: number | null) => {
    setSelections((current) => {
      const chosen = Array.isArray(current[groupId]) ? (current[groupId] as string[]) : [];
      if (chosen.includes(choiceId)) {
        return { ...current, [groupId]: chosen.filter((id) => id !== choiceId) };
      }
      if (max && chosen.length >= max) return current;
      return { ...current, [groupId]: [...chosen, choiceId] };
    });
  };

  const handleAdd = () => {
    const missing = item.options.find((group) => {
      if (!group.required) return false;
      const chosen = selections[group.id];
      return Array.isArray(chosen) ? chosen.length === 0 : !chosen;
    });
    if (missing) {
      setError(`Escolha uma opção em “${missing.name}”.`);
      return;
    }
    setError('');
    addItem(item.id, quantity, selections, notes);
    openCart('cart');
  };

  if (!item.available) {
    return (
      <div className="surface p-6">
        <p className="font-semibold">Item indisponível no momento</p>
        <p className="mt-1 text-sm text-ink-500">
          Este prato saiu temporariamente do cardápio. Confira as outras opções.
        </p>
      </div>
    );
  }

  return (
    <div className="surface p-6">
      {item.options.map((group) => {
        const chosen = selections[group.id];
        const selectedList = Array.isArray(chosen) ? chosen : [];
        const limitReached = group.type === 'multi' && group.max ? selectedList.length >= group.max : false;

        return (
          <fieldset key={group.id} className="mb-6 border-b border-ink-200 pb-4 last:border-b-0">
            <legend className="flex w-full items-center justify-between gap-3 pb-2">
              <span className="font-display text-base font-semibold">{group.name}</span>
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                  group.required
                    ? 'bg-(--tenant-brand) text-(--tenant-brand-text)'
                    : 'bg-ink-100 text-ink-500',
                )}
              >
                {group.required ? 'Obrigatório' : `Opcional${group.max ? ` · até ${group.max}` : ''}`}
              </span>
            </legend>

            <div className="divide-y divide-ink-200">
              {group.choices.map((choice) => {
                const isMulti = group.type === 'multi';
                const checked = isMulti ? selectedList.includes(choice.id) : chosen === choice.id;
                return (
                  <label
                    key={choice.id}
                    className="flex cursor-pointer items-center gap-3 py-3 text-sm has-disabled:cursor-not-allowed has-disabled:opacity-50"
                  >
                    <input
                      type={isMulti ? 'checkbox' : 'radio'}
                      name={`${item.id}-${group.id}`}
                      value={choice.id}
                      checked={checked}
                      disabled={isMulti && limitReached && !checked}
                      onChange={() =>
                        isMulti
                          ? toggleMulti(group.id, choice.id, group.max)
                          : setSelections((current) => ({ ...current, [group.id]: choice.id }))
                      }
                      className="size-5 accent-(--tenant-brand)"
                    />
                    <span className="flex-1">{choice.name}</span>
                    {choice.price > 0 && (
                      <span className="text-sm font-semibold text-ink-500">
                        + {formatPrice(choice.price)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="mb-6">
        <label htmlFor={`notes-${item.id}`} className="mb-1.5 block font-display text-base font-semibold">
          Alguma observação?
        </label>
        <textarea
          id={`notes-${item.id}`}
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex.: sem cebola, ponto da carne bem passado"
          className="w-full rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-base outline-none focus:border-(--tenant-brand)"
        />
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-ink-100 px-3 py-2 text-sm text-ink-950">
          {error}
        </p>
      )}

      {/* No celular a ação fica fixa no rodapé, como nos apps de delivery. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-ink-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift sm:static sm:border-0 sm:p-0 sm:shadow-none">
        <div className="flex items-center gap-1 rounded-xl border border-ink-200 p-1">
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            className="grid size-10 place-items-center rounded-lg bg-ink-100 text-xl leading-none"
          >
            <span aria-hidden="true">−</span>
            <span className="sr-only">Diminuir quantidade</span>
          </button>
          <span className="min-w-10 text-center font-semibold" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            className="grid size-10 place-items-center rounded-lg bg-ink-100 text-xl leading-none"
          >
            <span aria-hidden="true">+</span>
            <span className="sr-only">Aumentar quantidade</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-(--tenant-brand) px-6 py-3.5 font-semibold text-(--tenant-brand-text) transition-opacity hover:opacity-90"
        >
          Adicionar <span>{formatPrice(unitPrice * quantity)}</span>
        </button>
      </div>
    </div>
  );
}
