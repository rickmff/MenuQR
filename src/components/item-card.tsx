import Link from 'next/link';
import { DishImage } from '@/components/dish-image';
import { formatPrice } from '@/lib/format';
import type { MenuCategory, MenuItemCard } from '@/lib/types';

/** Cartão de item do cardápio. O cartão inteiro é um link para a página do prato. */
export function ItemCard({
  item,
  category,
  priority = false,
}: {
  item: MenuItemCard;
  category: Pick<MenuCategory, 'slug' | 'name'>;
  priority?: boolean;
}) {
  return (
    <li>
      <article className="group h-full rounded-card border border-cream-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-ember-400 hover:shadow-soft">
        <Link
          href={`/cardapio/${category.slug}/${item.slug}`}
          className="flex h-full items-start gap-4 rounded-lg"
        >
          <div className="min-w-0 flex-1">
            <h3 className="flex flex-wrap items-center gap-2 font-display text-base font-semibold">
              {item.name}
              {item.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-ember-50 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ember-700"
                >
                  {tag}
                </span>
              ))}
              {!item.available && (
                <span className="rounded-md bg-cream-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-charcoal-500">
                  Indisponível
                </span>
              )}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-sm text-charcoal-500">{item.description}</p>
            <p className="mt-3 flex items-center gap-2">
              <span className="font-semibold text-ember-600">{formatPrice(item.price)}</span>
              {item.optionCount > 0 && (
                <span className="text-xs text-charcoal-500">+ opções</span>
              )}
              <span className="ml-auto text-sm font-medium text-charcoal-700 group-hover:text-ember-600">
                Ver e pedir →
              </span>
            </p>
          </div>
          <DishImage
            image={item.image}
            alt={item.imageAlt ?? item.name}
            priority={priority}
            className="size-20 shrink-0 rounded-xl sm:size-24"
            emojiClassName="text-4xl"
            sizes="(max-width: 640px) 80px, 96px"
          />
        </Link>
      </article>
    </li>
  );
}
