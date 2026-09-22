import { Check, ChevronDown, MessageCircle, Plus, Search, Share2, ShoppingBag } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { audiences, featureIcons } from '@/components/platform/landing-content';
import { DishImage } from '@/components/store/dish-image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { Tag } from '@/components/ui/tag';
import { showcase } from '@/lib/demo/showcase';
import { features, platform, platformFaq, plans, steps } from '@/lib/platform';
import {
  buildMetadata,
  faqSchema,
  graph,
  platformOrganizationSchema,
  platformWebsiteSchema,
  softwareApplicationSchema,
} from '@/lib/seo';

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

const stats = [
  { label: 'Comissão por pedido', value: '0%' },
  { label: 'Para publicar', value: '10 min' },
  { label: 'Para começar', value: 'R$ 0' },
];

export default function LandingPage() {
  return (
    <>
      <JsonLd
        id="ld-landing"
        data={graph(
          platformOrganizationSchema(),
          platformWebsiteSchema(),
          softwareApplicationSchema(
            // Só vira oferta o plano que dá para contratar: "Em breve" com preço seria
            // anunciar ao Google uma venda que não existe.
            plans
              .filter((plan) => plan.available)
              .map((plan) => ({ name: plan.name, price: plan.price.replace(/\D/g, '') })),
          ),
          faqSchema(platformFaq),
        )}
      />

      {/* ------------------------------------------------------------- hero */}
      <section className="bg-white">
        <Container className="grid items-center gap-12 pb-12 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20 lg:pt-16">
          <div>
            <h1 className="max-w-[16ch] text-h2 font-extrabold tracking-tight text-gray-700 sm:text-h1 lg:text-display">
              Cardápio digital que vende pelo <span className="text-primary">WhatsApp</span>
            </h1>

            <p className="mt-5 max-w-xl text-body1 text-gray-600 lg:text-subtitle">
              Cadastre seu restaurante, monte o cardápio e ganhe uma página pronta para receber pedidos de
              delivery e retirada. O cliente escolhe os pratos e a mensagem chega organizada no seu WhatsApp.
            </p>

            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button href="/criar-conta" size="lg" pill className="w-full sm:w-auto">
                Criar meu cardápio
              </Button>
              <Button href="/r/sabor-e-brasa" variant="text" size="lg" pill className="w-full sm:w-auto">
                Ver cardápio de exemplo
              </Button>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-gray-200 pt-6">
              {stats.map((stat) => (
                // O número vem antes aos olhos; no DOM o termo (dt) continua antes do valor (dd).
                // justify-end (o "topo" de um flex invertido) alinha os números entre as colunas.
                <div key={stat.label} className="flex flex-col-reverse justify-end">
                  <dt className="mt-1 text-caption text-gray-600">{stat.label}</dt>
                  <dd className="text-h5 font-bold text-gray-700">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <StorePreview />
        </Container>

      </section>

      {/* -------------------------------------------------------- recursos */}
      <section id="recursos" className="scroll-mt-14 bg-white py-12 lg:py-16" aria-labelledby="recursos-titulo">
        <Container>
          <SectionHeading
            id="recursos-titulo"
            label="Recursos"
            title="Tudo o que o seu delivery precisa, sem intermediário"
            text={`O ${platform.name} cuida do cardápio, das regras de entrega e do pedido. O relacionamento com o cliente continua sendo seu.`}
          />

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = featureIcons[feature.id];
              return (
                <Card as="li" key={feature.id} padding="md" className="flex gap-4 sm:block">
                  <IconBubble>
                    <Icon aria-hidden="true" className="size-6" />
                  </IconBubble>
                  <div>
                    <h3 className="text-body1 font-semibold text-gray-700 sm:mt-4">{feature.title}</h3>
                    <p className="mt-1 text-body2 text-gray-600 sm:mt-2">{feature.text}</p>
                  </div>
                </Card>
              );
            })}
          </ul>
        </Container>
      </section>

      {/* --------------------------------------------------- como funciona */}
      <section
        id="como-funciona"
        className="scroll-mt-14 bg-gray-50 py-12 lg:py-16"
        aria-labelledby="como-funciona-titulo"
      >
        <Container>
          <SectionHeading
            id="como-funciona-titulo"
            label="Como funciona"
            title="Do cadastro ao primeiro pedido em quatro passos"
            text="Sem instalação, sem integração e sem contrato de fidelidade."
          />

          <ol className="mt-8 grid gap-8 md:grid-cols-2 lg:mt-10 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.number}>
                <span className="grid size-10 place-items-center rounded-full bg-primary text-body1 font-bold text-white">
                  {step.number}
                </span>
                <h3 className="mt-4 text-subtitle font-semibold text-gray-700">{step.title}</h3>
                <p className="mt-2 text-body2 text-gray-600">{step.text}</p>
              </li>
            ))}
          </ol>

          <Button href="/criar-conta" size="lg" pill className="mt-10">
            Começar agora
          </Button>
        </Container>
      </section>

      {/* --------------------------------------------------------- para quem */}
      <section className="bg-white py-12 lg:py-16" aria-labelledby="para-quem">
        <Container>
          <SectionHeading id="para-quem" label="Para quem é" title="Feito para quem vende comida" />

          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:mt-10">
            {audiences.map((audience) => (
              <Card as="li" key={audience.title} padding="md" className="flex gap-4">
                <IconBubble>
                  <audience.icon aria-hidden="true" className="size-6" />
                </IconBubble>
                <div>
                  <h3 className="text-body1 font-semibold text-gray-700">{audience.title}</h3>
                  <p className="mt-1 text-body2 text-gray-600">{audience.text}</p>
                </div>
              </Card>
            ))}
          </ul>
        </Container>
      </section>

      {/* ----------------------------------------------------------- planos */}
      <section id="planos" className="scroll-mt-14 bg-gray-50 py-12 lg:py-16" aria-labelledby="planos-titulo">
        <Container>
          <SectionHeading
            id="planos-titulo"
            label="Planos"
            title="Comece grátis, sem comissão por pedido"
            text="O plano grátis já coloca o cardápio no ar. O Profissional ainda não pode ser assinado."
          />

          <div className="mt-8 grid gap-4 lg:mt-10 lg:grid-cols-2 lg:gap-6">
            {plans.map((plan) => (
              <PlanCard key={plan.name} plan={plan} />
            ))}
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------- faq */}
      <section id="perguntas" className="scroll-mt-14 bg-white py-12 lg:py-16" aria-labelledby="perguntas-titulo">
        <Container className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
          <div>
            <SectionHeading id="perguntas-titulo" label="Dúvidas" title="Perguntas frequentes" />
            <p className="mt-3 text-body1 text-gray-600">
              Não achou o que procurava? Escreva para{' '}
              <a className="font-semibold text-primary hover:text-primary-pressed" href={`mailto:${platform.email}`}>
                {platform.email}
              </a>
              .
            </p>
          </div>

          <div className="border-t border-gray-200">
            {platformFaq.map((entry) => (
              <details key={entry.question} className="group border-b border-gray-200">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 marker:content-none [&::-webkit-details-marker]:hidden">
                  <h3 className="text-body1 font-semibold text-gray-700">{entry.question}</h3>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-5 shrink-0 text-gray-600 transition-transform duration-200 ease-standard group-open:rotate-180"
                  />
                </summary>
                <p className="animate-fade-in pb-5 text-body2 text-gray-600">{entry.answer}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="bg-white pb-12 lg:pb-16" aria-labelledby="cta-titulo">
        <Container>
          {/* O único bloco vermelho grande da página: é a chamada final. */}
          <div className="rounded-lg bg-primary px-6 py-12 text-center text-white lg:py-16">
            <h2 id="cta-titulo" className="text-h4 font-bold lg:text-h3 lg:tracking-tight">
              Seu cardápio pode estar no ar hoje
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-body1 text-white/90 lg:text-subtitle">
              Crie a conta, cadastre o restaurante e comece a receber pedidos no WhatsApp. Sem cartão de
              crédito, sem comissão e sem fidelidade.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <Button href="/criar-conta" variant="secondary" size="lg" pill>
                Criar conta
              </Button>
              <Link
                href="/r/sabor-e-brasa"
                className="press inline-flex h-14 items-center rounded-full px-6 text-body1 font-semibold text-white hover:bg-white/10 active:bg-white/20"
              >
                Ver um cardápio pronto
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

function SectionHeading({
  id,
  label,
  title,
  text,
}: {
  id: string;
  label: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-body2 font-semibold text-primary">{label}</p>
      <h2 id={id} className="mt-2 text-h4 font-bold text-gray-700 lg:text-h3 lg:tracking-tight">
        {title}
      </h2>
      {text && <p className="mt-3 text-body1 text-gray-600 lg:text-subtitle">{text}</p>}
    </div>
  );
}

function IconBubble({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary-tint text-primary">
      {children}
    </span>
  );
}

function PlanCard({ plan }: { plan: (typeof plans)[number] }) {
  return (
    <Card padding="lg" highlight={plan.highlight} className="flex flex-col">
      <div className="flex items-center gap-3">
        <h3 className="text-subtitle font-bold text-gray-700">{plan.name}</h3>
        {!plan.available && (
          <Tag tone="dark" size="md">
            Em breve
          </Tag>
        )}
      </div>

      <p className="mt-5 text-h2 font-extrabold tracking-tight text-gray-700">
        {plan.price}
        <span className="ml-2 text-body2 font-medium tracking-normal text-gray-600">{plan.period}</span>
      </p>
      <p className="mt-2 text-body2 text-gray-600">{plan.description}</p>

      <ul className="mt-6 space-y-3 text-body2 text-gray-700">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-positive" />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        {/* Acima do botão, para os dois botões continuarem alinhados na base dos cards. */}
        {plan.note && <p className="mb-3 text-body2 text-gray-600">{plan.note}</p>}
        <Button href="/criar-conta" variant={plan.highlight ? 'primary' : 'secondary'} fullWidth>
          {plan.cta}
        </Button>
      </div>
    </Card>
  );
}

/**
 * Prévia do produto: o cardápio como o cliente vê e a mensagem que chega ao
 * lojista. É ilustração (aria-hidden), mas usa os dados do restaurante de exemplo
 * e o DishImage real, para nunca anunciar o que o cardápio não tem.
 */
function StorePreview() {
  return (
    <div className="mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-highest">
        <div className="flex h-12 items-center gap-4 border-b border-gray-200 px-4 text-gray-700">
          <p className="min-w-0 flex-1 truncate text-body2 font-semibold">{showcase.name}</p>
          <Search className="size-5" />
          <Share2 className="size-5" />
          <span className="relative">
            <ShoppingBag className="size-5" />
            <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold leading-none text-white">
              1
            </span>
          </span>
        </div>

        <div className="flex items-center gap-3 px-4 pt-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full border border-gray-200 bg-gray-100 text-h5">
            {showcase.logo}
          </span>
          <div className="min-w-0">
            <p className="truncate text-body1 font-bold text-gray-700">{showcase.name}</p>
            <p className="flex items-center gap-1.5 text-caption text-gray-600">
              <span className="size-1.5 rounded-full bg-positive" /> Aberto • entrega {showcase.eta}
            </p>
          </div>
        </div>

        <div className="mt-3 flex gap-5 overflow-hidden whitespace-nowrap border-b border-gray-200 px-4 text-body2 font-semibold">
          {showcase.categories.map((category, index) => (
            <span
              key={category}
              className={index === 0 ? 'border-b-2 border-primary pb-2.5 text-primary' : 'pb-2.5 text-gray-600'}
            >
              {category}
            </span>
          ))}
        </div>

        <ul className="px-4">
          {showcase.items.map((item) => (
            <li key={item.name} className="flex items-center gap-3 border-b border-gray-200 py-3 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body2 font-semibold text-gray-700">{item.name}</p>
                <p className="mt-0.5 line-clamp-1 text-caption text-gray-600">{item.description}</p>
                <p className="mt-1 text-body2 font-semibold text-gray-700">{item.price}</p>
              </div>
              <div className="relative shrink-0">
                <DishImage
                  image={item.image}
                  alt=""
                  sizes="64px"
                  className="size-16 rounded-sm"
                />
                <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-white text-primary shadow-medium">
                  <Plus className="size-4" />
                </span>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-gray-200 p-3">
          <div className="flex h-11 items-center justify-between rounded-sm bg-primary px-4 text-body2 font-semibold text-white">
            <span className="flex items-center gap-2">
              <ShoppingBag className="size-4" /> Ver sacola
            </span>
            <span className="tabular-nums">{showcase.bagTotal}</span>
          </div>
        </div>
      </div>

      <div className="relative -mt-3 ml-8 rounded-lg border border-gray-200 bg-white p-4 shadow-high">
        <p className="flex items-center gap-2 text-caption font-semibold text-gray-700">
          <span className="grid size-6 place-items-center rounded-full bg-success-bg text-success">
            <MessageCircle className="size-3.5" />
          </span>
          Chega assim no seu WhatsApp
        </p>
        <pre className="mt-2 whitespace-pre-wrap font-sans text-caption leading-relaxed text-gray-600">
          {showcase.message}
        </pre>
      </div>
    </div>
  );
}
