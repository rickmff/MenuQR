'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { DishImage } from '@/components/store/dish-image';
import { useStore } from '@/components/store/store-provider';
import { Stepper } from '@/components/ui/stepper';
import { Tag } from '@/components/ui/tag';
import { countInCart, findQuickLine } from '@/lib/cart-store';
import { formatPrice } from '@/lib/format';
import type { MenuItemCard } from '@/lib/types';

/**
 * Linha de item no padrão do iFood: texto à esquerda, foto quadrada e, numa
 * coluna própria na borda direita, um "+" solto — sem círculo nem sombra, como
 * na página de item do app. Verde quando dá para agir, cinza quando não.
 *
 * O "+" fica fora do link: em item sem escolha obrigatória ele joga direto na
 * sacola e, com o item lá, vira o stepper "− 1 +" (a quantidade é a da linha
 * que o próprio "+" criou; no mínimo, a lixeira tira o item). Quando o prato
 * exige escolher algo (ponto da carne, tamanho), o "+" leva para a página do
 * prato, que é onde a escolha cabe, e a contagem do que já está na sacola
 * aparece num badge sobre ele.
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
  const { cart, addItem, setQuantity } = useStore();

  const href = `${basePath}/item/${item.slug}`;
  const canQuickAdd = item.available && !item.hasRequiredOptions;
  const hasImage = item.image.trim() !== '';
  const quickLine = canQuickAdd ? findQuickLine(cart, item.id) : undefined;
  const inCart = countInCart(cart, item.id);

  // A coluna da direita tem a largura de um botão, e é por isso que o stepper
  // dela é em pé: deitado ele mediria o dobro e empurraria a foto para o lado
  // só nas linhas que já estão na sacola, tirando a lista da régua.
  const actionClass =
    'press relative grid size-11 shrink-0 place-items-center rounded-full active:bg-gray-100';

  const badge =
    inCart > 0 ? (
      <span
        key={inCart}
        aria-hidden="true"
        className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] animate-badge-pop place-items-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-white"
      >
        {inCart > 99 ? '99+' : inCart}
      </span>
    ) : null;

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

      <div className="-mr-2 ml-1 flex w-11 shrink-0 items-center justify-center">
        {!item.available ? (
          <span aria-hidden="true" className={`${actionClass} text-gray-300`}>
            <Plus className="size-6" />
          </span>
        ) : quickLine ? (
          <Stepper
            size="sm"
            orientation="vertical"
            value={quickLine.quantity}
            min={1}
            max={99}
            onChange={(next) => setQuantity(quickLine.uid, next)}
            onRemove={() => setQuantity(quickLine.uid, 0)}
            label={item.name}
            className="animate-fade-in"
          />
        ) : canQuickAdd ? (
          <button
            type="button"
            onClick={() => addItem(item.id, 1, {}, '')}
            aria-label={
              inCart > 0
                ? `Adicionar ${item.name} à sacola (${inCart} na sacola)`
                : `Adicionar ${item.name} à sacola`
            }
            className={`${actionClass} text-primary`}
          >
            <Plus aria-hidden="true" className="size-6" />
            {badge}
          </button>
        ) : (
          <Link
            href={href}
            aria-label={
              inCart > 0
                ? `Escolher as opções de ${item.name} (${inCart} na sacola)`
                : `Escolher as opções de ${item.name}`
            }
            className={`${actionClass} text-primary`}
          >
            <Plus aria-hidden="true" className="size-6" />
            {badge}
          </Link>
        )}
      </div>
    </li>
  );
}
