import { Breadcrumbs } from '@/components/breadcrumbs';
import { DishImage } from '@/components/store/dish-image';
import { ItemHero } from '@/components/store/item-hero';
import { ItemOrderPanel } from '@/components/store/item-order-panel';
import { Avatar } from '@/components/ui/avatar';
import { activeZones, chargesByDistance } from '@/lib/delivery';
import { formatPrice } from '@/lib/format';
import { platform } from '@/lib/platform';
import type { Business, MenuCategory, MenuItem } from '@/lib/types';

/** "57-72 min • Grátis": prazo e taxa da zona mais barata, ou a retirada. */
function deliverySummary(business: Business): string[] {
  // Por km não há "zona mais barata": o piso é a taxa base, e o número exato
  // depende do CEP que o cliente ainda vai informar.
  if (chargesByDistance(business)) {
    const { baseFee } = business.delivery.distance;
    return [`Entrega a partir de ${baseFee > 0 ? formatPrice(baseFee) : 'grátis'}`];
  }
  const zones = activeZones(business);
  if (business.delivery.enabled && zones.length > 0) {
    const cheapest = zones.reduce((best, zone) => (zone.fee < best.fee ? zone : best));
    return [cheapest.eta, cheapest.fee === 0 ? 'Grátis' : formatPrice(cheapest.fee)];
  }
  if (business.pickup.enabled) return [`Retirada • ${business.pickup.eta}`];
  return [];
}

/**
 * Página do prato, no padrão da tela de item do iFood: foto no topo, o chip da
 * loja sobreposto, nome, descrição e preço, os grupos de complementos e a barra
 * de adicionar. Vive num componente só para que o cardápio publicado, o modo
 * demonstração e a prévia do painel mostrem exatamente a mesma coisa.
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
  const hasImage = item.image.trim() !== '';
  const summary = deliverySummary(business);
  const facts = [
    item.serves ? `Serve ${item.serves}` : '',
    item.calories ? `${item.calories} kcal` : '',
    item.allergens.length > 0 ? `Contém: ${item.allergens.join(', ')}` : '',
  ].filter(Boolean);
  const freeAbove = business.delivery.enabled ? business.delivery.freeAbove : 0;
  const minOrder = business.delivery.enabled ? business.delivery.minOrder : 0;

  return (
    <div className="lg:bg-gray-50 lg:px-4 lg:py-10">
      <article className="bg-white pb-28 lg:mx-auto lg:max-w-narrow lg:overflow-clip lg:rounded-lg lg:border lg:border-gray-200 lg:pb-0 lg:shadow-highest">
        <ItemHero title={item.name} basePath={basePath} hasImage={hasImage}>
          <DishImage
            image={item.image}
            alt={item.imageAlt || item.name}
            priority
            emojiSize="lg"
            className="aspect-4/3 w-full"
            sizes="(max-width: 1024px) 100vw, 640px"
          />
        </ItemHero>

        <div className={hasImage ? 'relative z-10 -mt-6 px-4' : 'px-4 pt-4'}>
          <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-medium">
            <Avatar logo={business.logo} name={business.name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-body2 font-semibold text-gray-700">{business.name}</p>
              {summary.length > 0 && (
                <p className="truncate text-caption text-gray-600">
                  {summary.map((part, index) => (
                    <span key={part}>
                      {index > 0 && ' • '}
                      <span className={part === 'Grátis' ? 'font-semibold text-positive' : undefined}>{part}</span>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pt-5">
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

          <h1 className="text-subtitle font-bold text-gray-700">{item.name}</h1>
          {item.description && <p className="mt-1.5 text-body2 text-gray-600">{item.description}</p>}

          {freeAbove > 0 ? (
            <p className="mt-3 text-caption text-gray-600">
              <span className="font-semibold text-positive">Entrega grátis</span> em pedidos acima de{' '}
              {formatPrice(freeAbove)}
            </p>
          ) : minOrder > 0 ? (
            <p className="mt-3 text-caption text-gray-600">Pedido mínimo {formatPrice(minOrder)}</p>
          ) : null}

          <p className="mt-2 text-subtitle font-bold text-gray-700">{formatPrice(item.price)}</p>
          {facts.length > 0 && <p className="mt-1 text-caption text-gray-600">{facts.join(' • ')}</p>}
        </div>

        <div className="mt-5 border-t-8 border-gray-50" />

        <ItemOrderPanel item={item} />
      </article>
    </div>
  );
}
