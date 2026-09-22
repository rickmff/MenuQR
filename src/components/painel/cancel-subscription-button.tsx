'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cancelSubscriptionAction } from '@/server/actions/billing';

/** Cancela a renovação depois de confirmar. O acesso continua até o fim do período pago. */
export function CancelSubscriptionButton({ subscriptionId, paidUntil }: { subscriptionId: string; paidUntil: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const cancel = () => {
    const formData = new FormData();
    formData.set('subscriptionId', subscriptionId);
    startTransition(() => cancelSubscriptionAction(formData));
  };

  return (
    <>
      <Button variant="secondary" size="sm" loading={pending} onClick={() => setOpen(true)}>
        Cancelar renovação
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cancelar a renovação?"
        description={`Você continua usando até ${paidUntil}. Depois disso o painel e o cardápio ficam bloqueados até uma nova assinatura.`}
        confirmLabel="Cancelar renovação"
        cancelLabel="Voltar"
        onConfirm={cancel}
      />
    </>
  );
}
