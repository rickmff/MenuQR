import { Store } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { platform } from '@/lib/platform';
import type { Business } from '@/lib/types';

/**
 * O cardápio existe, mas não está no ar. Não é 404 — o QR impresso continua
 * apontando para cá e volta a funcionar sozinho — e não vende o Menu Online:
 * quem chega aqui é cliente do restaurante. Sem o WhatsApp do restaurante de
 * propósito.
 *
 * - `billing`: publicado, mas a assinatura venceu além da carência (é o que
 *   faz o lojista regularizar);
 * - `unpublished`: o lojista despublicou, ou ainda não publicou.
 */
export function StoreUnavailable({
  business,
  reason = 'billing',
}: {
  business: Business;
  reason?: 'billing' | 'unpublished';
}) {
  const t = useTranslations('store');
  const copy = reason === 'unpublished' ? 'unpublished' : 'unavailable';
  return (
    <main id="conteudo" className="flex min-h-dvh w-full flex-col items-center justify-center bg-white px-4 py-12 text-center">
      <span aria-hidden="true" className="text-gray-400">
        <Store className="size-12" />
      </span>
      <h1 className="mt-4 text-subtitle font-semibold text-gray-700">{t(`${copy}.title`)}</h1>
      <p className="mt-1 max-w-sm text-body2 text-gray-600">
        {t(`${copy}.description`, { name: business.name })}
      </p>
      <p className="mt-10 text-caption text-gray-600">
        {t.rich('unavailable.poweredBy', {
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
