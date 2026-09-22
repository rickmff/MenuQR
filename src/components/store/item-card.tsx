'use client';

import { Check, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { DishImage } from '@/components/store/dish-image';
import { useStore } from '@/components/store/store-provider';
import { IconButton } from '@/components/ui/icon-button';
import { Tag } from '@/components/ui/tag';
import { formatPrice } from '@/lib/format';
import type { MenuItemCard } from '@/lib/types';

/**
 * Linha de item no padrão do iFood: texto à esquerda, foto quadrada à direita
 * e um "+" branco sobre a foto para jogar direto na sacola. Itens que exigem
 * escolha (ponto da carne, tamanho) abrem a página do prato.
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
  const hasImage = item.image.trim() !== '';

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
        className={`flex items-start gap-3 py-4 transition-colors duration-150 ease-standard active:bg-gray-50 ${
          item.available ? '' : 'opacity-60'
        }`}
      >
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-body1 font-semibold text-gray-700">{item.name}</h3>

          {(item.tags.length > 0 || !item.available) && (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <li key={tag}>
                  <Tag>{tag}</Tag>
                </li>
              ))}
              {!item.available && (
                <li>
                  <Tag>Indisponível</Tag>
                </li>
              )}
            </ul>
          )}

          {item.description && (
            <p className="mt-1 line-clamp-2 text-body2 text-gray-600">{item.description}</p>
          )}

          <p className="mt-2 text-body2 font-semibold text-gray-700">
            {formatPrice(item.price)}
            {item.optionCount > 0 && (
              <span className="ml-2 font-normal text-gray-600">personalizável</span>
            )}
          </p>
        </div>

        {hasImage && (
          <DishImage
            image={item.image}
            alt={item.imageAlt || item.name}
            priority={priority}
            emojiSize="md"
            className="size-[88px] shrink-0 rounded-sm"
            sizes="88px"
          />
        )}
      </Link>

      {/* Atalho para a sacola, sobreposto à foto — só quando não há escolha obrigatória. */}
      {canQuickAdd && (
        <IconButton
          label={`Adicionar ${item.name} à sacola`}
          variant="raised"
          size="sm"
          onClick={quickAdd}
          icon={
            added ? (
              <Check className="size-4 text-positive" />
            ) : (
              <Plus className="size-5 text-primary" />
            )
          }
          className={hasImage ? 'absolute bottom-3 right-1' : 'absolute bottom-4 right-0'}
        />
      )}
    </li>
  );
}
