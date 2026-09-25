import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { platform } from '@/lib/platform';

/**
 * O `not-found` não recebe `params`: o idioma vem do `setRequestLocale` do
 * layout, que já rodou para esta requisição.
 */
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: await getLocale(), namespace: 'platform.notFound' });
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: true },
  };
}

export default async function NotFound() {
  const t = await getTranslations('platform.notFound');
  return (
    <main id="conteudo" className="container-page flex flex-1 flex-col justify-center py-24 text-center">
      <p className="text-h1 font-bold text-flame-500">404</p>
      <h1 className="mt-4 text-h4 font-semibold">{t('title')}</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-500">{t('text')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="btn btn-primary"
        >
          {t('home')}
        </Link>
        <Link
          href="/criar-conta"
          className="btn btn-outline"
        >
          {t('createMenu', { name: platform.name })}
        </Link>
      </div>
    </main>
  );
}
