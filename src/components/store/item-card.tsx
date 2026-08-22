import Link from 'next/link';
import { DishImage } from '@/components/store/dish-image';
import { formatPrice } from '@/lib/format';
import type { MenuItemCard } from '@/lib/types';

/** Cartão de item do cardápio. O cartão inteiro é um link para a página do prato. */
export function ItemCard({
  item,
  basePath,
  priority = false,
}: {
  item: MenuItemCard;
  basePath: string;
  priority?: boolean;
}) {
  return (
    <li>
      <article className="surface surface-hover group h-full p-4 hover:border-(--tenant-brand)">
        <Link href={`${basePath}/item/${item.slug}`} className="flex h-full items-start gap-4 rounded-lg">
          <div className="min-w-0 flex-1">
            <h3 className="flex flex-wrap items-center gap-2 font-display text-base font-semibold">
              {item.name}
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-700"
                >
                  {tag}
                </span>
              ))}
              {!item.available && (
                <span className="rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-500">
                  Indisponível
                </span>
              )}
            </h3>
            {item.description && (
              <p className="mt-1.5 line-clamp-2 text-sm text-ink-500">{item.description}</p>
            )}
            <p className="mt-3 flex items-center gap-2">
              <span className="font-semibold text-(--tenant-brand-ink)">{formatPrice(item.price)}</span>
              {item.optionCount > 0 && <span className="text-xs text-ink-500">+ opções</span>}
              <span className="ml-auto text-sm font-medium text-ink-700 group-hover:text-(--tenant-brand-ink)">
                Ver e pedir →
              </span>
            </p>
          </div>
          <DishImage
            image={item.image}
            alt={item.imageAlt || item.name}
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
