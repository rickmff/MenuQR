import { FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Banner } from '@/components/ui/banner';

/** Aviso permanente: no modo demonstração nada sai do navegador. */
export function DemoBanner({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('demo.banner');
  // Na loja: um aviso como os outros da tela do cliente (cartão arredondado,
  // tom informativo), logo abaixo da identidade.
  if (compact) {
    return (
      <Banner tone="info" radius="md" icon={<FlaskConical className="size-5" />} title={t('title')}>
        {t('text')}{' '}
        <Link href="/#planos" className="font-semibold underline underline-offset-2">
          {t('learnMore')}
        </Link>
      </Banner>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-flame-200 bg-flame-50 px-4 py-3 text-body2 text-flame-700">
      <span className="font-semibold">
        <span aria-hidden="true">🧪</span> {t('title')}
      </span>
      <span className="hidden text-ink-700 sm:inline">{t('text')}</span>
      <Link href="/#planos" className="ml-auto shrink-0 font-semibold underline underline-offset-2">
        {t('learnMore')}
      </Link>
    </div>
  );
}
