'use client';

import { Check, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { DishImage } from '@/components/store/dish-image';
import { useStore } from '@/components/store/store-provider';
import { Tag } from '@/components/ui/tag';
import { formatPrice } from '@/lib/format';
import type { MenuItemCard } from '@/lib/types';

/**
 * Linha de item no padrão do iFood: texto à esquerda, foto quadrada e, numa
 * coluna própria na borda direita, um "+" solto — sem círculo nem sombra, como
 * na página de item do app. Vermelho quando dá para agir, cinza quando não.
 *
 * O "+" fica fora do link: em item sem escolha obrigatória ele joga direto na
 * sacola; quando o prato exige escolher algo (ponto da carne, tamanho), leva
 * para a página do prato, que é onde a escolha cabe.
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

  // O "+" ocupa a mesma coluna em toda linha, para os sinais ficarem numa
  // régua só — é esse alinhamento que dá o ar de lista do iFood.
  const actionClass =
    'press -mr-2.5 grid size-11 shrink-0 place-items-center rounded-full active:bg-gray-100';

  return (
    <li className="flex items-center">
      <Link
        href={href}
        aria-disabled={!item.available}
        className={`flex min-w-0 flex-1 items-center gap-3 py-4 transition-colors duration-150 ease-standard active:bg-gray-50 ${
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

          <p className="mt-1.5 text-caption font-semibold text-gray-600">
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

      <div className="ml-3 flex shrink-0 items-center">
        {!item.available ? (
          <span aria-hidden="true" className={`${actionClass} text-gray-300`}>
            <Plus className="size-6" />
          </span>
        ) : canQuickAdd ? (
          <button
            type="button"
            onClick={quickAdd}
            aria-label={`Adicionar ${item.name} à sacola`}
            className={`${actionClass} text-primary`}
          >
            {added ? <Check className="size-6 text-positive" /> : <Plus className="size-6" />}
          </button>
        ) : (
          <Link
            href={href}
            aria-label={`Escolher as opções de ${item.name}`}
            className={`${actionClass} text-primary`}
          >
            <Plus className="size-6" />
          </Link>
        )}
      </div>
    </li>
  );
}
