import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { DemoDelivery } from '@/components/platform/landing/demo-delivery';
import { DemoHours } from '@/components/platform/landing/demo-hours';
import { DemoOptions } from '@/components/platform/landing/demo-options';
import { MagneticCta } from '@/components/platform/landing/final-cta';
import { HeroDemo } from '@/components/platform/landing/hero-demo';
import { HowItWorks } from '@/components/platform/landing/how-it-works';
import { Reveal, RevealItem } from '@/components/platform/landing/reveal';
import { WordReveal } from '@/components/platform/landing/word-reveal';
import { JsonLd } from '@/components/json-ld';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { sampleBusiness } from '@/lib/demo/sample-data';
import { platform } from '@/lib/platform';
import { buildMetadata, graph, platformOrganizationSchema, platformWebsiteSchema } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';

export const metadata: Metadata = buildMetadata({
  title: `${platform.name} — cardápio digital com pedidos no WhatsApp`,
  description: platform.shortDescription,
  path: '/',
  keywords: [
    'cardápio digital',
    'cardápio online para restaurante',
    'pedidos pelo WhatsApp',
    'delivery sem comissão',
    'cardápio QR code',
    'sistema para restaurante',
  ],
});

const CTA = 'Criar meu cardápio';
const STORE_PATH = `/r/${sampleBusiness.slug}`;

const capabilities = [
  {
    label: 'Complementos',
    title: 'Complementos que se somam sozinhos',
    text: 'Ponto da carne, adicionais pagos, limite de escolhas: o preço fecha na hora.',
    demo: <DemoOptions />,
  },
  {
    label: 'Entrega',
    title: 'Entrega por bairro, com a sua regra',
    text: 'Taxa e prazo por região, pedido mínimo e frete grátis a partir do valor que você definir.',
    demo: <DemoDelivery />,
  },
  {
    label: 'Horário',
    title: 'Aberto e fechado na hora certa',
    text: 'A página segue o seu horário e pausa os pedidos quando a cozinha fecha.',
    demo: <DemoHours />,
  },
];

export default async function LandingPage() {
  const storeUrl = absoluteUrl(STORE_PATH);
  // QR code real do cardápio de exemplo, gerado no servidor: é o que o lojista imprime.
  const qrSvg = await QRCode.toString(storeUrl, {
    type: 'svg',
    margin: 0,
    width: 152,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });

  return (
    <>
      <JsonLd id="ld-landing" data={graph(platformOrganizationSchema(), platformWebsiteSchema())} />

      {/* ------------------------------------------------------------- hero */}
      <section aria-labelledby="hero-titulo">
        <Container className="grid items-center gap-12 pb-16 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8 lg:pb-28 lg:pt-20">
          <div className="max-w-xl">
            <h1
              id="hero-titulo"
              className="text-h2 font-extrabold tracking-tight text-gray-700 sm:text-h1 lg:text-display"
            >
              <WordReveal text="Seu cardápio, pedidos no WhatsApp" accent="WhatsApp" />
            </h1>
            <p className="mt-5 max-w-lg text-body1 text-gray-600 lg:text-subtitle">
              Monte o cardápio, compartilhe o link ou o QR code e receba cada pedido pronto no seu WhatsApp.
              Sem comissão.
            </p>
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button href="/criar-conta" size="lg" pill className="w-full sm:w-auto">
                {CTA}
              </Button>
              <Button href={STORE_PATH} variant="text" size="lg" pill className="w-full sm:w-auto">
                Ver cardápio de exemplo
              </Button>
            </div>
          </div>

          <div aria-hidden="true" className="lg:justify-self-end lg:pr-10">
            <HeroDemo />
          </div>
        </Container>
      </section>

      {/* --------------------------------------------------- como funciona */}
      <section id="como-funciona" className="scroll-mt-16 py-16 lg:py-24" aria-labelledby="como-funciona-titulo">
        <Container>
          <Reveal>
            <RevealItem as="p" className="font-mono text-caption uppercase tracking-widest text-gray-600">
              Como funciona
            </RevealItem>
            <RevealItem as="h2" className="mt-3 max-w-2xl text-h3 font-bold tracking-tight text-gray-700 lg:text-h2">
              <span id="como-funciona-titulo">Do cadastro ao pedido em três passos</span>
            </RevealItem>
          </Reveal>
        </Container>
        <div className="mt-12 lg:mt-16">
          <HowItWorks qrSvg={qrSvg} storeUrl={storeUrl} />
        </div>
      </section>

      {/* ------------------------------------------------------ capacidades */}
      <section id="capacidades" className="scroll-mt-16 py-16 lg:py-24" aria-labelledby="capacidades-titulo">
        <Container>
          <Reveal>
            <RevealItem as="p" className="font-mono text-caption uppercase tracking-widest text-gray-600">
              Capacidades
            </RevealItem>
            <RevealItem as="h2" className="mt-3 max-w-2xl text-h3 font-bold tracking-tight text-gray-700 lg:text-h2">
              <span id="capacidades-titulo">Regras suas, aplicadas no cardápio</span>
            </RevealItem>
          </Reveal>

          <div className="mt-12 space-y-16 lg:mt-16 lg:space-y-24">
            {capabilities.map((capability, index) => (
              <Reveal
                key={capability.label}
                className="grid items-center gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16"
              >
                <RevealItem className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <p className="font-mono text-caption uppercase tracking-widest text-gray-600">
                    {String(index + 1).padStart(2, '0')} / {capability.label}
                  </p>
                  <h3 className="mt-3 text-h5 font-bold tracking-tight text-gray-700 lg:text-h4">{capability.title}</h3>
                  <p className="mt-2 max-w-md text-body1 text-gray-600">{capability.text}</p>
                </RevealItem>
                <RevealItem className={index % 2 === 1 ? 'lg:order-1' : ''}>{capability.demo}</RevealItem>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="py-24 lg:py-32" aria-labelledby="cta-titulo">
        <Container className="flex flex-col items-center text-center">
          <Reveal className="flex flex-col items-center">
            <RevealItem as="h2" className="text-h3 font-extrabold tracking-tight text-gray-700 lg:text-h1">
              <span id="cta-titulo">Seu cardápio no ar hoje</span>
            </RevealItem>
            <RevealItem className="mt-8">
              <MagneticCta href="/criar-conta">{CTA}</MagneticCta>
            </RevealItem>
            <RevealItem as="p" className="mt-6 font-mono text-caption uppercase tracking-widest text-gray-600">
              sem cartão · sem comissão · sem fidelidade
            </RevealItem>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
