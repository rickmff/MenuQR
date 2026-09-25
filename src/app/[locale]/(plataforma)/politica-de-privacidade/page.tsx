import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { JsonLd } from '@/components/json-ld';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { platform } from '@/lib/platform';
import { breadcrumbSchema, buildMetadata, graph } from '@/lib/seo';

/** Atualize esta data sempre que o texto da política mudar (`legal.privacy`, nos dois idiomas). */
const lastUpdate = '2026-09-22';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal.privacy' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDescription', { name: platform.name }),
    path: '/politica-de-privacidade',
    locale,
  });
}

const proseClass =
  '[&_h2]:mt-10 [&_h2]:text-h5 [&_h2]:font-semibold [&_li]:mt-2 [&_p]:mt-4 [&_p]:leading-relaxed ' +
  '[&_p]:text-ink-700 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-ink-700';

const ROLES = ['account', 'orders'] as const;
const COLLECTED = ['account', 'billing', 'business', 'session', 'browser'] as const;
const PURPOSES = ['account', 'billing', 'notices', 'legal'] as const;
const PROCESSORS = ['clerk', 'hosting', 'asaas'] as const;

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('legal');

  const trail = [
    { name: t('home'), path: '/' },
    { name: t('privacy.title'), path: '/politica-de-privacidade' },
  ];
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(lastUpdate));
  const notice = t('translationNotice');
  const values = {
    name: platform.name,
    email: platform.email,
    strong: (chunks: ReactNode) => <strong>{chunks}</strong>,
    code: (chunks: ReactNode) => <code>{chunks}</code>,
    link: (chunks: ReactNode) => (
      <Link className="text-flame-600" href="/painel/conta">
        {chunks}
      </Link>
    ),
    mail: (chunks: ReactNode) => (
      <a className="text-flame-600" href={`mailto:${platform.email}`}>
        {chunks}
      </a>
    ),
  };
  const rich = (key: string) => t.rich(`privacy.${key}`, values);
  const list = (group: string, keys: readonly string[]) => (
    <ul>
      {keys.map((key) => (
        <li key={key}>{rich(`${group}.items.${key}`)}</li>
      ))}
    </ul>
  );

  return (
    <>
      <JsonLd id="ld-privacidade" data={graph(breadcrumbSchema(trail))} />

      <div className="container-page py-10">
        <Breadcrumbs trail={trail} />

        <article className={`mt-6 max-w-3xl ${proseClass}`}>
          <h1 className="text-h3 font-semibold sm:text-h2">{t('privacy.title')}</h1>
          <p className="text-body2 text-ink-500">{t('lastUpdate', { date })}</p>
          {notice && <p className="text-body2 italic text-ink-500">{notice}</p>}

          <p>{rich('intro')}</p>

          <h2>{t('privacy.roles.title')}</h2>
          {list('roles', ROLES)}

          <h2>{t('privacy.collected.title')}</h2>
          {list('collected', COLLECTED)}

          <h2>{t('privacy.purposes.title')}</h2>
          {list('purposes', PURPOSES)}
          <p>{rich('purposes.noSale')}</p>

          <h2>{t('privacy.processors.title')}</h2>
          <p>{rich('processors.intro')}</p>
          {list('processors', PROCESSORS)}
          <p>{rich('processors.transfer')}</p>

          <h2>{t('privacy.whatsapp.title')}</h2>
          <p>{rich('whatsapp.body')}</p>

          <h2>{t('privacy.retention.title')}</h2>
          <p>{rich('retention.body')}</p>
          <p>{rich('retention.request')}</p>

          <h2>{t('privacy.rights.title')}</h2>
          <p>{rich('rights.body')}</p>

          <h2>{t('privacy.security.title')}</h2>
          <p>{rich('security.body')}</p>

          <h2>{t('privacy.changes.title')}</h2>
          <p>{rich('changes.body')}</p>
        </article>
      </div>
    </>
  );
}
