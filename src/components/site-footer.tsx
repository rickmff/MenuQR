import Link from 'next/link';
import { OpeningBadge } from '@/components/opening-badge';
import { formatPrice, toE164 } from '@/lib/format';
import { getWeeklyHours } from '@/lib/hours';
import { menu } from '@/lib/menu';
import { restaurant } from '@/lib/restaurant';

const currentYear = new Date().getFullYear();

export function SiteFooter() {
  const hours = getWeeklyHours(restaurant);

  return (
    <footer className="mt-20 border-t border-cream-200 bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-11 place-items-center rounded-xl bg-linear-to-br from-ember-500 to-ember-700 text-xl"
            >
              {restaurant.logo}
            </span>
            <span className="font-display text-lg font-semibold">{restaurant.name}</span>
          </p>
          <p className="mt-4 text-sm leading-relaxed text-charcoal-500">{restaurant.shortDescription}</p>
          <div className="mt-4">
            <OpeningBadge />
          </div>
        </div>

        <div>
          <h2 className="font-display text-base font-semibold">Contato</h2>
          {/* NAP (nome, endereço, telefone) consistente — base do SEO local. */}
          <address className="mt-4 space-y-2 text-sm not-italic text-charcoal-500">
            <p>
              {restaurant.address.street}
              <br />
              {restaurant.address.district} — {restaurant.address.city}/{restaurant.address.state}
              <br />
              CEP {restaurant.address.postalCode}
            </p>
            <p>
              <a className="hover:text-ember-600" href={`tel:${toE164(restaurant.whatsapp)}`}>
                {restaurant.phoneDisplay}
              </a>
            </p>
            <p>
              <a className="hover:text-ember-600" href={`mailto:${restaurant.email}`}>
                {restaurant.email}
              </a>
            </p>
          </address>
          <p className="mt-3 text-sm">
            <a
              className="font-medium text-ember-600 hover:text-ember-700"
              href={restaurant.address.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver no mapa
            </a>
          </p>
        </div>

        <div>
          <h2 className="font-display text-base font-semibold">Horários</h2>
          <ul className="mt-4 space-y-1.5 text-sm text-charcoal-500">
            {hours.map((day) => (
              <li key={day.index} className="flex justify-between gap-4">
                <span>{day.label}</span>
                <span>{day.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="font-display text-base font-semibold">Cardápio</h2>
          <ul className="mt-4 space-y-1.5 text-sm text-charcoal-500">
            {menu.map((category) => (
              <li key={category.slug}>
                <Link className="hover:text-ember-600" href={`/cardapio/${category.slug}`}>
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>

          <h2 className="mt-6 font-display text-base font-semibold">Institucional</h2>
          <ul className="mt-4 space-y-1.5 text-sm text-charcoal-500">
            <li>
              <Link className="hover:text-ember-600" href="/sobre">
                Sobre nós
              </Link>
            </li>
            <li>
              <Link className="hover:text-ember-600" href="/entrega">
                Área de entrega
              </Link>
            </li>
            <li>
              <Link className="hover:text-ember-600" href="/perguntas-frequentes">
                Perguntas frequentes
              </Link>
            </li>
            <li>
              <Link className="hover:text-ember-600" href="/politica-de-privacidade">
                Política de privacidade
              </Link>
            </li>
            <li>
              <Link className="hover:text-ember-600" href="/termos-de-uso">
                Termos de uso
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream-200">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-charcoal-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} {restaurant.legalName}. Todos os direitos reservados.
          </p>
          <p>
            Pedido mínimo para entrega: {formatPrice(restaurant.delivery.minOrder)} · Venda de bebida
            alcoólica proibida para menores de 18 anos.
          </p>
        </div>
      </div>
    </footer>
  );
}
