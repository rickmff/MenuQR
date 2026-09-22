import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import QRCode from 'qrcode';
import { MagneticCta } from '@/components/platform/landing/final-cta';
import { HeroDemo } from '@/components/platform/landing/hero-demo';
import { HowItWorks } from '@/components/platform/landing/how-it-works';
import {
  capabilityIcons,
  TableTentIllustration,
} from '@/components/platform/landing/illustrations';
import { Reveal, RevealItem } from '@/components/platform/landing/reveal';
import { WordReveal } from '@/components/platform/landing/word-reveal';
import { JsonLd } from '@/components/json-ld';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { WhatsAppGlyph } from '@/components/ui/whatsapp-glyph';
import { sampleBusiness } from '@/lib/demo/sample-data';
import { capabilities, platform, pricing } from '@/lib/platform';
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
        <Container className="grid items-center gap-12 pb-16 pt-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-8 lg:pb-28 lg:pt-20">
          <div className="max-w-xl">
            <h1
              id="hero-titulo"
              className="text-h2 font-extrabold tracking-tight text-gray-700 sm:text-h1 lg:text-display"
            >
              <WordReveal
                text="Seu cardápio, pedidos no WhatsApp"
                accent="WhatsApp"
                accentIcon={<WhatsAppGlyph className="ml-[0.18em] inline-block size-[0.8em] align-[-0.06em]" />}
              />
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

          {/* pr-40 no desktop reserva o espaço que a bolha ocupa fora do telefone. */}
          <div aria-hidden="true" className="lg:justify-self-end lg:pr-40">
            <HeroDemo />
          </div>
        </Container>
      </section>

      {/* --------------------------------------------------- como funciona */}
      <section
        id="como-funciona"
        className="wallpaper scroll-mt-16 border-y border-gray-200 py-16 lg:py-24"
        aria-labelledby="como-funciona-titulo"
      >
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

      {/* ------------------------------------------------------ capacidades
        * Lista, não demonstração: os três demos interativos saíram porque a
        * página já mostra o produto rodando no hero e nos passos. Aqui o papel
        * é varrer o que dá para configurar, em uma linha cada.
        */}
      <section id="capacidades" className="scroll-mt-16 py-16 lg:py-24" aria-labelledby="capacidades-titulo">
        <Container>
          <Reveal className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <RevealItem as="p" className="font-mono text-caption uppercase tracking-widest text-gray-600">
                Capacidades
              </RevealItem>
              <RevealItem as="h2" className="mt-3 max-w-2xl text-h3 font-bold tracking-tight text-gray-700 lg:text-h2">
                <span id="capacidades-titulo">Regras suas, aplicadas no cardápio</span>
              </RevealItem>
            </div>
            <RevealItem className="hidden lg:block">
              <TableTentIllustration className="h-28 text-gray-700" />
            </RevealItem>
          </Reveal>

          <Reveal as="ul" className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            {capabilities.map((capability, index) => {
              const Icon = capabilityIcons[capability.label];
              return (
                <RevealItem as="li" key={capability.label} className="border-t-2 border-gray-200 pt-5">
                  <Icon className="size-8 text-primary" />
                  <p className="mt-4 font-mono text-caption uppercase tracking-widest text-gray-400">
                    {String(index + 1).padStart(2, '0')} / {capability.label}
                  </p>
                  <h3 className="mt-2 text-subtitle font-bold text-gray-700">{capability.title}</h3>
                  <p className="mt-2 text-body2 text-gray-600">{capability.text}</p>
                </RevealItem>
              );
            })}
          </Reveal>
        </Container>
      </section>

      {/* ----------------------------------------------------------- preço */}
      <section id="preco" className="scroll-mt-16 border-y border-gray-200 bg-gray-50 py-16 lg:py-24" aria-labelledby="preco-titulo">
        {/* Uma coluna só, centrada: é a última pergunta antes do cadastro, e
            aqui o preço é a única coisa que precisa ser lida. */}
        <Container className="flex flex-col items-center text-center">
          <Reveal>
            <RevealItem as="p" className="font-mono text-caption uppercase tracking-widest text-gray-600">
              Preço
            </RevealItem>
            <RevealItem as="h2" className="mt-3 text-h3 font-bold tracking-tight text-gray-700 lg:text-h2">
              <span id="preco-titulo">Um plano, tudo dentro</span>
            </RevealItem>
            <RevealItem as="p" className="mx-auto mt-3 max-w-md text-body1 text-gray-600">
              Sem versão grátis e sem escolher entre pacotes: todo restaurante no {platform.name} tem o mesmo
              cardápio completo.
            </RevealItem>
          </Reveal>

          <Reveal className="mt-10 w-full lg:mt-12">
            <RevealItem>
              <Card padding="none" highlight className="mx-auto max-w-md overflow-hidden">
                <p className="bg-primary py-2 text-center font-mono text-caption font-bold uppercase tracking-widest text-white">
                  {pricing.badge}
                </p>

                <div className="p-6 lg:p-8">
                  <p className="flex items-baseline justify-center gap-1 text-gray-700">
                    <span className="text-h1 font-extrabold tracking-tight lg:text-display">{pricing.price}</span>
                    <span className="text-subtitle font-semibold text-gray-600">{pricing.period}</span>
                  </p>
                  <p className="mt-2 text-center text-body2 text-gray-600">{pricing.billing}</p>

                  {/* A lista volta para a esquerda: linha de check centrada não se lê. */}
                  <ul className="mt-6 space-y-3 border-t border-gray-200 pt-6 text-left">
                    {pricing.includes.map((line) => (
                      <li key={line} className="flex items-start gap-3 text-body2 text-gray-700">
                        <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                        {line}
                      </li>
                    ))}
                  </ul>

                  <Button href="/criar-conta" size="lg" pill fullWidth className="mt-8">
                    {CTA}
                  </Button>
                  <p className="mt-3 text-center text-caption text-gray-600">{pricing.note}</p>
                </div>
              </Card>
            </RevealItem>
          </Reveal>
        </Container>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="py-16 lg:py-24" aria-labelledby="cta-titulo">
        <Container className="flex flex-col items-center">
          <div className="wallpaper-light relative w-full overflow-hidden rounded-xl bg-primary px-6 py-14 text-center lg:px-16 lg:py-20">
            <QrFrame />
            <Reveal className="relative flex flex-col items-center">
              <RevealItem as="h2" className="max-w-2xl text-h2 font-extrabold tracking-tight text-white lg:text-h1">
                <span id="cta-titulo">Seu cardápio no ar hoje</span>
              </RevealItem>
              <RevealItem className="mt-8">
                <MagneticCta href="/criar-conta" variant="secondary">
                  {CTA}
                </MagneticCta>
              </RevealItem>
            </Reveal>
          </div>

          <p className="mt-6 text-center font-mono text-caption uppercase tracking-widest text-gray-600">
            sem comissão · pedidos ilimitados · seu cliente não instala nada
          </p>
        </Container>
      </section>
    </>
  );
}

/**
 * O bloco do CTA é o próprio QR code: o rabisco do papel de parede por baixo e
 * os três olhos de leitura nos cantos, como no logo. Decoração declarada — daí o
 * `aria-hidden` e o branco a 12%, que não disputa com o texto por cima.
 */
function QrFrame() {
  const corners = ['left-5 top-5 lg:left-8 lg:top-8', 'right-5 top-5 lg:right-8 lg:top-8', 'bottom-5 left-5 lg:bottom-8 lg:left-8'];
  return (
    <>
      {corners.map((position) => (
        <svg
          key={position}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`pointer-events-none absolute size-10 text-white opacity-[0.14] lg:size-14 ${position}`}
        >
          <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="none" stroke="currentColor" strokeWidth="3" />
          <rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor" />
        </svg>
      ))}
    </>
  );
}
