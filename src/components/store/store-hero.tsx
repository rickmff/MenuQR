import { OpeningBadge } from '@/components/store/opening-badge';
import { formatPrice } from '@/lib/format';
import { priceFrom } from '@/lib/menu-utils';
import type { Business, MenuCategory } from '@/lib/types';

/**
 * Topo do cardápio: identidade do restaurante e, logo abaixo, as informações
 * que decidem o pedido (entrega, prazo, mínimo) em fichas fáceis de varrer.
 */
export function StoreHero({ business, menu }: { business: Business; menu: MenuCategory[] }) {
  const zones = business.delivery.zones;
  const cheapestFee = zones.length ? Math.min(...zones.map((zone) => zone.fee)) : 0;
  const fastest = zones.map((zone) => zone.eta).filter(Boolean)[0];
  const cheapestItem = priceFrom(menu);
  const isImage = /^(https?:\/\/|\/)/.test(business.logo);

  const chips = [
    business.delivery.enabled && zones.length > 0
      ? { icon: '🛵', label: cheapestFee > 0 ? `Entrega ${formatPrice(cheapestFee)}` : 'Entrega grátis' }
      : null,
    business.delivery.enabled && fastest ? { icon: '⏱️', label: fastest } : null,
    business.delivery.enabled && business.delivery.minOrder > 0
      ? { icon: '🧾', label: `Mínimo ${formatPrice(business.delivery.minOrder)}` }
      : null,
    business.delivery.freeAbove > 0
      ? { icon: '🎁', label: `Grátis acima de ${formatPrice(business.delivery.freeAbove)}` }
      : null,
    business.pickup.enabled
      ? { icon: '🏠', label: `Retirada ${business.pickup.eta || 'disponível'}` }
      : null,
    cheapestItem > 0 ? { icon: '💰', label: `A partir de ${formatPrice(cheapestItem)}` } : null,
  ].filter((chip): chip is { icon: string; label: string } => chip !== null);

  return (
    <section className="border-b border-ink-200 bg-white">
      <div className="container-page py-6 lg:py-8">
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-(--tenant-brand) text-3xl text-(--tenant-brand-text) shadow-soft"
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo} alt="" className="size-full object-cover" />
            ) : (
              business.logo
            )}
          </span>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold sm:text-3xl">{business.name}</h1>
            {business.tagline && (
              <p className="mt-0.5 truncate text-sm text-ink-500">{business.tagline}</p>
            )}
            <div className="mt-2">
              <OpeningBadge hours={business.hours} />
            </div>
          </div>
        </div>

        {chips.length > 0 && (
          <ul className="-mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-wrap lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {chips.map((chip) => (
              <li
                key={chip.label}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-xs font-medium text-ink-700"
              >
                <span aria-hidden="true">{chip.icon}</span>
                {chip.label}
              </li>
            ))}
          </ul>
        )}

        {business.description && (
          <p className="mt-4 line-clamp-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            {business.description}
          </p>
        )}
      </div>
    </section>
  );
}
