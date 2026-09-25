'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { reportError as report, type BoundaryError } from '@/lib/report-error';

/** Barreira de erro: mantém o site utilizável se algo falhar no cliente. */
export default function Error({ error, reset }: { error: BoundaryError; reset: () => void }) {
  const t = useTranslations('platform.error');
  useEffect(() => {
    console.error(error);
    report(error);
  }, [error]);

  return (
    <div className="container-page py-24 text-center">
      <p className="text-h2" aria-hidden="true">
        ⚠️
      </p>
      <h1 className="mt-4 text-h4 font-semibold">{t('title')}</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-500">{t('text')}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary"
        >
          {t('retry')}
        </button>
        <Link
          href="/"
          className="btn btn-outline"
        >
          {t('home')}
        </Link>
      </div>
    </div>
  );
}
