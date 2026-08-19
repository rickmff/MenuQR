import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { restaurant } from '@/lib/restaurant';
import { breadcrumbSchema, buildMetadata, graph } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Sobre o ${restaurant.name}`,
  description:
    `Conheça a história do ${restaurant.name}, hamburgueria artesanal em ${restaurant.address.city} desde ${restaurant.founded}: ` +
    'blend próprio, pães assados na casa e ingredientes de produtores locais.',
  path: '/sobre',
  keywords: ['hamburgueria artesanal', 'história do restaurante', restaurant.address.city],
});

const trail = [
  { name: 'Início', path: '/' },
  { name: 'Sobre nós', path: '/sobre' },
];

const values = [
  {
    title: 'Ingrediente honesto',
    text: 'Carne de fornecedor rastreado, hortifrúti do produtor da região e nada de conservantes no pão.',
  },
  {
    title: 'Cozinha à vista',
    text: 'Nossa cozinha é aberta ao salão: quem come no local acompanha o preparo do começo ao fim.',
  },
  {
    title: 'Time valorizado',
    text: 'Equipe fixa, contratada em regime CLT, com treinamento de manipulação de alimentos em dia.',
  },
  {
    title: 'Menos desperdício',
    text: 'Embalagens recicláveis, óleo destinado à reciclagem e produção ajustada à demanda do dia.',
  },
];

export default function SobrePage() {
  return (
    <>
      <JsonLd id="ld-sobre" data={graph(breadcrumbSchema(trail))} />

      <div className="container-page py-8">
        <Breadcrumbs trail={trail} />

        <article className="mt-6 max-w-3xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">
            Uma hamburgueria de bairro, feita para durar
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-charcoal-700">
            O {restaurant.name} nasceu em {restaurant.founded}, numa cozinha de {restaurant.address.district.toLowerCase()} com
            duas chapas e uma ideia simples: servir hambúrguer artesanal de verdade, com ingrediente de procedência e
            preço justo. Dez anos depois, seguimos com a mesma receita de blend e a mesma equipe na chapa.
          </p>

          <p className="mt-4 leading-relaxed text-charcoal-700">
            Moemos a carne todas as manhãs, assamos os pães brioche na casa com fermentação de 24 horas e trabalhamos
            com hortifrúti de produtores da região metropolitana. Nada de pré-pronto, nada congelado: se não sai bom,
            não sai da cozinha.
          </p>

          <h2 className="mt-12 text-2xl font-semibold">O que nos guia</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {values.map((value) => (
              <li key={value.title} className="rounded-card border border-cream-200 bg-white p-6">
                <h3 className="font-display text-lg font-semibold">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{value.text}</p>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 text-2xl font-semibold">Onde estamos</h2>
          <p className="mt-4 leading-relaxed text-charcoal-700">
            Ficamos na {restaurant.address.street}, {restaurant.address.district}, {restaurant.address.city} —{' '}
            {restaurant.address.state}. O salão tem 40 lugares e recebe pedidos para retirada; a entrega própria cobre{' '}
            {restaurant.delivery.zones.length} bairros num raio de {restaurant.delivery.radiusKm} km.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/cardapio"
              className="rounded-xl bg-ember-500 px-6 py-3.5 font-semibold text-white hover:bg-ember-600"
            >
              Ver o cardápio
            </Link>
            <Link
              href="/contato"
              className="rounded-xl border border-cream-200 bg-white px-6 py-3.5 font-semibold hover:border-ember-400"
            >
              Falar com a gente
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}
