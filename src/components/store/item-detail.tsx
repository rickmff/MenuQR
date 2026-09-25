import { useTranslations } from 'next-intl';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { DishImage } from '@/components/store/dish-image';
import { ItemClosedNote } from '@/components/store/item-closed-note';
import { ItemHero } from '@/components/store/item-hero';
import { ItemOrderPanel } from '@/components/store/item-order-panel';
import { StoreScreen } from '@/components/store/store-screen';
import { formatPrice } from '@/lib/format';
import { platform } from '@/lib/platform';
import type { Business, MenuCategory, MenuItem } from '@/lib/types';

/**
 * Página do prato, no padrão dos apps de delivery: a foto no topo com o "‹"
 * flutuando, nome e preço grandes, os grupos de complementos, a observação, a
 * quantidade e o CTA "Adicionar 1 por R$ …" sobre um degradê. No desktop vira
 * um painel centrado que rola por dentro, com o CTA grudado no pé.
 *
 * Vive num componente só para que o cardápio publicado, o modo demonstração e
 * a prévia do painel mostrem exatamente a mesma coisa.
 */
export function ItemDetail({
  business,
  category,
  item,
  basePath = `/r/${business.slug}`,
}: {
  business: Business;
  category: MenuCategory;
  item: MenuItem;
  /** `/painel/previa` quando o prato é aberto pela prévia do painel. */
  basePath?: string;
}) {
  const t = useTranslations('store.item');
  const hasImage = item.image.trim() !== '';
  const facts = [
    item.serves ? t('serves', { value: item.serves }) : '',
    item.calories ? `${item.calories} kcal` : '',
    item.allergens.length > 0 ? t('contains', { value: item.allergens.join(', ') }) : '',
  ].filter(Boolean);

  return (
    <StoreScreen>
    {/* No desktop a barra da loja fica fixa no topo: o painel começa abaixo dela. */}
    <div className="lg:bg-gray-50 lg:px-4 lg:pb-10 lg:pt-[calc(var(--top-inset)+2.5rem)]">
      {/* Sem View Transitions, o prato entra com fade; com elas, é a transição
          da tela que anima (os dois juntos animariam duas vezes). */}
      <article className="relative animate-fade-in bg-white supports-[view-transition-name:none]:animate-none lg:mx-auto lg:flex lg:max-h-[calc(var(--screen-height)-var(--top-inset)-5rem)] lg:max-w-narrow lg:flex-col lg:overflow-clip lg:rounded-lg lg:border lg:border-gray-200 lg:shadow-highest">
        <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
          <ItemHero title={item.name} hasImage={hasImage}>
            <DishImage
              image={item.image}
              alt={item.imageAlt || item.name}
              priority
              emojiSize="lg"
              surface="white"
              className="aspect-4/3 w-full lg:aspect-[16/10]"
              sizes="(max-width: 1024px) 100vw, 640px"
            />
          </ItemHero>

          <div className="px-4 pt-6">
            {/* A trilha alimenta o BreadcrumbList do JSON-LD; no celular ela fica só para leitores de tela. */}
            <div className="sr-only lg:not-sr-only lg:mb-3">
              <Breadcrumbs
                trail={[
                  { name: platform.name, path: '/' },
                  { name: business.name, path: basePath },
                  { name: category.name, path: `${basePath}#cat-${category.slug}` },
                  { name: item.name, path: `${basePath}/item/${item.slug}` },
                ]}
              />
            </div>

            <h1 className="font-display text-h4 font-bold text-gray-900">{item.name}</h1>
            {item.description && <p className="mt-2 text-body1 text-gray-600">{item.description}</p>}
            <p className="mt-3 text-h6 font-bold tabular-nums text-gray-900">{formatPrice(item.price)}</p>
            {facts.length > 0 && <p className="mt-2 text-body2 text-gray-600">{facts.join(' • ')}</p>}
            <ItemClosedNote business={business} />
          </div>

          <ItemOrderPanel item={item} />
        </div>
      </article>
    </div>
    </StoreScreen>
  );
}
