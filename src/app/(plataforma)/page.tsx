import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
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

const audiences = [
  {
    icon: '🍔',
    title: 'Hamburguerias e pizzarias',
    text: 'Complementos, pontos de carne e adicionais pagos, com o pedido chegando organizado na cozinha.',
  },
  {
    icon: '🥘',
    title: 'Restaurantes e marmitarias',
    text: 'Cardápio do dia, categorias por refeição e entrega por bairro com taxa e prazo próprios.',
  },
  {
    icon: '☕',
    title: 'Cafeterias e docerias',
    text: 'QR code na mesa, cardápio sempre atualizado e encomendas combinadas pelo WhatsApp.',
  },
  {
    icon: '🍺',
    title: 'Bares e food trucks',
    text: 'Publique em minutos, esgote itens em tempo real e mude preços quando quiser.',
  },
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
            plans.map((plan) => ({ name: plan.name, price: plan.price.replace(/\D/g, '') })),
          ),
          faqSchema(platformFaq),
        )}
      />

      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-ink-950 text-ink-50">
        <div className="glow-hero absolute inset-0" aria-hidden="true" />
        <div className="grid-pattern absolute inset-0" aria-hidden="true" />

        <div className="container-page relative grid items-center gap-16 pb-20 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:pb-28 lg:pt-24">
          <div>
            <p className="eyebrow rounded-full border border-ink-50/15 bg-ink-50/5 px-3.5 py-2 text-flame-300 backdrop-blur">
              <span aria-hidden="true">✦</span> 0% de comissão por pedido
            </p>

            <h1 className="mt-7 max-w-[16ch] text-[2.75rem] font-semibold leading-[1.02] sm:text-6xl lg:text-[4.25rem]">
              Cardápio digital que vende pelo <span className="text-gradient">WhatsApp</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-300">
              Cadastre seu restaurante, monte o cardápio e ganhe uma página pronta para receber pedidos de
              delivery e retirada. O cliente escolhe os pratos e a mensagem chega organizada no seu WhatsApp.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/criar-conta" className="btn btn-primary text-base">
                Criar meu cardápio
              </Link>
              <Link href="/r/sabor-e-brasa" className="btn btn-ghost-light text-base">
                Ver cardápio de exemplo
              </Link>
            </div>

            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-ink-50/10 pt-8">
              {[
                { label: 'Comissão por pedido', value: '0%' },
                { label: 'Para publicar', value: '10 min' },
                { label: 'Para começar', value: 'R$ 0' },
              ].map((stat) => (
                <div key={stat.label}>
                  <dd className="font-display text-3xl font-semibold tracking-tight">{stat.value}</dd>
                  <dt className="mt-1 text-xs text-ink-400">{stat.label}</dt>
                </div>
              ))}
            </dl>
          </div>

          {/* Prévia do produto: o cardápio e a mensagem que chega ao lojista. */}
          <div className="relative mx-auto w-full max-w-sm lg:max-w-md" aria-hidden="true">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-flame-500/20 blur-3xl" />

            <div className="relative rounded-[2rem] border border-ink-50/12 bg-ink-50/8 p-3 backdrop-blur-xl">
              <div className="rounded-[1.5rem] bg-ink-50 p-4 text-ink-950 shadow-lift">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-flame-500 text-lg text-white">
                    {showcase.logo}
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold">{showcase.name}</p>
                    <p className="flex items-center gap-1.5 text-[11px] text-ink-500">
                      <span className="size-1.5 rounded-full bg-whatsapp-500" /> Aberto · entrega{' '}
                      {showcase.eta}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {showcase.items.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 rounded-2xl border border-ink-200 bg-white p-2.5"
                    >
                      <span className="grid size-10 place-items-center rounded-xl bg-ink-100 text-xl">
                        {item.emoji}
                      </span>
                      <span className="flex-1 text-sm font-medium">{item.name}</span>
                      <span className="text-sm font-semibold text-flame-600">{item.price}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-2xl bg-whatsapp-500 px-4 py-3 text-center text-sm font-semibold text-white">
                  📲 Enviar pedido pelo WhatsApp
                </div>
              </div>
            </div>

            <div className="relative -mt-4 ml-6 mr-[-1rem] rotate-1 rounded-2xl border border-ink-50/12 bg-ink-900/90 p-4 backdrop-blur-xl">
              <p className="eyebrow text-[10px] text-ink-400">Chega assim no seu WhatsApp</p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink-300">
                {showcase.message}
              </pre>
            </div>
          </div>
        </div>

        {/* Faixa de reforço, emendando com a seção clara. */}
        <div className="relative border-t border-ink-50/10">
          <ul className="container-page flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-5 text-sm text-ink-400">
            {[
              'Sem comissão por venda',
              'Sem aplicativo para o cliente',
              'Link e QR code próprios',
              'Você fala direto com quem pede',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span aria-hidden="true" className="text-flame-400">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* -------------------------------------------------------- recursos */}
      <section id="recursos" className="container-page py-24" aria-labelledby="recursos-titulo">
        <div className="max-w-2xl">
          <p className="eyebrow text-flame-600">Recursos</p>
          <h2 id="recursos-titulo" className="mt-4 text-4xl font-semibold sm:text-5xl">
            Tudo o que o seu delivery precisa, sem intermediário
          </h2>
          <p className="mt-5 text-lg text-ink-500">
            O {platform.name} cuida do cardápio, das regras de entrega e do pedido. O relacionamento com o
            cliente continua sendo seu.
          </p>
        </div>

        {/* Bento: os dois primeiros recursos ocupam mais espaço. */}
        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            // Os dois primeiros e os dois últimos ocupam meia largura no desktop,
            // fechando o grid sem buracos.
            const wide = index < 2 || index >= features.length - 2;
            return (
            <li
              key={feature.title}
              className={`surface surface-hover p-7 ${wide ? 'lg:col-span-2 lg:p-9' : ''}`}
            >
              <span
                aria-hidden="true"
                className="grid size-11 place-items-center rounded-2xl bg-flame-50 text-2xl"
              >
                {feature.icon}
              </span>
              <h3 className={`mt-5 font-display font-semibold ${wide ? 'text-2xl' : 'text-lg'}`}>
                {feature.title}
              </h3>
              <p className={`mt-2.5 leading-relaxed text-ink-500 ${wide ? 'max-w-md' : 'text-sm'}`}>
                {feature.text}
              </p>
            </li>
            );
          })}
        </ul>
      </section>

      {/* --------------------------------------------------- como funciona */}
      <section
        id="como-funciona"
        className="border-y border-ink-200 bg-white py-24"
        aria-labelledby="como-funciona-titulo"
      >
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow text-flame-600">Como funciona</p>
            <h2 id="como-funciona-titulo" className="mt-4 text-4xl font-semibold sm:text-5xl">
              Do cadastro ao primeiro pedido em quatro passos
            </h2>
            <p className="mt-5 text-lg text-ink-500">
              Sem instalação, sem integração e sem contrato de fidelidade.
            </p>
          </div>

          <ol className="relative mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {/* Linha que conecta os passos no desktop. */}
            <span
              aria-hidden="true"
              className="absolute left-0 right-0 top-5 hidden h-px bg-linear-to-r from-flame-200 via-flame-300 to-transparent lg:block"
            />
            {steps.map((step) => (
              <li key={step.number} className="relative">
                <span className="grid size-11 place-items-center rounded-full bg-ink-950 font-display text-lg font-semibold text-ink-50">
                  {step.number}
                </span>
                <h3 className="mt-5 font-display text-xl font-semibold">{step.title}</h3>
                <p className="mt-2.5 leading-relaxed text-ink-500">{step.text}</p>
              </li>
            ))}
          </ol>

          <Link href="/criar-conta" className="btn btn-primary mt-14 text-base">
            Começar agora
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------------- para quem */}
      <section className="container-page py-24" aria-labelledby="para-quem">
        <div className="max-w-2xl">
          <p className="eyebrow text-flame-600">Para quem é</p>
          <h2 id="para-quem" className="mt-4 text-4xl font-semibold sm:text-5xl">
            Feito para quem vende comida
          </h2>
        </div>

        <ul className="mt-14 grid gap-4 sm:grid-cols-2">
          {audiences.map((audience) => (
            <li key={audience.title} className="surface surface-hover flex gap-5 p-7">
              <span aria-hidden="true" className="text-3xl">
                {audience.icon}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">{audience.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{audience.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------------------------- planos */}
      <section id="planos" className="border-y border-ink-200 bg-white py-24" aria-labelledby="planos-titulo">
        <div className="container-page">
          <div className="max-w-2xl">
            <p className="eyebrow text-flame-600">Planos</p>
            <h2 id="planos-titulo" className="mt-4 text-4xl font-semibold sm:text-5xl">
              Você paga pela ferramenta, nunca por pedido
            </h2>
            <p className="mt-5 text-lg text-ink-500">
              Comece sem custo e mude de plano quando o delivery crescer.
            </p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {plans.map((plan) =>
              plan.highlight ? (
                <div
                  key={plan.name}
                  className="rounded-card bg-linear-to-br from-flame-400 to-flame-700 p-px shadow-glow"
                >
                  <div className="h-full rounded-[calc(var(--radius-card)-1px)] bg-ink-950 p-9 text-ink-50">
                    <PlanContent plan={plan} dark />
                  </div>
                </div>
              ) : (
                <div key={plan.name} className="surface p-9">
                  <PlanContent plan={plan} />
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- faq */}
      <section id="perguntas" className="container-page py-24" aria-labelledby="perguntas-titulo">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow text-flame-600">Dúvidas</p>
            <h2 id="perguntas-titulo" className="mt-4 text-4xl font-semibold sm:text-5xl">
              Perguntas frequentes
            </h2>
            <p className="mt-5 text-ink-500">
              Não achou o que procurava? Escreva para{' '}
              <a className="font-semibold text-flame-600 hover:text-flame-700" href={`mailto:${platform.email}`}>
                {platform.email}
              </a>
              .
            </p>
          </div>

          <div className="divide-y divide-ink-200 border-y border-ink-200">
            {platformFaq.map((entry) => (
              <details key={entry.question} className="group py-5">
                <summary className="cursor-pointer list-none marker:content-none">
                  <h3 className="flex items-center justify-between gap-4 font-display text-lg font-semibold">
                    {entry.question}
                    <span
                      aria-hidden="true"
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-ink-100 text-flame-600 transition-transform duration-200 group-open:rotate-45"
                    >
                      +
                    </span>
                  </h3>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-500">{entry.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="container-page pb-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-ink-950 px-8 py-20 text-center text-ink-50">
          <div className="glow-hero absolute inset-0" aria-hidden="true" />
          <div className="relative">
            <h2 className="text-4xl font-semibold sm:text-5xl">Seu cardápio pode estar no ar hoje</h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-ink-300">
              Crie a conta, cadastre o restaurante e comece a receber pedidos no WhatsApp. Sem cartão de
              crédito, sem comissão e sem fidelidade.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link href="/criar-conta" className="btn btn-primary text-base">
                Criar conta
              </Link>
              <Link href="/r/sabor-e-brasa" className="btn btn-ghost-light text-base">
                Ver um cardápio pronto
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function PlanContent({ plan, dark = false }: { plan: (typeof plans)[number]; dark?: boolean }) {
  return (
    <>
      <div className="flex items-center gap-3">
        <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
        {plan.highlight && (
          <span className="rounded-full bg-flame-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
            Mais completo
          </span>
        )}
      </div>

      <p className="mt-6 font-display text-5xl font-semibold tracking-tight">
        {plan.price}
        <span className={`ml-2 font-sans text-sm font-medium ${dark ? 'text-ink-400' : 'text-ink-500'}`}>
          {plan.period}
        </span>
      </p>
      <p className={`mt-3 text-sm ${dark ? 'text-ink-300' : 'text-ink-500'}`}>{plan.description}</p>

      <ul className="mt-8 space-y-3 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <span aria-hidden="true" className={dark ? 'text-flame-300' : 'text-whatsapp-600'}>
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href="/criar-conta"
        className={`btn mt-9 w-full ${plan.highlight ? 'btn-primary' : 'btn-dark'}`}
      >
        {plan.cta}
      </Link>
    </>
  );
}
