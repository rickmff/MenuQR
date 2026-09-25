import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import QRCode from "qrcode";
import { MagneticCta } from "@/components/platform/landing/final-cta";
import { HeroDemo } from "@/components/platform/landing/hero-demo";
import { HowItWorks } from "@/components/platform/landing/how-it-works";
import {
  capabilityIcons,
  TableTentIllustration,
} from "@/components/platform/landing/illustrations";
import { Reveal, RevealItem } from "@/components/platform/landing/reveal";
import { WordReveal } from "@/components/platform/landing/word-reveal";
import { JsonLd } from "@/components/json-ld";
import { Button } from "@/components/ui/button";
import { NavIcon } from "@/components/ui/button-icons";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { WhatsAppGlyph } from "@/components/ui/whatsapp-glyph";
import { BILLING_PLAN } from "@/lib/billing";
import { sampleBusiness } from "@/lib/demo/sample-data";
import { capabilities, platform, pricing } from "@/lib/platform";
import {
  buildMetadata,
  graph,
  platformOrganizationSchema,
  platformWebsiteSchema,
  softwareApplicationSchema,
} from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "platform" });
  return buildMetadata({
    title: t("meta.homeTitle", { name: platform.name }),
    // O título já começa pela marca: com o template do layout ele saía
    // "Menu Online — … | Menu Online".
    absoluteTitle: true,
    description: t("shortDescription"),
    path: "/",
    keywords: t.raw("meta.homeKeywords") as string[],
    locale,
  });
}

