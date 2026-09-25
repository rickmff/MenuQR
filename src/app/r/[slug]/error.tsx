'use client';

import { TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';
import { StoreMessage } from '@/components/store/item-missing';
import { Button } from '@/components/ui/button';
import { reportError, type BoundaryError } from '@/lib/report-error';

/**
 * Barreira de erro da loja: fica dentro da casca (o layout continua de pé,
 * com a sacola e o topo), oferece tentar de novo e relata o erro ao servidor
 * como a barreira da raiz.
 */
export default function StoreError({ error, reset }: { error: BoundaryError; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    reportError(error);
  }, [error]);

  return (
    <StoreMessage
      icon={<TriangleAlert className="size-10" />}
      title="Algo deu errado por aqui"
      description="Não foi possível carregar esta parte do cardápio. Tente de novo — a sua sacola continua salva."
      action={
        <Button variant="secondary" size="cta" pill onClick={reset}>
          Tentar novamente
        </Button>
      }
    />
  );
}
