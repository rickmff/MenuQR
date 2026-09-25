'use client';

import { Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { setLocale } from '@/i18n/set-locale';
import { LOCALE_LABELS, routing } from '@/i18n/routing';
import { cn } from '@/lib/cn';

/**
 * Seletor de idioma: os nomes na própria língua, lado a lado, o atual em
 * negrito. Grava o cookie e recarrega os dados da rota — o endereço não muda.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('common');
  const current = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t('language')}
      className={cn('inline-flex items-center gap-2 text-body2 text-gray-600', pending && 'opacity-60', className)}
    >
      <Globe aria-hidden="true" className="size-4 text-gray-400" />
      {routing.locales.map((locale, index) => (
        <span key={locale} className="inline-flex items-center gap-2">
          {index > 0 && <span aria-hidden="true" className="text-gray-300">·</span>}
          <button
            type="button"
            lang={locale}
            aria-pressed={locale === current}
            disabled={pending}
            onClick={() => {
              if (locale === current) return;
              startTransition(async () => {
                await setLocale(locale);
                router.refresh();
              });
            }}
            className={cn(
              'press rounded-xs transition-colors duration-150 ease-standard hover:text-gray-700',
              locale === current && 'font-semibold text-gray-700',
            )}
          >
            {LOCALE_LABELS[locale]}
          </button>
        </span>
      ))}
    </div>
  );
}
