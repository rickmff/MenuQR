import Link from 'next/link';
import { activeZones, chargesByDistance, describeDistancePricing } from '@/lib/delivery';
import { formatRadius, hasDeliveryArea } from '@/lib/delivery-area';
import { formatPrice, formatWhatsapp } from '@/lib/format';
import { getWeeklyHours } from '@/lib/hours';
import { platform } from '@/lib/platform';
import type { Business } from '@/lib/types';

const currentYear = new Date().getFullYear();

/** Rodapé do cardápio: NAP, horários e área de entrega — base do SEO local. */
export function StoreFooter({ business }: { business: Business }) {
  const hours = getWeeklyHours(business.hours);
  const hasAddress = Boolean(business.address.street || business.address.city);
  const radius = hasDeliveryArea(business) ? business.delivery.radiusKm : 0;
  const zones = activeZones(business);

  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <h2 className="text-body1 font-semibold">Contato</h2>
          {hasAddress && (
            <address className="mt-4 space-y-1 text-body2 not-italic text-ink-500">
              <p>{business.address.street}</p>
              <p>
                {[business.address.district, business.address.city].filter(Boolean).join(' — ')}
                {business.address.state ? `/${business.address.state}` : ''}
              </p>
              {business.address.postalCode && <p>CEP {business.address.postalCode}</p>}
            </address>
          )}
          <ul className="mt-4 space-y-1 text-body2 text-ink-500">
            {business.whatsapp && (
              <li>
                <a
                  className="hover:text-ink-950"
                  href={`https://wa.me/${business.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp: {formatWhatsapp(business.whatsapp)}
                </a>
              </li>
            )}
            {business.email && (
              <li>
                <a className="hover:text-ink-950" href={`mailto:${business.email}`}>
                  {business.email}
                </a>
              </li>
            )}
            {business.instagram && <li>{business.instagram}</li>}
          </ul>
        </div>

        <div>
          <h2 className="text-body1 font-semibold">Horário de funcionamento</h2>
          <ul className="mt-4 space-y-1.5 text-body2 text-ink-500">
            {hours.map((day) => (
              <li key={day.index} className="flex justify-between gap-4">
                <span>{day.label}</span>
                <span>{day.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-body1 font-semibold">Entrega</h2>
          {business.delivery.enabled && chargesByDistance(business) ? (
            <p className="mt-4 text-body2 text-ink-500">
              {describeDistancePricing(business, formatPrice)}. O valor sai do CEP, na hora de
              finalizar o pedido.
            </p>
          ) : business.delivery.enabled && zones.length > 0 ? (
            <ul className="mt-4 space-y-1.5 text-body2 text-ink-500">
              {zones.map((zone) => (
                <li key={zone.id} className="flex justify-between gap-4">
                  <span>{zone.name}</span>
                  <span>
                    {formatPrice(zone.fee)}
                    {zone.eta ? ` · ${zone.eta}` : ''}
                  </span>
                </li>
              ))}
              {business.delivery.freeAbove > 0 && (
                <li className="flex justify-between gap-4">
                  <span>Frete grátis acima de</span>
                  <span>{formatPrice(business.delivery.freeAbove)}</span>
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-4 text-body2 text-ink-500">
              {business.pickup.enabled ? 'Apenas retirada no local.' : 'Consulte-nos pelo WhatsApp.'}
            </p>
          )}
          {radius > 0 && (
            <p className="mt-3 text-body2 text-ink-500">
              Entregamos em até {formatRadius(radius)} do restaurante.
            </p>
          )}
          {business.pickup.enabled && (
            <p className="mt-3 text-body2 text-ink-500">
              Retirada no local{business.pickup.eta ? ` em ${business.pickup.eta}` : ''}.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-ink-200">
        <div className="container-page flex flex-col gap-2 py-6 text-caption text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} {business.name}
          </p>
          <p>
            Cardápio digital por{' '}
            <Link href="/" className="font-semibold hover:text-ink-950">
              {platform.name}
            </Link>{' '}
            ·{' '}
            <Link href="/criar-conta" className="underline">
              crie o seu
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
