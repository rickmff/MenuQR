'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useStore } from '@/components/store/store-provider';
import { Stepper } from '@/components/ui/stepper';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { findItemById } from '@/lib/menu-utils';
import { describeSelections } from '@/lib/whatsapp';
import type { CartLine } from '@/lib/types';

const EXIT_MS = 200;

/**
 * Uma linha da sacola, como no iFood: nome e preço na primeira linha, as
 * escolhas ("Adicionais: 2x Bacon crocante") e a observação embaixo, e na base
 * o "Editar" à esquerda com o stepper à direita — no mínimo, o "−" vira lixeira.
 *
 * "Editar" abre a página do prato preenchida com esta linha (`?editar=<uid>`);
 * remover primeiro recolhe a linha e só então tira do store, para a lista não
 * pular.
 */
export function CartLineRow({ line }: { line: CartLine }) {
  const { menu, basePath, setQuantity, closeCart } = useStore();
  const [removing, setRemoving] = useState(false);
  const found = findItemById(menu, line.itemId);
  const groups = found ? describeSelections(found.item, line.selections) : [];

  const remove = () => {
    setRemoving(true);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => setQuantity(line.uid, 0), reduce ? 0 : EXIT_MS);
  };

  return (
    <li
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-accelerate',
        removing ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]',
      )}
    >
      <div className="min-h-0 overflow-hidden px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-body1 font-semibold text-gray-700">{line.name}</p>
            {groups.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-caption text-gray-600">
                {groups.map((group) => (
                  <li key={group.group}>
                    {group.group}: {group.values.join(', ')}
                  </li>
                ))}
              </ul>
            )}
            {line.notes && <p className="mt-1 text-caption text-gray-600">Obs.: {line.notes}</p>}
          </div>
          <p className="shrink-0 text-body2 font-semibold tabular-nums text-gray-700">
            {formatPrice(line.unitPrice * line.quantity)}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          {found ? (
            <Link
              href={`${basePath}/item/${found.item.slug}?editar=${line.uid}`}
              onClick={closeCart}
              className="press rounded-xs text-body2 font-semibold text-primary"
            >
              Editar<span className="sr-only"> {line.name}</span>
            </Link>
          ) : (
            <span />
          )}
          <Stepper
            size="sm"
            value={line.quantity}
            min={1}
            max={99}
            onChange={(next) => setQuantity(line.uid, next)}
            onRemove={remove}
            label={line.name}
            disabled={removing}
          />
        </div>
      </div>
    </li>
  );
}
