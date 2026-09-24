'use client';

import { Bike, Store } from 'lucide-react';
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
  return (
    <SegmentedControl<OrderMode>
      label="Como deseja receber o pedido"
      value={value}
      onChange={onChange}
      options={[
        { value: 'delivery', label: 'Entrega', icon: <Bike className="size-5" /> },
        { value: 'pickup', label: 'Retirada', icon: <Store className="size-5" /> },
      ]}
    />
  );
}
