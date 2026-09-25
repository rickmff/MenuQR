'use client';

import { Bike, Store } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SegmentedControl } from '@/components/ui/segmented-control';
import type { OrderMode } from '@/lib/types';

/**
 * Entrega | Retirada, o mesmo controle na sacola e no checkout: a escolha é
 * uma só e vale nos dois passos. Só faz sentido quando os dois modos estão
 * ligados — com um modo só, quem chama mostra um rótulo ou nada.
 */
export function OrderModeControl({
  value,
  onChange,
}: {
  value: OrderMode;
  onChange: (mode: OrderMode) => void;
}) {
  const t = useTranslations('store.identity');
  return (
    <SegmentedControl<OrderMode>
      label={t('modeLabel')}
      indicator="sliding"
      value={value}
      onChange={onChange}
      options={[
        { value: 'delivery', label: t('delivery'), icon: <Bike className="size-5" /> },
        { value: 'pickup', label: t('pickup'), icon: <Store className="size-5" /> },
      ]}
    />
  );
}
