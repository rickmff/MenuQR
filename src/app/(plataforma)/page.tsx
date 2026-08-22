import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
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
          softwareApplicationSchema(plans.map((plan) => ({ name: plan.name, price: plan.price.replace(/\D/g, '') }))),
          faqSchema(platformFaq),
        )}
      />

      {/* ------------------------------------------------------------- hero */}
      <section className="border-b border-cream-200 bg-linear-to-b from-ember-50 to-cream-50">
        <div className="container-page grid items-center gap-14 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cream-200 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-700">
              <span aria-hidden="true">✨</span> Sem comissão por pedido · Sem aplicativo para o cliente
            </p>

            <h1 className="mt-5 max-w-[18ch] text-4xl font-semibold leading-[1.08] sm:text-5xl">
              O cardápio digital do seu restaurante, com pedidos no WhatsApp
            </h1>

            <p className="mt-5 max-w-xl text-lg text-charcoal-700">
              Cadastre seu negócio, monte o cardápio e ganhe uma página pronta para receber pedidos de
              delivery e retirada. O cliente escolhe os pratos e a mensagem chega organizada no seu
              WhatsApp — sem taxa por venda.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/criar-conta"
                className="rounded-xl bg-ember-500 px-7 py-4 font-semibold text-white shadow-soft transition-colors hover:bg-ember-600"
              >
                Criar meu cardápio grátis
              </Link>
              <Link
                href="/r/sabor-e-brasa"
                className="rounded-xl border border-cream-200 bg-white px-7 py-4 font-semibold transition-colors hover:border-ember-400"
              >
                Ver cardápio de exemplo
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-cream-200 pt-6 text-sm">
              <div>
                <dt className="text-charcoal-500">Comissão por pedido</dt>
                <dd className="mt-1 font-display text-2xl font-semibold">0%</dd>
              </div>
              <div>
                <dt className="text-charcoal-500">Para publicar</dt>
                <dd className="mt-1 font-display text-2xl font-semibold">10 min</dd>
              </div>
              <div>
                <dt className="text-charcoal-500">Custo para começar</dt>
                <dd className="mt-1 font-display text-2xl font-semibold">R$ 0</dd>
              </div>
            </dl>
          </div>

          {/* Ilustração: celular com o cardápio e a mensagem que chega no WhatsApp */}
          <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
            <div className="rounded-[2rem] border border-cream-200 bg-white p-3 shadow-lift">
              <div className="rounded-[1.5rem] bg-cream-50 p-4">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-ember-500 to-ember-700 text-base">
                    🔥
                  </span>
                  <div>
                    <p className="font-display text-sm font-semibold">Sabor &amp; Brasa</p>
                    <p className="text-[11px] text-charcoal-500">Aberto agora · entrega 30-45 min</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {[
                    { emoji: '🍔', name: 'Brasa Classic', price: 'R$ 29,90' },
                    { emoji: '🍖', name: 'Costela BBQ', price: 'R$ 38,90' },
                    { emoji: '🍟', name: 'Batata rústica', price: 'R$ 22,90' },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 rounded-xl border border-cream-200 bg-white p-2.5"
                    >
                      <span className="grid size-10 place-items-center rounded-lg bg-cream-100 text-xl">
                        {item.emoji}
                      </span>
                      <span className="flex-1 text-sm font-medium">{item.name}</span>
                      <span className="text-sm font-semibold text-ember-600">{item.price}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl bg-whatsapp-500 px-4 py-3 text-center text-sm font-semibold text-white">
                  📲 Enviar pedido pelo WhatsApp
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-charcoal-500">
                Chega assim no seu WhatsApp
              </p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-charcoal-700">
{`*NOVO PEDIDO — Sabor & Brasa*

*🧾 Itens*
1x Brasa Classic — R$ 34,90
   • Ponto: ao ponto
   • Adicionais: bacon

*💰 Total: R$ 39,90*
*🛵 Entrega*
Rua das Acácias, 250 — Centro
*💳 Pix*`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- recursos */}
      <section id="recursos" className="container-page py-20" aria-labelledby="recursos-titulo">
        <div className="max-w-2xl">
          <h2 id="recursos-titulo" className="text-3xl font-semibold sm:text-4xl">
            Tudo o que o seu delivery precisa, sem intermediário
          </h2>
          <p className="mt-4 text-lg text-charcoal-700">
            O {platform.name} cuida do cardápio, das regras de entrega e do pedido. O relacionamento com o
            cliente continua sendo seu.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <li key={feature.title} className="rounded-card border border-cream-200 bg-white p-6">
              <span aria-hidden="true" className="text-3xl">
                {feature.icon}
              </span>
              <h3 className="mt-3 font-display text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------- como funciona */}
      <section
        id="como-funciona"
        className="border-y border-cream-200 bg-white py-20"
        aria-labelledby="como-funciona-titulo"
      >
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 id="como-funciona-titulo" className="text-3xl font-semibold sm:text-4xl">
              Do cadastro ao primeiro pedido em quatro passos
            </h2>
            <p className="mt-4 text-lg text-charcoal-700">
              Sem instalação, sem integração e sem contrato de fidelidade.
            </p>
          </div>

          <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <li key={step.number} className="rounded-card border border-cream-200 p-6">
                <span className="grid size-10 place-items-center rounded-full bg-ember-500 font-display text-lg font-bold text-white">
                  {step.number}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10">
            <Link
              href="/criar-conta"
              className="inline-block rounded-xl bg-ember-500 px-7 py-4 font-semibold text-white transition-colors hover:bg-ember-600"
            >
              Começar agora — é grátis
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- para quem */}
      <section className="container-page py-20" aria-labelledby="para-quem">
        <div className="max-w-2xl">
          <h2 id="para-quem" className="text-3xl font-semibold sm:text-4xl">
            Feito para quem vende comida
          </h2>
          <p className="mt-4 text-lg text-charcoal-700">
            Do food truck ao restaurante com salão cheio: o cardápio se adapta ao seu jeito de vender.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2">
          {audiences.map((audience) => (
            <li key={audience.title} className="flex gap-4 rounded-card border border-cream-200 bg-white p-6">
              <span aria-hidden="true" className="text-3xl">
                {audience.icon}
              </span>
              <div>
                <h3 className="font-display text-lg font-semibold">{audience.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-charcoal-500">{audience.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------------------------- planos */}
      <section id="planos" className="border-y border-cream-200 bg-white py-20" aria-labelledby="planos-titulo">
        <div className="container-page">
          <div className="max-w-2xl">
            <h2 id="planos-titulo" className="text-3xl font-semibold sm:text-4xl">
              Planos simples, sem comissão
            </h2>
            <p className="mt-4 text-lg text-charcoal-700">
              Comece de graça e mude de plano quando o delivery crescer. Você paga pela ferramenta, nunca
              por pedido.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={
                  plan.highlight
                    ? 'rounded-card border-2 border-ember-500 bg-cream-50 p-8 shadow-soft'
                    : 'rounded-card border border-cream-200 p-8'
                }
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                  {plan.highlight && (
                    <span className="rounded-md bg-ember-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                      Mais completo
                    </span>
                  )}
                </div>
                <p className="mt-4 font-display text-4xl font-bold">
                  {plan.price}
                  <span className="ml-2 font-sans text-sm font-medium text-charcoal-500">{plan.period}</span>
                </p>
                <p className="mt-3 text-sm text-charcoal-500">{plan.description}</p>

                <ul className="mt-6 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span aria-hidden="true" className="text-whatsapp-600">
                        ✓
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/criar-conta"
                  className={
                    plan.highlight
                      ? 'mt-8 block rounded-xl bg-ember-500 px-6 py-3.5 text-center font-semibold text-white hover:bg-ember-600'
                      : 'mt-8 block rounded-xl border border-cream-200 bg-white px-6 py-3.5 text-center font-semibold hover:border-ember-400'
                  }
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- faq */}
      <section id="perguntas" className="container-page py-20" aria-labelledby="perguntas-titulo">
        <h2 id="perguntas-titulo" className="text-3xl font-semibold sm:text-4xl">
          Perguntas frequentes
        </h2>

        <div className="mt-10 max-w-3xl divide-y divide-cream-200 border-y border-cream-200">
          {platformFaq.map((entry) => (
            <details key={entry.question} className="group py-5">
              <summary className="cursor-pointer list-none marker:content-none">
                <h3 className="flex items-center justify-between gap-4 font-display text-lg font-semibold">
                  {entry.question}
                  <span aria-hidden="true" className="text-ember-500 transition-transform group-open:rotate-45">
                    +
                  </span>
                </h3>
              </summary>
              <p className="mt-3 leading-relaxed text-charcoal-500">{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------- cta */}
      <section className="container-page pb-20">
        <div className="rounded-card bg-charcoal-900 px-8 py-16 text-center text-cream-50">
          <h2 className="text-3xl font-semibold sm:text-4xl">Seu cardápio pode estar no ar hoje</h2>
          <p className="mx-auto mt-4 max-w-xl text-cream-100/80">
            Crie a conta, cadastre o restaurante e comece a receber pedidos no WhatsApp. Sem cartão de
            crédito, sem comissão e sem fidelidade.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/criar-conta"
              className="rounded-xl bg-ember-500 px-8 py-4 font-semibold text-white transition-colors hover:bg-ember-600"
            >
              Criar conta grátis
            </Link>
            <Link
              href="/r/sabor-e-brasa"
              className="rounded-xl border border-cream-100/25 px-8 py-4 font-semibold text-cream-50 transition-colors hover:bg-cream-50/10"
            >
              Ver um cardápio pronto
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
