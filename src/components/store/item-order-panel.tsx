'use client';

import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { OptionGroup } from '@/components/store/option-group';
import { useStore } from '@/components/store/store-provider';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { useToast } from '@/components/ui/toast';
import { formatPrice } from '@/lib/format';
import { calculateUnitPrice } from '@/lib/whatsapp';
import type { CartLineSelections, MenuItem } from '@/lib/types';

const NOTES_MAX = 140;

/** Escolha de complementos, quantidade e observação de um item do cardápio. */
export function ItemOrderPanel({ item }: { item: MenuItem }) {
  const { addItem, basePath } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  // Nada vem pré-escolhido: é a escolha do cliente que libera o botão.
  const [selections, setSelections] = useState<CartLineSelections>(() => {
    const initial: CartLineSelections = {};
    for (const group of item.options) if (group.type === 'multi') initial[group.id] = [];
    return initial;
  });

  const unitPrice = useMemo(() => calculateUnitPrice(item, selections), [item, selections]);

  const missing = item.options.find((group) => {
    if (!group.required) return false;
    const chosen = selections[group.id];
    return Array.isArray(chosen) ? chosen.length === 0 : !chosen;
  });

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
    if (missing) {
      setError(`Escolha uma opção em “${missing.name}”.`);
      return;
    }
    setError('');
    addItem(item.id, quantity, selections, notes);
    // Como no iFood: volta ao cardápio, avisa e a barra da sacola sobe.
    toast('Adicionado à sacola');
    router.push(basePath);
  };

  if (!item.available) {
    return (
      <div className="mx-4 my-5 rounded-sm bg-gray-50 p-4">
        <p className="text-body2 font-semibold text-gray-700">Item indisponível no momento</p>
        <p className="mt-1 text-body2 text-gray-600">
          Este prato saiu temporariamente do cardápio. Confira as outras opções.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-4">
      {item.options.map((group) => (
        <OptionGroup
          key={group.id}
          group={group}
          itemId={item.id}
          selected={selections[group.id]}
          onSelectSingle={(choiceId) => setSelections((current) => ({ ...current, [group.id]: choiceId }))}
          onToggleMulti={(choiceId) => toggleMulti(group.id, choiceId, group.max)}
        />
      ))}

      <div className={item.options.length > 0 ? 'mt-2 border-t-8 border-gray-50 px-4 pt-5' : 'px-4 pt-2'}>
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor={`notes-${item.id}`}
            className="flex items-center gap-2 text-body1 font-semibold text-gray-700"
          >
            <MessageSquare aria-hidden="true" className="size-5" />
            Alguma observação?
          </label>
          <span className="text-caption tabular-nums text-gray-600" aria-live="polite">
            {notes.length}/{NOTES_MAX}
          </span>
        </div>
        <textarea
          id={`notes-${item.id}`}
          rows={3}
          maxLength={NOTES_MAX}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Ex: tirar a cebola, maionese à parte etc."
          className="mt-3 w-full resize-none rounded-sm border border-gray-300 px-4 py-3 text-body1 text-gray-700 transition-colors duration-150 ease-standard placeholder:text-gray-400 focus:border-primary focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="mx-4 mt-3 rounded-sm bg-warning-bg p-3 text-body2 text-gray-700">
          {error}
        </p>
      )}

      {/* No celular a ação fica fixa no rodapé; no painel do desktop é o rodapé do card. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-gray-200 bg-white px-4 pt-3 pb-safe-4 lg:static lg:mt-5 lg:pb-4">
        <Stepper value={quantity} min={1} max={99} onChange={setQuantity} label={item.name} />
        <Button
          className="min-w-0 flex-1"
          trailing={formatPrice(unitPrice * quantity)}
          disabled={Boolean(missing)}
          onClick={handleAdd}
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}
