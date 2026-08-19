import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { formatPrice } from '@/lib/format';
import { restaurant } from '@/lib/restaurant';
import { breadcrumbSchema, buildMetadata, graph } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Área de entrega, taxas e prazos',
  description:
    `Bairros atendidos pelo delivery do ${restaurant.name} em ${restaurant.address.city}, com taxa e prazo de cada região. ` +
    `Pedido mínimo de ${formatPrice(restaurant.delivery.minOrder)} e frete grátis acima de ${formatPrice(restaurant.delivery.freeAbove)}.`,
  path: '/entrega',
  keywords: ['área de entrega', 'taxa de entrega', 'delivery', restaurant.address.city],
});

const trail = [
  { name: 'Início', path: '/' },
  { name: 'Entrega', path: '/entrega' },
];

export default function EntregaPage() {
  return (
    <>
      <JsonLd id="ld-entrega" data={graph(breadcrumbSchema(trail))} />

      <div className="container-page py-8">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">Entrega e retirada</h1>
          <p className="mt-4 text-lg text-charcoal-700">
            Entrega feita pela nossa própria equipe, sem intermediário e sem taxa de aplicativo. Confira a taxa e o
            prazo do seu bairro antes de fazer o pedido.
          </p>
        </header>

        <section className="mt-10" aria-labelledby="bairros">
          <h2 id="bairros" className="text-2xl font-semibold">
            Bairros atendidos
          </h2>
          <div className="mt-6 overflow-x-auto rounded-card border border-cream-200 bg-white">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Taxa e prazo de entrega por bairro</caption>
              <thead className="border-b border-cream-200 bg-cream-50 text-charcoal-500">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Bairro
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Taxa de entrega
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Prazo estimado
                  </th>
                </tr>
              </thead>
              <tbody>
                {restaurant.delivery.zones.map((zone) => (
                  <tr key={zone.id} className="border-b border-cream-200 last:border-b-0">
                    <th scope="row" className="px-5 py-4 font-medium">
                      {zone.name}
                    </th>
                    <td className="px-5 py-4">{formatPrice(zone.fee)}</td>
                    <td className="px-5 py-4 text-charcoal-500">{zone.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-charcoal-500">
            Não encontrou seu bairro? Fale com a gente pelo WhatsApp: dependendo da distância conseguimos atender.
          </p>
        </section>

        <section className="mt-12 grid gap-6 md:grid-cols-3" aria-labelledby="condicoes">
          <h2 id="condicoes" className="sr-only">
            Condições de entrega
          </h2>
          {[
            {
              title: 'Pedido mínimo',
              value: formatPrice(restaurant.delivery.minOrder),
              text: 'Válido apenas para entrega. Na retirada não há valor mínimo.',
            },
            {
              title: 'Frete grátis',
              value: `acima de ${formatPrice(restaurant.delivery.freeAbove)}`,
              text: 'Aplicado automaticamente no carrinho, em qualquer bairro atendido.',
            },
            {
              title: 'Retirada no local',
              value: restaurant.pickup.eta,
              text: `Retire em ${restaurant.address.street}, ${restaurant.address.district}.`,
            },
          ].map((card) => (
            <div key={card.title} className="rounded-card border border-cream-200 bg-white p-6">
              <h3 className="font-display text-lg font-semibold">{card.title}</h3>
              <p className="mt-2 font-display text-2xl font-bold text-ember-600">{card.value}</p>
              <p className="mt-2 text-sm text-charcoal-500">{card.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 max-w-3xl" aria-labelledby="pagamento">
          <h2 id="pagamento" className="text-2xl font-semibold">
            Formas de pagamento
          </h2>
          <p className="mt-3 text-charcoal-700">
            Aceitamos {restaurant.payments.join(', ')}. O pagamento é feito na entrega ou na retirada — combinamos
            tudo pelo WhatsApp antes de sair para a rua. Para Pix, a chave é <strong>{restaurant.pixKey}</strong>.
          </p>
          <Link
            href="/cardapio"
            className="mt-8 inline-block rounded-xl bg-ember-500 px-6 py-3.5 font-semibold text-white hover:bg-ember-600"
          >
            Fazer meu pedido
          </Link>
        </section>
      </div>
    </>
  );
}
