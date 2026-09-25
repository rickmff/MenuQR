'use client';

import { useTranslations } from 'next-intl';
import { useOpeningStatus } from '@/components/store/use-opening-status';
import type { Business } from '@/lib/types';

/** Sob o preço, só com a loja fechada (e depois de hidratar): o pedido vai, mas fica para depois. */
export function ItemClosedNote({ business }: { business: Business }) {
  const t = useTranslations('store.item');
  const status = useOpeningStatus(business);
  if (!status || status.open) return null;
  return (
    <p className="mt-2 animate-fade-in text-body2 text-gray-600">
      {t('closedNote')}
    </p>
  );
}
