'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { DishImage } from '@/components/store/dish-image';
import { useStore } from '@/components/store/store-provider';
import { formatPrice } from '@/lib/format';
import type { MenuItemCard } from '@/lib/types';

/**
 * Linha de item no formato de aplicativo de delivery: texto à esquerda, foto
 * quadrada à direita e um botão redondo para jogar direto na sacola. Itens que
 * exigem escolha (ponto da carne, tamanho) abrem a página do prato.
 */
export function ItemCard({
  item,
  basePath,
  priority = false,
}: {
  item: MenuItemCard;
  basePath: string;
  priority?: boolean;
}) {
  const { addItem } = useStore();
  const [added, setAdded] = useState(false);
  const timer = useRef<number | null>(null);

  const href = `${basePath}/item/${item.slug}`;
  const canQuickAdd = item.available && !item.hasRequiredOptions;

  const quickAdd = () => {
    addItem(item.id, 1, {}, '');
    setAdded(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <li className="relative">
      <Link
        href={href}
        aria-disabled={!item.available}
        className="flex items-start gap-3 py-4 transition-opacity active:opacity-70"
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-base font-semibold">{item.name}</h3>

          {(item.tags.length > 0 || !item.available) && (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-flame-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-flame-700"
                >
                  {tag}
                </li>
              ))}
              {!item.available && (
                <li className="rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                  Indisponível
                </li>
              )}
            </ul>
          )}

          {item.description && (
            <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink-500">{item.description}</p>
          )}

          <p className="mt-2 flex items-baseline gap-2">
            <span className="font-semibold text-ink-950">{formatPrice(item.price)}</span>
            {item.optionCount > 0 && <span className="text-xs text-ink-500">+ opções</span>}
          </p>
        </div>

        <DishImage
          image={item.image}
          alt={item.imageAlt || item.name}
          priority={priority}
          className="size-24 shrink-0 rounded-xl"
          emojiClassName="text-4xl"
          sizes="96px"
        />
      </Link>

      {/* Atalho para a sacola, sobreposto à foto — só quando não há escolha obrigatória. */}
      {canQuickAdd && (
        <button
          type="button"
          onClick={quickAdd}
          className={`absolute bottom-2.5 right-2.5 grid size-9 place-items-center rounded-full border border-ink-200 bg-white text-lg font-semibold shadow-soft transition-transform active:scale-90 ${
            added ? 'scale-110 border-(--tenant-brand) text-(--tenant-brand-ink)' : 'text-ink-950'
          }`}
        >
          <span aria-hidden="true">{added ? '✓' : '+'}</span>
          <span className="sr-only">Adicionar {item.name} à sacola</span>
        </button>
      )}
    </li>
  );
}
