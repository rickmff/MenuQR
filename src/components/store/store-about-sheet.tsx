'use client';

import { AtSign, Bike, Clock, MapPin, MessageCircle, Store } from 'lucide-react';
import type { ReactNode } from 'react';
import { useStore } from '@/components/store/store-provider';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { activeZones, chargesByDistance, describeDistancePricing } from '@/lib/delivery';
import { formatRadius, hasDeliveryArea } from '@/lib/delivery-area';
import { formatPrice, formatWhatsapp } from '@/lib/format';
import { getWeeklyHours, getZonedDateParts, timeZoneForState } from '@/lib/hours';
import type { Business } from '@/lib/types';

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="flex gap-4 py-4">
      <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-700 [&>svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-body1 font-semibold text-gray-900">{title}</h3>
        <div className="mt-1 text-body2 text-gray-600">{children}</div>
      </div>
    </section>
  );
}

/**
 * "Sobre a loja": o que o rodapé antigo mostrava em três colunas — endereço,
 * horários da semana (hoje em negrito), contato e entrega — num sheet que abre
 * pelo chevron ao lado do nome. Montado uma vez na casca da loja; o conteúdo
 * só existe com o sheet aberto, então ler o relógio aqui não afeta o ISR.
 */
export function StoreAboutSheet() {
  const { business, aboutOpen, closeAbout } = useStore();

  return (
    <BottomSheet open={aboutOpen} onClose={closeAbout} title="Sobre a loja" closeSide="start">
      {aboutOpen && <AboutContent business={business} />}
    </BottomSheet>
  );
}

function AboutContent({ business }: { business: Business }) {
  const hours = getWeeklyHours(business.hours);
  const today = getZonedDateParts(new Date(), timeZoneForState(business.address.state)).weekday;
  const zones = activeZones(business);
  const radius = hasDeliveryArea(business) ? business.delivery.radiusKm : 0;
  const hasAddress = Boolean(business.address.street || business.address.city);

  return (
    <div className="divide-y divide-gray-200 px-4 pb-safe-4">
      {(business.tagline || business.description) && (
        <div className="py-4">
          {business.tagline && <p className="text-body1 font-semibold text-gray-900">{business.tagline}</p>}
          {business.description && <p className="mt-1 text-body2 text-gray-600">{business.description}</p>}
        </div>
      )}

      {hasAddress && (
        <Section icon={<MapPin />} title="Endereço">
          <address className="not-italic">
            <p>{business.address.street}</p>
            <p>
              {[business.address.district, business.address.city].filter(Boolean).join(' — ')}
              {business.address.state ? `/${business.address.state}` : ''}
            </p>
            {business.address.postalCode && <p>CEP {business.address.postalCode}</p>}
          </address>
        </Section>
      )}

      <Section icon={<Clock />} title="Horário de funcionamento">
        <ul className="space-y-1">
          {hours.map((day) => (
            <li
              key={day.index}
              className={day.index === today ? 'flex justify-between gap-4 font-semibold text-gray-900' : 'flex justify-between gap-4'}
            >
              <span>{day.label}</span>
              <span className="tabular-nums">{day.text}</span>
            </li>
          ))}
        </ul>
      </Section>

      {(business.whatsapp || business.instagram) && (
        <Section icon={<MessageCircle />} title="Contato">
          <ul className="space-y-1">
            {business.whatsapp && (
              <li>
                <a
                  href={`https://wa.me/${business.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary underline-offset-2 hover:underline"
                >
                  WhatsApp: {formatWhatsapp(business.whatsapp)}
                </a>
              </li>
            )}
            {business.instagram && (
              <li className="flex items-center gap-1.5">
                <AtSign aria-hidden="true" className="size-4" />
                {business.instagram.replace(/^@/, '')}
              </li>
            )}
          </ul>
        </Section>
      )}

      {business.delivery.enabled && (
        <Section icon={<Bike />} title="Entrega">
          {chargesByDistance(business) ? (
            <p>{describeDistancePricing(business, formatPrice)}. O valor sai do CEP, na hora de finalizar o pedido.</p>
          ) : zones.length > 0 ? (
            <ul className="space-y-1">
              {zones.map((zone) => (
                <li key={zone.id} className="flex justify-between gap-4">
                  <span>{zone.name}</span>
                  <span className="tabular-nums">
                    {zone.fee === 0 ? 'Grátis' : formatPrice(zone.fee)}
                    {zone.eta ? ` · ${zone.eta}` : ''}
                  </span>
                </li>
              ))}
              {business.delivery.freeAbove > 0 && (
                <li className="flex justify-between gap-4 font-semibold text-positive">
                  <span>Grátis acima de</span>
                  <span className="tabular-nums">{formatPrice(business.delivery.freeAbove)}</span>
                </li>
              )}
            </ul>
          ) : (
            <p>A taxa é combinada na conversa.</p>
          )}
          {radius > 0 && <p className="mt-2">Entregamos em até {formatRadius(radius)} do restaurante.</p>}
        </Section>
      )}

      {business.pickup.enabled && (
        <Section icon={<Store />} title="Retirada no local">
          <p>{business.pickup.eta ? `Fica pronto em ${business.pickup.eta}.` : 'Combine o horário na conversa.'}</p>
        </Section>
      )}
    </div>
  );
}
