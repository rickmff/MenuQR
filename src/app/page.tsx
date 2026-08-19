import type { Metadata } from 'next';
import Link from 'next/link';
import { DishImage } from '@/components/dish-image';
import { JsonLd } from '@/components/json-ld';
import { OpeningBadge } from '@/components/opening-badge';
import { OrderButton } from '@/components/order-button';
import { formatPrice } from '@/lib/format';
import { faq } from '@/lib/faq';
import { getHighlights, menu, priceFrom } from '@/lib/menu';
import { restaurant } from '@/lib/restaurant';
import { buildMetadata, faqSchema, graph } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `${restaurant.name} — hambúrguer artesanal com delivery`,
  description: restaurant.shortDescription,
  path: '/',
  keywords: [
    'hamburgueria artesanal',
    `delivery ${restaurant.address.city}`,
    'peça pelo WhatsApp',
    'cardápio online',
  ],
});

const differentials = [
  {
    icon: '🔥',
    title: 'Blend moído no dia',
    text: 'Carne bovina selecionada, moída todas as manhãs e grelhada na chapa a 250 °C.',
  },
  {
    icon: '🥖',
    title: 'Pão assado na casa',
    text: 'Brioche fermentado por 24 horas na nossa padaria, sem conservantes.',
  },
  {
    icon: '🛵',
    title: 'Entrega própria',
    text: `Entregadores da casa, em até 45 minutos, num raio de ${restaurant.delivery.radiusKm} km.`,
  },
  {
    icon: '📲',
    title: 'Pedido sem aplicativo',
    text: 'Você monta o pedido no cardápio e finaliza direto no WhatsApp. Sem cadastro, sem taxa de app.',
  },
];

const steps = [
  { number: '1', title: 'Escolha os pratos', text: 'Navegue pelo cardápio e monte o pedido do seu jeito.' },
  { number: '2', title: 'Informe a entrega', text: 'Nome, WhatsApp, endereço e forma de pagamento no carrinho.' },
  { number: '3', title: 'Envie no WhatsApp', text: 'Abrimos a conversa com o pedido pronto — é só apertar enviar.' },
];

