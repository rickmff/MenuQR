import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { OpeningBadge } from '@/components/opening-badge';
import { toE164 } from '@/lib/format';
import { getWeeklyHours } from '@/lib/hours';
import { restaurant } from '@/lib/restaurant';
import { breadcrumbSchema, buildMetadata, graph } from '@/lib/seo';
import { whatsappUrl } from '@/lib/whatsapp';

export const metadata: Metadata = buildMetadata({
  title: 'Contato, endereço e horários',
  description:
    `Fale com o ${restaurant.name} pelo WhatsApp ${restaurant.phoneDisplay} ou visite a loja em ${restaurant.address.street}, ` +
    `${restaurant.address.district}, ${restaurant.address.city}. Veja os horários de funcionamento.`,
  path: '/contato',
  keywords: ['contato', 'endereço', 'telefone', 'horário de funcionamento'],
});

const trail = [
  { name: 'Início', path: '/' },
  { name: 'Contato', path: '/contato' },
];

export default function ContatoPage() {
  const hours = getWeeklyHours(restaurant);
  const message = `Olá! Vim pelo site do ${restaurant.name} e gostaria de tirar uma dúvida.`;

  return (
    <>
      <JsonLd id="ld-contato" data={graph(breadcrumbSchema(trail))} />

      <div className="container-page py-8">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">Fale com a gente</h1>
          <p className="mt-4 text-lg text-charcoal-700">
            Dúvidas sobre o cardápio, pedidos para eventos ou um problema com a entrega? Respondemos pelo WhatsApp
            durante o horário de funcionamento.
          </p>
          <div className="mt-4">
            <OpeningBadge />
          </div>
        </header>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <section className="rounded-card border border-cream-200 bg-white p-6" aria-labelledby="canais">
            <h2 id="canais" className="text-2xl font-semibold">
              Canais de atendimento
            </h2>
            <dl className="mt-6 space-y-5 text-sm">
              <div>
                <dt className="font-semibold">WhatsApp</dt>
                <dd className="mt-1">
                  <a
                    className="text-ember-600 hover:text-ember-700"
                    href={whatsappUrl(restaurant.whatsapp, message)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {restaurant.phoneDisplay}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Telefone</dt>
                <dd className="mt-1">
                  <a className="text-ember-600 hover:text-ember-700" href={`tel:${toE164(restaurant.whatsapp)}`}>
                    {restaurant.phoneDisplay}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold">E-mail</dt>
                <dd className="mt-1">
                  <a className="text-ember-600 hover:text-ember-700" href={`mailto:${restaurant.email}`}>
                    {restaurant.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="font-semibold">Endereço</dt>
                <dd className="mt-1 not-italic text-charcoal-500">
                  <address className="not-italic">
                    {restaurant.address.street}
                    <br />
                    {restaurant.address.district} — {restaurant.address.city}/{restaurant.address.state}
                    <br />
                    CEP {restaurant.address.postalCode}
                  </address>
                  <a
                    className="mt-2 inline-block text-ember-600 hover:text-ember-700"
                    href={restaurant.address.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir no Google Maps
                  </a>
                </dd>
              </div>
            </dl>

            <a
              href={whatsappUrl(restaurant.whatsapp, message)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-whatsapp-500 px-6 py-3.5 font-semibold text-white hover:bg-whatsapp-600"
            >
              <span aria-hidden="true">📲</span> Conversar no WhatsApp
            </a>
          </section>

          <section className="rounded-card border border-cream-200 bg-white p-6" aria-labelledby="horarios">
            <h2 id="horarios" className="text-2xl font-semibold">
              Horário de funcionamento
            </h2>
            <ul className="mt-6 divide-y divide-cream-200 text-sm">
              {hours.map((day) => (
                <li key={day.index} className="flex items-center justify-between gap-4 py-3">
                  <span className="font-medium">{day.label}</span>
                  <span className={day.ranges.length ? 'text-charcoal-500' : 'text-charcoal-500/70'}>
                    {day.text}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-charcoal-500">
              Pedidos de delivery são aceitos até 30 minutos antes do fechamento. Em feriados, o horário pode mudar —
              avisamos nas nossas redes sociais.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