const STORE_PATH = `/r/${sampleBusiness.slug}`;

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("platform");
  const cta = t("landing.cta");
  const storeUrl = absoluteUrl(STORE_PATH);
  // QR code real do cardápio de exemplo, gerado no servidor: é o que o lojista imprime.
  const qrSvg = await QRCode.toString(storeUrl, {
    type: "svg",
    margin: 0,
    width: 152,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });

  return (
    /*
     * `data-paper="creme"` liga o papel quente (globals.css): a home é a única
     * tela do sistema em que a superfície é creme, e o seletor sobe até o
     * <html>, então o cabeçalho e o rodapé desta página vêm junto.
     */
    <div data-paper="creme">
      <JsonLd
        id="ld-landing"
        data={graph(
          platformOrganizationSchema(locale),
          platformWebsiteSchema(locale),
          softwareApplicationSchema({
            offers: [
              {
                name: t("landing.offerName"),
                price: (BILLING_PLAN.amountCents / 100).toFixed(2),
                billingDuration: "P1Y",
              },
            ],
            featureList: capabilities.map((key) =>
              t(`capabilityList.${key}.title`),
            ),
            locale,
          }),
        )}
      />

      {/* ------------------------------------------------------------- hero */}
      <section aria-labelledby="hero-titulo">
        {/* `grid-cols-1` (`minmax(0,1fr)`) e não a coluna implícita: ela é
         * `auto`, cresce até o telefone da demo (376px + margem = 392px) e
         * estourava a página em todo celular até 390px. */}
        <Container className="grid grid-cols-1 items-center gap-12 pb-16 pt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-8 lg:pb-28 lg:pt-20">
          <div className="max-w-lg">
            {/* O título é grafite inteiro e só o glifo leva cor: a palavra
             * "WhatsApp" em verde era o terceiro verde da dobra e roubava o
             * destaque do botão, que é o que se clica (D19). */}
            <h1
              id="hero-titulo"
              className="font-display text-h1 font-semibold text-gray-900"
            >
              <WordReveal
                text={t("landing.hero.title")}
                accent={t("landing.hero.accent")}
                accentIcon={
                  <WhatsAppGlyph className="ml-[0.18em] inline-block size-[0.8em] align-[-0.06em] text-brand" />
                }
              />
            </h1>
            <p className="mt-5 max-w-lg text-body1 text-gray-600 lg:text-subtitle">
              {t("landing.hero.text")}
            </p>
            {/* Lado a lado a partir do tablet. No desktop a coluna do texto fica
             * com o que o telefone não usa (a grade é `1fr auto`) e a bolha só
             * sai para fora dele no `xl`: em 1024 sobram ~580px, e os dois
             * botões pedem ~510px em pt-BR. */}
            <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap">
              <Button
                href="/criar-conta"
                variant="brand"
                size="lg"
                pill
                after={<NavIcon />}
                className="w-full sm:w-auto"
              >
                {cta}
              </Button>
              <Button
                href={STORE_PATH}
                variant="tertiary"
                size="lg"
                pill
                after={<NavIcon />}
                className="w-full sm:w-auto"
              >
                {t("landing.sampleMenu")}
              </Button>
            </div>
          </div>

          {/* pr-40 no `xl` reserva o espaço que a bolha ocupa fora do telefone. */}
          <div aria-hidden="true" className="lg:justify-self-end xl:pr-40">
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
            {/* `gray-700` e não `gray-600`: sobre o bege do papel de parede
             * (#efeae2) o cinza secundário dá 3,88:1 e reprova na WCAG AA. */}
            <RevealItem
              as="p"
              className="font-display text-caption font-semibold text-gray-700"
            >
              {t("landing.howItWorks.eyebrow")}
            </RevealItem>
            <RevealItem
              as="h2"
              className="mt-3 max-w-2xl font-display text-h3 font-bold text-gray-900 lg:text-h2"
            >
              <span id="como-funciona-titulo">
                {t("landing.howItWorks.title")}
              </span>
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
      {/* Branca, e não o creme do `body` (decisão do dono, 2026-09-23): a
       * página passa a alternar papel de parede, branco e papel de parede, e
       * esta seção — que é uma lista, não uma demonstração — ganha o fundo
       * neutro em que os ícones de linha se sustentam sozinhos. */}
      <section
        id="capacidades"
        className="scroll-mt-16 bg-white py-16 lg:py-24"
        aria-labelledby="capacidades-titulo"
      >
        <Container>
          <Reveal className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <RevealItem
                as="p"
                className="font-display text-caption font-semibold text-gray-600"
              >
                {t("landing.capabilities.eyebrow")}
              </RevealItem>
              <RevealItem
                as="h2"
                className="mt-3 max-w-2xl font-display text-h3 font-bold text-gray-900 lg:text-h2"
              >
                <span id="capacidades-titulo">
                  {t("landing.capabilities.title")}
                </span>
              </RevealItem>
            </div>
            <RevealItem className="hidden lg:block">
              <TableTentIllustration className="h-28 text-gray-700" />
            </RevealItem>
          </Reveal>

          <Reveal
            as="ul"
            className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3"
          >
            {capabilities.map((key, index) => {
              const Icon = capabilityIcons[key];
              return (
                <RevealItem
                  as="li"
                  key={key}
                  className="border-t-2 border-gray-200 pt-5"
                >
                  <Icon className="size-8 text-primary" />
                  <p className="mt-4 font-display text-caption font-semibold text-gray-400">
                    {String(index + 1).padStart(2, "0")} /{" "}
                    {t(`capabilityList.${key}.label`)}
                  </p>
                  <h3 className="mt-2 font-display text-subtitle font-bold text-gray-900">
                    {t(`capabilityList.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-body2 text-gray-600">
                    {t(`capabilityList.${key}.text`)}
                  </p>
                </RevealItem>
              );
            })}
          </Reveal>
        </Container>
      </section>

      {/* ----------------------------------------------------------- preço */}
      {/* O fundo era `gray-50`, um cinza frio que não pertencia a lugar nenhum.
       * Passa a ser o papel de parede da conversa, e o cartão branco flutua
       * nele como uma mensagem. Sobre o bege o corpo é `gray-700`. */}
      <section
        id="preco"
        className="wallpaper scroll-mt-16 border-y border-gray-200 py-16 lg:py-24"
        aria-labelledby="preco-titulo"
      >
        {/* Uma coluna só, centrada: é a última pergunta antes do cadastro, e
            aqui o preço é a única coisa que precisa ser lida. */}
        <Container className="flex flex-col items-center text-center">
          <Reveal>
            <RevealItem
              as="p"
              className="font-display text-caption font-semibold text-gray-700"
            >
              {t("landing.pricing.eyebrow")}
            </RevealItem>
            <RevealItem
              as="h2"
              className="mt-3 font-display text-h3 font-bold text-gray-900 lg:text-h2"
            >
              <span id="preco-titulo">{t("landing.pricing.title")}</span>
            </RevealItem>
            <RevealItem
              as="p"
              className="mx-auto mt-3 max-w-md text-body1 text-gray-700"
            >
              {t("landing.pricing.text")}
            </RevealItem>
          </Reveal>

          <Reveal className="mt-10 w-full lg:mt-12">
            <RevealItem>
              {/* Um verde só no cartão: o botão. A faixa, a borda e os cinco
               * tiques eram todos `primary` e disputavam com ele. */}
              <Card
                padding="none"
                highlight
                className="mx-auto max-w-md overflow-hidden"
              >
                {/* `body2` e não `caption`: sem a caixa alta e o espacejamento,
                 * a faixa de 12px virava uma linha miúda no meio do grafite. */}
                <p className="bg-gray-900 py-2.5 text-center font-display text-body2 font-semibold text-white">
                  {t("pricing.badge")}
                </p>

                <div className="p-6 lg:p-8">
                  <p className="flex items-baseline justify-center gap-1 text-gray-900">
                    <span className="font-display text-h1 font-semibold lg:text-display">
                      {pricing.price}
                    </span>
                    <span className="text-subtitle font-semibold text-gray-600">
                      {t("pricing.period")}
                    </span>
                  </p>
                  <p className="mt-2 text-center text-body2 text-gray-600">
                    {t("pricing.billing", { yearly: pricing.yearly })}
                  </p>

                  {/* A lista volta para a esquerda: linha de check centrada não se lê. */}
                  <ul className="mt-6 space-y-3 border-t border-gray-200 pt-6 text-left">
                    {pricing.includes.map((key) => (
                      <li
                        key={key}
                        className="flex items-start gap-3 text-body2 text-gray-700"
                      >
                        <Check
                          aria-hidden="true"
                          className="mt-0.5 size-5 shrink-0 text-gray-400"
                        />
                        {t(`pricing.includes.${key}`)}
                      </li>
                    ))}
                  </ul>

                  <Button
                    href="/criar-conta"
                    variant="brand"
                    size="lg"
                    pill
                    fullWidth
                    after={<NavIcon />}
                    className="mt-8"
                  >
                    {cta}
                  </Button>
                  <p className="mt-3 text-center text-caption text-gray-600">
                    {t("pricing.note")}
                  </p>
                </div>
              </Card>
            </RevealItem>
          </Reveal>
        </Container>
      </section>

      {/* ------------------------------------------------------------- cta */}
      {/* Branca como a de capacidades (decisão do dono, 2026-09-23): o bloco
       * grafite por dentro é que carrega a cor, e o branco em volta o destaca
       * mais do que o creme destacava. */}
      <section className="bg-white py-16 lg:py-24" aria-labelledby="cta-titulo">
        <Container className="flex flex-col items-center">
          {/* Grafite, e não verde em tela cheia. Preenchendo a página inteira o
           * verde escuro lê como cor institucional; sobre o grafite, o verde
           * vivo do botão volta a ser o verde que a pessoa reconhece do
           * celular (`#25d366` sobre `#111b21`: 8,8:1). O sistema de marca que
           * a Koto fez para o WhatsApp descreve justamente uma paleta que vai
           * do verde icônico às variações de modo escuro. */}
          <div className="wallpaper-light relative w-full overflow-hidden rounded-xl bg-gray-900 px-6 py-14 lg:px-16 lg:py-20">
            <QrFrame />
            {/* No celular é uma coluna só e o cartão do QR vem depois do botão;
             * em `lg` ele vai para o lado, como o display em cima da mesa. */}
            <Reveal className="relative grid justify-items-center gap-10 text-center lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16 lg:justify-items-start lg:text-left">
              <div className="flex flex-col items-center lg:items-start">
                <RevealItem
                  as="h2"
                  className="max-w-2xl font-display text-h2 font-semibold text-white lg:text-h1"
                >
                  <span id="cta-titulo">{t("landing.finalCta.title")}</span>
                </RevealItem>
                <RevealItem className="mt-8">
                  <MagneticCta href="/criar-conta" variant="brand">
                    {cta}
                  </MagneticCta>
                </RevealItem>
              </div>
              <RevealItem>
                <DemoQrCard
                  qrSvg={qrSvg}
                  label={t("landing.qrCardLabel", {
                    name: sampleBusiness.name,
                  })}
                  action={t("landing.sampleMenu")}
                />
              </RevealItem>
            </Reveal>
          </div>

          <p className="mt-6 text-center font-display text-caption font-semibold text-gray-600">
            {t("landing.finalCta.strip")}
          </p>
        </Container>
      </section>
    </div>
  );
}

/**
 * O cardápio de exemplo impresso: o QR code real de `/r/sabor-e-brasa`, o mesmo
 * que o lojista cola na mesa. Quem está lendo a página no celular não consegue
 * apontar a câmera para a própria tela — então o cartão inteiro é o link, e ler
 * o código ou tocar nele levam ao mesmo cardápio.
 */
function DemoQrCard({
  qrSvg,
  label,
  action,
}: {
  qrSvg: string;
  label: string;
  action: string;
}) {
  return (
    <Link
      href={STORE_PATH}
      className="group block w-60 rounded-lg bg-white p-5 text-center shadow-high transition-transform duration-150 ease-standard hover:-translate-y-1"
    >
      <p className="font-display text-body2 font-semibold text-gray-900">
        {sampleBusiness.name}
      </p>
      {/* O QR é gerado com `margin: 0`: a zona de silêncio que o leitor precisa
       * é o próprio branco do cartão (20px de `p-5`, uns 4 módulos). */}
      <span
        role="img"
        aria-label={label}
        className="mx-auto mt-3 block w-36 [&_svg]:size-full"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <span className="mt-4 flex items-center justify-center gap-1 text-body2 font-semibold text-gray-700">
        {action}
        <NavIcon className="size-4 transition-transform duration-150 ease-standard group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

/**
 * O bloco do CTA é o próprio QR code: o rabisco do papel de parede por baixo e
 * os três olhos de leitura nos cantos, como no logo. Decoração declarada — daí o
 * `aria-hidden` e o branco a 12%, que não disputa com o texto por cima.
 */
function QrFrame() {
  const corners = [
    "left-5 top-5 lg:left-8 lg:top-8",
    "right-5 top-5 lg:right-8 lg:top-8",
    "bottom-5 left-5 lg:bottom-8 lg:left-8",
  ];
  return (
    <>
      {corners.map((position) => (
        <svg
          key={position}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={`pointer-events-none absolute size-10 text-white opacity-[0.14] lg:size-14 ${position}`}
        >
          <rect
            x="1.5"
            y="1.5"
            width="21"
            height="21"
            rx="6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          />
          <rect x="8" y="8" width="8" height="8" rx="2" fill="currentColor" />
        </svg>
      ))}
    </>
  );
}
