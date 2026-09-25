'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { rememberMenuPosition } from '@/components/store/nav-marker';
import { readScrollTop, useScrollRoot } from '@/components/store/scroll-root';
import { DishImage } from '@/components/store/dish-image';
import { useStore } from '@/components/store/store-provider';
import { Stepper } from '@/components/ui/stepper';
import { cn } from '@/lib/cn';
import { prefersReducedMotion } from '@/lib/reduced-motion';
import { formatPrice } from '@/lib/format';
import { findItemById } from '@/lib/menu-utils';
import { describeSelections } from '@/lib/whatsapp';
import type { CartLine } from '@/lib/types';

const EXIT_MS = 200;

/**
 * Uma linha da sacola, como nos apps de delivery: a miniatura do prato, o nome,
 * as escolhas ("Adicionais: 2x Bacon crocante") e a observação, o preço em
 * negrito embaixo, e a pílula cinza "− n +" no canto de cima — no mínimo, o
 * "−" vira lixeira.
 *
 * Não há "Editar": tocar na linha abre a página do prato preenchida com esta
 * linha (`?editar=<uid>`), como na linha do cardápio. O link é o texto, com um
 * pseudo-elemento esticado sobre a linha inteira; o stepper fica `relative`,
 * por cima dele, para o "+" e a lixeira não abrirem o prato. Remover primeiro
 * recolhe a linha e só então tira do store, para a lista não pular.
 */
export function CartLineRow({ line }: { line: CartLine }) {
  const t = useTranslations('store.cart');
  const { business, menu, basePath, setQuantity } = useStore();
  const scrollRoot = useScrollRoot();
  const [removing, setRemoving] = useState(false);
  const found = findItemById(menu, line.itemId);
  const groups = found ? describeSelections(found.item, line.selections) : [];

  const remove = () => {
    setRemoving(true);
    window.setTimeout(() => setQuantity(line.uid, 0), prefersReducedMotion() ? 0 : EXIT_MS);
  };
  const editHref = found ? `${basePath}/item/${found.item.slug}?editar=${line.uid}` : '';

  const summary = (
    <>
      <p className="text-subtitle font-semibold text-gray-700">{line.name}</p>
      {groups.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-body2 text-gray-600">
          {groups.map((group) => (
            <li key={group.group}>
              {group.group}: {group.values.join(', ')}
            </li>
          ))}
        </ul>
      )}
      {line.notes && <p className="mt-1 text-body2 text-gray-600">{t('notes', { notes: line.notes })}</p>}
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
          apertar o stepper — é ele, e não a linha, que reage ali. O respiro de
          4px em volta deixa o anel de foco e o alvo do stepper fora do recorte. */}
      <div className="relative -m-1 min-h-0 overflow-hidden rounded-md p-1 transition-colors duration-150 ease-standard has-[a:active]:bg-gray-50">
        <div className="flex gap-4">
          {found && found.item.image.trim() !== '' && (
            <DishImage
              image={found.item.image}
              alt=""
              emojiSize="sm"
              sizes="56px"
              className="size-14 shrink-0 rounded-md"
            />
          )}
          <div className="min-w-0 flex-1 pr-24">
            {found ? (
              <Link
                href={editHref}
                // Sem fechar a sacola à mão: a navegação cria uma entrada sem a
                // camada dela, e ela sai sozinha. Voltar do prato reabre a sacola.
                onClick={() =>
                  rememberMenuPosition(business.slug, editHref, 'cart', readScrollTop(scrollRoot?.current))
                }
                className="block after:absolute after:inset-0 after:content-['']"
              >
                <span className="sr-only">{t('edit')} </span>
                {summary}
              </Link>
            ) : (
              <div>{summary}</div>
            )}
            <p className="mt-2 text-body1 font-bold tabular-nums text-gray-900">
              {formatPrice(line.unitPrice * line.quantity)}
            </p>
          </div>
        </div>

        {/* `relative`: por cima do link esticado, para o "+" e a lixeira não abrirem o prato. */}
        <div className="absolute right-1 top-1">
          <Stepper
            size="sm"
            variant="soft"
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