export default function HomePage() {
  const highlights = getHighlights(4);
  const cheapestFee = Math.min(...restaurant.delivery.zones.map((zone) => zone.fee));

  return (
    <>
      {/* O Menu completo fica em /cardapio; aqui marcamos só o FAQ visível na página. */}
      <JsonLd id="ld-home" data={graph(faqSchema(faq.slice(0, 5)))} />

      {/* ------------------------------------------------------------- hero */}
      <section className="border-b border-cream-200 bg-linear-to-b from-ember-50 to-cream-50">
        <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <OpeningBadge />
            <h1 className="mt-5 max-w-[16ch] text-4xl font-semibold leading-[1.08] sm:text-5xl">
              Hambúrguer artesanal de verdade, entregue quentinho na sua casa
            </h1>
            <p className="mt-5 max-w-xl text-lg text-charcoal-700">
              {restaurant.description}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/cardapio"
                className="rounded-xl bg-ember-500 px-7 py-4 font-semibold text-white shadow-soft transition-colors hover:bg-ember-600"
              >
                Ver cardápio e pedir
              </Link>
              <OrderButton className="rounded-xl border border-cream-200 bg-white px-7 py-4 font-semibold text-charcoal-900 transition-colors hover:border-ember-400">
                Abrir meu carrinho
              </OrderButton>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-cream-200 pt-6 text-sm">
              <div>
                <dt className="text-charcoal-500">Entrega a partir de</dt>
                <dd className="mt-1 font-display text-xl font-semibold">{formatPrice(cheapestFee)}</dd>
              </div>
              <div>
                <dt className="text-charcoal-500">Pratos a partir de</dt>
                <dd className="mt-1 font-display text-xl font-semibold">{formatPrice(priceFrom)}</dd>
              </div>
              <div>
                <dt className="text-charcoal-500">Frete grátis acima de</dt>
                <dd className="mt-1 font-display text-xl font-semibold">
                  {formatPrice(restaurant.delivery.freeAbove)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {highlights.map(({ item, category }, index) => (
                <Link
                  key={item.id}
                  href={`/cardapio/${category.slug}/${item.slug}`}
                  className={`group rounded-card border border-cream-200 bg-white p-4 shadow-soft transition-transform hover:-translate-y-1 ${
                    index % 2 === 1 ? 'translate-y-6' : ''
                  }`}
                >
                  <DishImage
                    image={item.image}
                    alt={item.imageAlt ?? item.name}
                    priority={index < 2}
                    className="aspect-square w-full rounded-xl"
                    emojiClassName="text-6xl"
                    sizes="(max-width: 1024px) 45vw, 220px"
                  />
                  <p className="mt-3 font-display font-semibold group-hover:text-ember-600">{item.name}</p>
                  <p className="text-sm text-charcoal-500">{formatPrice(item.price)}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- diferenciais */}
      <section className="container-page py-16" aria-labelledby="diferenciais">
        <h2 id="diferenciais" className="text-3xl font-semibold">
          Por que pedir no {restaurant.name}
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {differentials.map((entry) => (
            <li key={entry.title} className="rounded-card border border-cream-200 bg-white p-6">
              <span aria-hidden="true" className="text-3xl">
                {entry.icon}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold">{entry.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{entry.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ categorias */}
      <section className="border-y border-cream-200 bg-white py-16" aria-labelledby="categorias">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="categorias" className="text-3xl font-semibold">
                Nosso cardápio
              </h2>
              <p className="mt-2 max-w-2xl text-charcoal-500">
                Hambúrgueres artesanais, porções para dividir, bebidas geladas e sobremesas feitas na casa.
              </p>
            </div>
            <Link href="/cardapio" className="font-semibold text-ember-600 hover:text-ember-700">
              Ver cardápio completo →
            </Link>
          </div>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {menu.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/cardapio/${category.slug}`}
                  className="flex h-full flex-col rounded-card border border-cream-200 p-6 transition-colors hover:border-ember-400"
                >
                  <span aria-hidden="true" className="text-3xl">
                    {category.icon}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold">{category.name}</h3>
                  <p className="mt-2 text-sm text-charcoal-500">{category.description}</p>
                  <span className="mt-4 text-sm font-medium text-ember-600">
                    {category.items.length} opções →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------- como funciona */}
      <section className="container-page py-16" aria-labelledby="como-funciona">
        <h2 id="como-funciona" className="text-3xl font-semibold">
          Como funciona o pedido
        </h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.number} className="rounded-card border border-cream-200 bg-white p-6">
              <span className="grid size-10 place-items-center rounded-full bg-ember-500 font-display text-lg font-bold text-white">
                {step.number}
              </span>
              <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------------------------------------------- entrega */}
      <section className="border-y border-cream-200 bg-white py-16" aria-labelledby="entrega">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 id="entrega" className="text-3xl font-semibold">
              Onde entregamos
            </h2>
            <p className="mt-3 text-charcoal-500">
              Entrega própria em {restaurant.delivery.zones.length} bairros de {restaurant.address.city}, num raio
              de {restaurant.delivery.radiusKm} km do restaurante. Frete grátis em pedidos acima de{' '}
              {formatPrice(restaurant.delivery.freeAbove)}.
            </p>
            <Link href="/entrega" className="mt-4 inline-block font-semibold text-ember-600 hover:text-ember-700">
              Ver detalhes da entrega →
            </Link>
          </div>

          <table className="w-full text-left text-sm">
            <caption className="sr-only">Taxas e prazos de entrega por bairro</caption>
            <thead>
              <tr className="border-b border-cream-200 text-charcoal-500">
                <th scope="col" className="py-2 font-medium">
                  Bairro
                </th>
                <th scope="col" className="py-2 font-medium">
                  Taxa
                </th>
                <th scope="col" className="py-2 font-medium">
                  Prazo
                </th>
              </tr>
            </thead>
            <tbody>
              {restaurant.delivery.zones.map((zone) => (
                <tr key={zone.id} className="border-b border-cream-200 last:border-b-0">
                  <th scope="row" className="py-3 font-medium">
                    {zone.name}
                  </th>
                  <td className="py-3">{formatPrice(zone.fee)}</td>
                  <td className="py-3 text-charcoal-500">{zone.eta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ faq */}
      <section className="container-page py-16" aria-labelledby="faq">
        <h2 id="faq" className="text-3xl font-semibold">
          Perguntas frequentes
        </h2>
        <div className="mt-8 max-w-3xl divide-y divide-cream-200 border-y border-cream-200">
          {faq.slice(0, 5).map((entry) => (
            <details key={entry.question} className="group py-4">
              <summary className="cursor-pointer list-none font-display text-lg font-semibold marker:content-none">
                <span className="flex items-center justify-between gap-4">
                  {entry.question}
                  <span aria-hidden="true" className="text-ember-500 transition-transform group-open:rotate-45">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-2 text-charcoal-500">{entry.answer}</p>
            </details>
          ))}
        </div>
        <Link
          href="/perguntas-frequentes"
          className="mt-6 inline-block font-semibold text-ember-600 hover:text-ember-700"
        >
          Ver todas as perguntas →
        </Link>
      </section>

      {/* ------------------------------------------------------------------ cta */}
      <section className="container-page pb-16">
        <div className="rounded-card bg-charcoal-900 px-8 py-14 text-center text-cream-50">
          <h2 className="text-3xl font-semibold">Bateu a fome?</h2>
          <p className="mx-auto mt-3 max-w-xl text-cream-100/80">
            Monte seu pedido em menos de dois minutos e finalize no WhatsApp. Sem aplicativo, sem cadastro e sem
            taxa de serviço.
          </p>
          <Link
            href="/cardapio"
            className="mt-8 inline-block rounded-xl bg-ember-500 px-8 py-4 font-semibold text-white transition-colors hover:bg-ember-600"
          >
            Fazer meu pedido
          </Link>
        </div>
      </section>
    </>
  );
}
