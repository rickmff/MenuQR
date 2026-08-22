import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DishImage } from '@/components/store/dish-image';
import { ItemCard } from '@/components/store/item-card';
import { ItemOrderPanel } from '@/components/store/item-order-panel';
import { formatPrice } from '@/lib/format';
import { toCardItem } from '@/lib/menu-utils';
import { platform } from '@/lib/platform';
import type { Business, MenuCategory, MenuItem } from '@/lib/types';

/**
 * Página do prato. Vive num componente só para que o cardápio publicado e o
 * modo demonstração mostrem exatamente a mesma coisa — antes eram duas telas
 * parecidas mantidas à mão, e a de demonstração ficou para trás.
 */
export function ItemDetail({
  business,
  category,
  item,
}: {
  business: Business;
  category: MenuCategory;
  item: MenuItem;
}) {
  const basePath = `/r/${business.slug}`;
  const related = category.items.filter((entry) => entry.id !== item.id).slice(0, 4);
  const hasFacts = Boolean(item.serves || item.calories || item.allergens.length > 0);

  return (
    <div className="container-page py-8 pb-28 sm:pb-8">
      <Breadcrumbs
        trail={[
          { name: platform.name, path: '/' },
          { name: business.name, path: basePath },
          { name: item.name, path: `${basePath}/item/${item.slug}` },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          <DishImage
            image={item.image}
            alt={item.imageAlt || item.name}
            priority
            className="h-52 w-full rounded-card border border-ink-200 sm:aspect-4/3 sm:h-auto"
            emojiClassName="text-[5rem] sm:text-[7rem]"
            sizes="(max-width: 1024px) 100vw, 560px"
          />

          {hasFacts && (
            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              {item.serves && (
                <div className="surface p-4">
                  <dt className="text-ink-500">Serve</dt>
                  <dd className="mt-1 font-semibold">{item.serves}</dd>
                </div>
              )}
              {item.calories && (
                <div className="surface p-4">
                  <dt className="text-ink-500">Calorias</dt>
                  <dd className="mt-1 font-semibold">{item.calories} kcal</dd>
                </div>
              )}
              {item.allergens.length > 0 && (
                <div className="surface col-span-2 p-4 sm:col-span-1">
                  <dt className="text-ink-500">Contém</dt>
                  <dd className="mt-1 font-semibold">{item.allergens.join(', ')}</dd>
                </div>
              )}
            </dl>
          )}
        </div>

        <div>
          <p className="text-sm font-medium text-ink-500">
            <Link href={`${basePath}#cat-${category.slug}`} className="hover:text-ink-950">
              {category.icon} {category.name}
            </Link>
          </p>
          <h1 className="mt-2 text-4xl font-semibold">{item.name}</h1>
          {item.description && <p className="mt-3 text-lg text-ink-700">{item.description}</p>}
          <p className="mt-4 font-display text-3xl font-bold text-(--tenant-brand-ink)">
            {formatPrice(item.price)}
          </p>

          {item.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-flame-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-flame-700"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8">
            <ItemOrderPanel item={item} />
          </div>

          {business.delivery.enabled && business.delivery.minOrder > 0 && (
            <p className="mt-4 text-sm text-ink-500">
              Pedido mínimo para entrega: {formatPrice(business.delivery.minOrder)}
              {business.delivery.freeAbove > 0
                ? ` · Frete grátis acima de ${formatPrice(business.delivery.freeAbove)}`
                : ''}
            </p>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16 border-t border-ink-200 pt-10" aria-labelledby="relacionados">
          <h2 id="relacionados" className="font-display text-2xl font-semibold">
            Também em {category.name}
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {related.map((entry) => (
              <ItemCard key={entry.id} item={toCardItem(entry)} basePath={basePath} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
