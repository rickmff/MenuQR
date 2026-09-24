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
 * escolhas ("Adicionais: 2x Bacon crocante") e a observação embaixo, e o
 * stepper no canto de baixo — no mínimo, o "−" vira lixeira.
 *
 * Não há "Editar": tocar na linha abre a página do prato preenchida com esta
 * linha (`?editar=<uid>`), como na linha do cardápio. O link é o texto, com um
 * pseudo-elemento esticado sobre a linha inteira; o stepper fica `relative`,
 * por cima dele, para o "+" e a lixeira não abrirem o prato. Remover primeiro
 * recolhe a linha e só então tira do store, para a lista não pular.
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

  const summary = (
    <>
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
    </>
  );

  return (
    <li
      className={cn(
        'grid transition-[grid-template-rows,opacity] duration-200 ease-accelerate',
        removing ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]',
      )}
    >
      {/* `has-[a:active]` pinta a linha inteira ao apertar o link, mas não ao
          apertar o stepper — é ele, e não a linha, que reage ali. */}
      <div className="relative min-h-0 overflow-hidden px-4 py-4 transition-colors duration-150 ease-standard has-[a:active]:bg-gray-50">
        <div className="flex items-start justify-between gap-3">
          {found ? (
            <Link
              href={`${basePath}/item/${found.item.slug}?editar=${line.uid}`}
              onClick={closeCart}
              className="min-w-0 flex-1 after:absolute after:inset-0 after:content-['']"
            >
              <span className="sr-only">Editar </span>
              {summary}
            </Link>
          ) : (
            <div className="min-w-0 flex-1">{summary}</div>
          )}
          <p className="shrink-0 text-body2 font-semibold tabular-nums text-gray-700">
            {formatPrice(line.unitPrice * line.quantity)}
          </p>
        </div>

        <div className="relative mt-3 flex justify-end">
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
