import { Store } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { platform } from '@/lib/platform';
import type { Business } from '@/lib/types';

/**
 * O cardápio existe e está publicado, mas a assinatura do restaurante venceu
 * além da carência. Não é 404 — o QR impresso continua apontando para cá e
 * volta a funcionar assim que o lojista paga. Sem o WhatsApp do restaurante
 * de propósito: é o que faz o lojista regularizar.
 */
export function StoreUnavailable({ business }: { business: Business }) {
  const t = useTranslations('store.unavailable');
  return (
    <main id="conteudo" className="flex min-h-dvh w-full flex-col items-center justify-center bg-white px-4 py-12 text-center">
      <span aria-hidden="true" className="text-gray-400">
        <Store className="size-12" />
      </span>
      <h1 className="mt-4 text-subtitle font-semibold text-gray-700">{t('title')}</h1>
      <p className="mt-1 max-w-sm text-body2 text-gray-600">
        {t('description', { name: business.name })}
      </p>
      <p className="mt-10 text-caption text-gray-600">
        {t.rich('poweredBy', {
          brand: () => (
            <Link href="/" className="font-semibold underline">
              {platform.name}
            </Link>
          ),
        })}
      </p>
    </main>
  );
}
