'use client';

import { MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { OptionGroup, optionGroupId } from '@/components/store/option-group';
import { useStore } from '@/components/store/store-provider';
import { useSearchParam } from '@/components/store/use-search-param';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { useToast } from '@/components/ui/toast';
import { formatPrice } from '@/lib/format';
import { calculateUnitPrice } from '@/lib/whatsapp';
import type { CartLineSelections, MenuItem, MenuOptionGroup } from '@/lib/types';

const NOTES_MAX = 140;

/** Nada vem pré-escolhido: é a escolha do cliente que libera o botão. */
function emptySelections(item: MenuItem): CartLineSelections {
  const initial: CartLineSelections = {};
  for (const group of item.options) if (group.type !== 'single') initial[group.id] = [];
  return initial;
}

/** As escolhas guardadas numa linha da sacola, completadas com os grupos que ela não tinha. */
function selectionsOf(item: MenuItem, stored: CartLineSelections): CartLineSelections {
  return { ...emptySelections(item), ...stored };
}

function firstMissing(item: MenuItem, selections: CartLineSelections): MenuOptionGroup | undefined {
  return item.options.find((group) => {
    if (!group.required) return false;
    const chosen = selections[group.id];
    return Array.isArray(chosen) ? chosen.length === 0 : !chosen;
  });
}

/**
 * Escolha de complementos, quantidade e observação de um item do cardápio.
 *
 * Também é a tela de EDITAR uma linha da sacola: com `?editar=<uid>` na URL o
 * prato abre como está na sacola e o botão vira "Atualizar", que regrava a
 * linha e devolve a pessoa à sacola — como no iFood.
 */
export function ItemOrderPanel({ item }: { item: MenuItem }) {
  const { cart, addItem, updateLine, openCart, basePath } = useStore();
  const toast = useToast();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selections, setSelections] = useState<CartLineSelections>(() => emptySelections(item));
  const [announcement, setAnnouncement] = useState('');

  // A sacola só chega depois da hidratação, então a linha em edição é copiada
  // para o estado assim que aparece — uma vez por uid (ajuste de estado durante
  // o render, o mesmo padrão de bottom-sheet.tsx). Uid de outro prato é ignorado.
  const editUid = useSearchParam('editar');
  const editingLine = editUid
    ? cart.find((line) => line.uid === editUid && line.itemId === item.id)
    : undefined;
  const [loadedUid, setLoadedUid] = useState('');
  if (editingLine && loadedUid !== editingLine.uid) {
    setLoadedUid(editingLine.uid);
    setQuantity(editingLine.quantity);
    setNotes(editingLine.notes);
    setSelections(selectionsOf(item, editingLine.selections));
  }

  const unitPrice = useMemo(() => calculateUnitPrice(item, selections), [item, selections]);
  const missing = firstMissing(item, selections);

  /** +1 acrescenta uma unidade (ou marca); −1 tira a última (ou desmarca). */
  const adjust = (group: MenuOptionGroup, choiceId: string, delta: 1 | -1) => {
    setSelections((current) => {
      const chosen = Array.isArray(current[group.id]) ? (current[group.id] as string[]) : [];
      if (delta < 0) {
        const index = chosen.lastIndexOf(choiceId);
        if (index === -1) return current;
        return { ...current, [group.id]: chosen.filter((_, position) => position !== index) };
      }
      if (group.max !== null && chosen.length >= group.max) return current;
      // Tirar um ingrediente é sim ou não: não se repete.
      if (group.type === 'remove' && chosen.includes(choiceId)) return current;
      return { ...current, [group.id]: [...chosen, choiceId] };
    });
  };

  /**
   * Toque no "Adicionar" cinza: em vez de nada acontecer, a página rola até o
   * grupo que falta — o selo OBRIGATÓRIO dele explica o porquê — e o foco vai
   * para a primeira opção.
   */
  const revealMissing = () => {
    if (!missing) return;
    const section = document.getElementById(optionGroupId(missing.id));
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    section?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true });
    setAnnouncement(`Escolha uma opção em “${missing.name}” para continuar.`);
  };

  const handleSubmit = () => {
    if (missing) return;
    if (editingLine) {
      updateLine(editingLine.uid, quantity, selections, notes);
      // A edição saiu da sacola: a linha atualizada aparece lá, como no iFood.
      openCart('cart');
      router.push(basePath);
      return;
    }
    addItem(item.id, quantity, selections, notes);
    // Como no iFood: volta ao cardápio, avisa e a barra da sacola sobe.
    toast('Adicionado à sacola');
    router.push(basePath);
  };

  if (!item.available) {
    return (
      <div className="mx-4 my-5">
        <Banner tone="neutral" title="Item indisponível no momento">
          Este prato saiu temporariamente do cardápio. Confira as outras opções.
        </Banner>
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
          onAdjust={(choiceId, delta) => adjust(group, choiceId, delta)}
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
          <span
            className={`text-caption tabular-nums ${notes.length >= NOTES_MAX ? 'text-error' : 'text-gray-600'}`}
            aria-live="polite"
          >
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

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* No celular a ação fica fixa no rodapé; no painel do desktop é o rodapé do card. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-gray-200 bg-white px-4 pt-3 pb-safe-4 lg:static lg:mt-5 lg:pb-4">
        <Stepper value={quantity} min={1} max={99} onChange={setQuantity} label={item.name} />
        {/* Bloqueado, o botão ignora o clique (aria-disabled) mas o evento sobe até aqui:
            é assim que o toque no cinza leva ao grupo que falta. */}
        <div className="min-w-0 flex-1" onClick={missing ? revealMissing : undefined}>
          <Button
            fullWidth
            trailing={formatPrice(unitPrice * quantity)}
            aria-disabled={missing ? true : undefined}
            onClick={handleSubmit}
          >
            {editingLine ? 'Atualizar' : 'Adicionar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
