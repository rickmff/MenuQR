import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Container } from '@/components/ui/container';
import { platform, platformFaq } from '@/lib/platform';
import { breadcrumbSchema, buildMetadata, faqSchema, graph } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Perguntas frequentes sobre o cardápio digital',
  description: `Comissão, aplicativo, como o pedido chega, Google e domínio próprio: as dúvidas mais comuns de quem vai publicar o cardápio no ${platform.name}.`,
  path: '/perguntas-frequentes',
  keywords: [
    'cardápio digital sem comissão',
    'pedidos pelo WhatsApp como funciona',
    'cardápio online dúvidas',
    'cardápio QR code perguntas',
  ],
});

const trail = [
  { name: 'Início', path: '/' },
  { name: 'Perguntas frequentes', path: '/perguntas-frequentes' },
];

/**
 * As respostas moram em `platformFaq` (src/lib/platform.ts) e saem daqui
 * também como `FAQPage` — o dado estruturado só vale com o texto visível na
 * mesma página. A landing não tem FAQ de propósito (D15): esta página é o
 * lugar dele, uma tela com um objetivo só (D16).
 */
export default function FaqPage() {
  return (
    <>
      <JsonLd id="ld-faq" data={graph(faqSchema(platformFaq), breadcrumbSchema(trail))} />

      <Container className="py-10">
        <Breadcrumbs trail={trail} />

        <article className="mt-6 max-w-3xl">
          <h1 className="font-display text-h3 font-semibold text-gray-900 sm:text-h2">Perguntas frequentes</h1>
          <p className="mt-4 text-body1 leading-relaxed text-gray-700">
            O que quem vai publicar o cardápio costuma perguntar antes de assinar. Não achou a sua?
            Escreva para{' '}
            <a href={`mailto:${platform.email}`} className="font-semibold text-green-700 hover:text-primary">
              {platform.email}
            </a>
            .
          </p>

          <div className="mt-10 border-t border-gray-200">
            {platformFaq.map((entry) => (
              <section key={entry.question} className="border-b border-gray-200 py-6">
                <h2 className="font-display text-h6 font-semibold text-gray-900">{entry.question}</h2>
                <p className="mt-2 text-body1 leading-relaxed text-gray-700">{entry.answer}</p>
              </section>
            ))}
          </div>

          <div className="mt-10">
            <Button href="/criar-conta" variant="brand" size="lg" pill after={<NavIcon />}>
              Criar meu cardápio
            </Button>
          </div>
        </article>
      </Container>
    </>
  );
}
