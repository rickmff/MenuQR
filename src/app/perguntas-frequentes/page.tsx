import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { faq } from '@/lib/faq';
import { restaurant } from '@/lib/restaurant';
import { breadcrumbSchema, buildMetadata, faqSchema, graph } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Perguntas frequentes sobre pedidos e entrega',
  description:
    `Tire dúvidas sobre pedido mínimo, taxa de entrega, prazos, formas de pagamento e opções vegetarianas do ${restaurant.name}.`,
  path: '/perguntas-frequentes',
  keywords: ['dúvidas', 'pedido mínimo', 'taxa de entrega', 'formas de pagamento'],
});

const trail = [
  { name: 'Início', path: '/' },
  { name: 'Perguntas frequentes', path: '/perguntas-frequentes' },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd id="ld-faq" data={graph(faqSchema(faq), breadcrumbSchema(trail))} />

      <div className="container-page py-8">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">Perguntas frequentes</h1>
          <p className="mt-4 text-lg text-charcoal-700">
            As dúvidas que mais recebemos sobre pedidos, entrega e pagamento. Não achou a sua?{' '}
            <Link href="/contato" className="font-semibold text-ember-600 hover:text-ember-700">
              Fale com a gente
            </Link>
            .
          </p>
        </header>

        <div className="mt-10 max-w-3xl divide-y divide-cream-200 border-y border-cream-200">
          {faq.map((entry) => (
            <details key={entry.question} className="group py-5">
              <summary className="cursor-pointer list-none font-display text-lg font-semibold marker:content-none">
                <h2 className="flex items-center justify-between gap-4 text-lg">
                  {entry.question}
                  <span aria-hidden="true" className="text-ember-500 transition-transform group-open:rotate-45">
                    +
                  </span>
                </h2>
              </summary>
              <p className="mt-3 leading-relaxed text-charcoal-500">{entry.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </>
  );
}
