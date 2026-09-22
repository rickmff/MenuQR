'use client';

import { useState } from 'react';
import { OptionGroup } from '@/components/store/option-group';
import { Button } from '@/components/ui/button';
import { sampleMenu } from '@/lib/demo/sample-data';
import { formatPrice } from '@/lib/format';
import type { CartLineSelections } from '@/lib/types';
import { calculateUnitPrice } from '@/lib/whatsapp';

const item = sampleMenu.flatMap((category) => category.items).find((entry) => entry.options.length > 1)
  ?? sampleMenu.flatMap((category) => category.items).find((entry) => entry.options.length > 0)!;

/**
 * Os grupos de complementos da página do item, reais, com o preço do botão
 * respondendo a cada escolha — a mesma função que fecha a sacola de verdade.
 */
export function DemoOptions() {
  const [selections, setSelections] = useState<CartLineSelections>(() => {
    const initial: CartLineSelections = {};
    for (const group of item.options) if (group.type === 'multi') initial[group.id] = [];
    return initial;
  });
  const price = calculateUnitPrice(item, selections);
  const missing = item.options.some((group) => {
    if (!group.required) return false;
    const chosen = selections[group.id];
    return Array.isArray(chosen) ? chosen.length === 0 : !chosen;
  });

  return (
    // overflow-hidden neutraliza o cabeçalho sticky dos grupos, que aqui não deve grudar na página.
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="px-4 pb-4 pt-5">
        <p className="text-subtitle font-bold text-gray-700">{item.name}</p>
        <p className="mt-1 text-body2 text-gray-600">{item.description}</p>
      </div>
      {item.options.map((group) => (
        <OptionGroup
          key={group.id}
          group={group}
          itemId={`landing-${item.id}`}
          selected={selections[group.id]}
          onSelectSingle={(choiceId) => setSelections((current) => ({ ...current, [group.id]: choiceId }))}
          onToggleMulti={(choiceId) =>
            setSelections((current) => {
              const chosen = Array.isArray(current[group.id]) ? (current[group.id] as string[]) : [];
              if (chosen.includes(choiceId)) return { ...current, [group.id]: chosen.filter((id) => id !== choiceId) };
              if (group.max && chosen.length >= group.max) return current;
              return { ...current, [group.id]: [...chosen, choiceId] };
            })
          }
        />
      ))}
      <div className="border-t border-gray-200 p-4">
        <Button fullWidth trailing={formatPrice(price)} disabled={missing}>
          Adicionar
        </Button>
      </div>
    </div>
  );
}
