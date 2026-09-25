'use client';

import { useTranslations } from 'next-intl';
import { useOpeningStatus } from '@/components/store/use-opening-status';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { describeNextOpening, formatClock } from '@/lib/hours';
import { useUiText } from '@/lib/use-ui-text';
import type { Business } from '@/lib/types';

/**
 * A linha sob o nome da loja — no lugar da avaliação dos apps de delivery, que
 * o Menu Online não tem: aberto ou fechado (e quando abre) e, com entrega
 * ligada, o mínimo para entrega.
 * Antes de hidratar, um traço cinza do mesmo tamanho: o status depende do
 * relógio e a página vem do cache.
 */
export function StoreStatus({ business, className }: { business: Business; className?: string }) {
  const status = useOpeningStatus(business);
  const uiText = useUiText();
  const t = useTranslations('store');
  // O mínimo só vale para a entrega (a sacola cobra só nela), e a copy diz isso
  // — igual ao aviso da sacola. Não depende do modo escolhido logo abaixo: a
  // linha sumindo com Retirada encolhia a identidade e fazia o Entrega |
  // Retirada pular sob o dedo (e pular depois de hidratar, com a página ISR).
  const minOrder = business.delivery.enabled ? business.delivery.minOrder : 0;

  return (
    <div className={className}>
      <p aria-live="polite" className="flex min-h-6 items-center gap-1.5 text-body1">
        {status === null ? (
          <Skeleton shape="bare" className="h-4 w-40 rounded-xs" />
        ) : (
          <>
            <span
              aria-hidden="true"
              className={cn(
                'size-2 shrink-0 rounded-full transition-colors duration-150',
                status.open ? 'bg-positive' : 'bg-gray-400',
              )}
            />
            <span className={cn('truncate font-semibold', status.open ? 'text-positive' : 'text-gray-700')}>
              {status.open
                ? uiText.t('hours.openUntil', { time: formatClock(status.closesAt ?? '', uiText.locale) })
                : describeNextOpening(status, uiText)}
            </span>
          </>
        )}
      </p>
      {/* Linha própria: ao lado do status ela quebrava com o separador sobrando. */}
      {minOrder > 0 && <p className="truncate text-body2 text-gray-600">{t('minOrder', { value: formatPrice(minOrder) })}</p>}
    </div>
  );
}
