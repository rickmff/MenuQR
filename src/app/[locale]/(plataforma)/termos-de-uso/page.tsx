import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { BILLING_PLAN, formatPlanPrice } from '@/lib/billing';
import { platform } from '@/lib/platform';
import { breadcrumbSchema, buildMetadata, graph } from '@/lib/seo';

/** Atualize esta data sempre que o texto dos termos mudar (`legal.terms`, nos dois idiomas). */
const lastUpdate = '2026-09-22';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.terms' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDescription', { name: platform.name }),
    path: '/termos-de-uso',
    locale,
  });
}

const proseClass =
  '[&_h2]:mt-10 [&_h2]:text-h5 [&_h2]:font-semibold [&_li]:mt-2 [&_p]:mt-4 [&_p]:leading-relaxed ' +
  '[&_p]:text-ink-700 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-ink-700';

const RESTAURANT_ITEMS = ['accuracy', 'law', 'alcohol', 'rights', 'password'] as const;
const BILLING_ITEMS = ['access', 'cancel', 'withdrawal', 'priceChanges'] as const;

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');

  const trail = [
    { name: t('home'), path: '/' },
    { name: t('terms.title'), path: '/termos-de-uso' },
  ];
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(lastUpdate));
  const notice = t('translationNotice');
  const values = {
    name: platform.name,
    email: platform.email,
    price: formatPlanPrice(BILLING_PLAN.amountCents),
    graceDays: BILLING_PLAN.graceDays,
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
    mail: (chunks: ReactNode) => (
      <a className="text-flame-600" href={`mailto:${platform.email}`}>
        {chunks}
      </a>
    ),
  };
  const rich = (key: string) => t.rich(`terms.${key}`, values);

  return (
    <>
      <JsonLd id="ld-termos" data={graph(breadcrumbSchema(trail))} />

      <div className="container-page py-10">
        <Breadcrumbs trail={trail} />

        <article className={`mt-6 max-w-3xl ${proseClass}`}>
          <h1 className="text-h3 font-semibold sm:text-h2">{t('terms.title')}</h1>
          <p className="text-body2 text-ink-500">{t('lastUpdate', { date })}</p>
          {notice && <p className="text-body2 italic text-ink-500">{notice}</p>}

          <p>{rich('intro')}</p>

          <h2>{t('terms.platform.title')}</h2>
          <p>{rich('platform.body')}</p>

          <h2>{t('terms.restaurant.title')}</h2>
          <ul>
            {RESTAURANT_ITEMS.map((key) => (
              <li key={key}>{rich(`restaurant.items.${key}`)}</li>
            ))}
          </ul>

          <h2>{t('terms.consumer.title')}</h2>
          <p>{rich('consumer.body')}</p>

          <h2>{t('terms.billing.title')}</h2>
          <p>{rich('billing.body')}</p>
          <ul>
            {BILLING_ITEMS.map((key) => (
              <li key={key}>{rich(`billing.items.${key}`)}</li>
            ))}
          </ul>

          <h2>{t('terms.availability.title')}</h2>
          <p>{rich('availability.body')}</p>

          <h2>{t('terms.acceptableUse.title')}</h2>
          <p>{rich('acceptableUse.body')}</p>

          <h2>{t('terms.termination.title')}</h2>
          <p>{rich('termination.body')}</p>

          <h2>{t('terms.jurisdiction.title')}</h2>
          <p>{rich('jurisdiction.body')}</p>
        </article>
      </div>
    </>
  );
}
