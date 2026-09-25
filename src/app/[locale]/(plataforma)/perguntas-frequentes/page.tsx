import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Container } from '@/components/ui/container';
import { platform, platformFaq } from '@/lib/platform';
import { breadcrumbSchema, buildMetadata, faqSchema, graph } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.faq' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDescription', { name: platform.name }),
    path: '/perguntas-frequentes',
    keywords: t.raw('keywords') as string[],
    locale,
  });
}

/**
 * As respostas moram em `legal.faq.items` (messages/) e saem daqui também
 * como `FAQPage` — o dado estruturado só vale com o texto visível na mesma
 * página. A landing não tem FAQ de propósito (D15): esta página é o lugar
 * dele, uma tela com um objetivo só (D16).
 */
export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');

  const trail = [
    { name: t('home'), path: '/' },
    { name: t('faq.title'), path: '/perguntas-frequentes' },
  ];
  const questions = platformFaq.map((key) => ({
    key,
    question: t(`faq.items.${key}.question`),
    answer: t(`faq.items.${key}.answer`),
  }));

  return (
    <>
      <JsonLd id="ld-faq" data={graph(faqSchema(questions), breadcrumbSchema(trail))} />

      <Container className="py-10">
        <Breadcrumbs trail={trail} />

        <article className="mt-6 max-w-3xl">
          <h1 className="font-display text-h3 font-semibold text-gray-900 sm:text-h2">{t('faq.title')}</h1>
          <p className="mt-4 text-body1 leading-relaxed text-gray-700">
            {t.rich('faq.intro', {
              email: platform.email,
              mail: (chunks) => (
                <a href={`mailto:${platform.email}`} className="font-semibold text-green-700 hover:text-primary">
                  {chunks}
                </a>
              ),
            })}
          </p>

          <div className="mt-10 border-t border-gray-200">
            {questions.map((entry) => (
              <section key={entry.key} className="border-b border-gray-200 py-6">
                <h2 className="font-display text-h6 font-semibold text-gray-900">{entry.question}</h2>
                <p className="mt-2 text-body1 leading-relaxed text-gray-700">{entry.answer}</p>
              </section>
            ))}
          </div>

          <div className="mt-10">
            <Button href="/criar-conta" variant="brand" size="lg" pill after={<NavIcon />}>
              {t('faq.cta')}
            </Button>
          </div>
        </article>
      </Container>
    </>
  );
}
