'use client';

import { CalendarX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cancelSubscriptionAction } from '@/server/actions/billing';

/** Cancela a renovação depois de confirmar. O acesso continua até o fim do período pago. */
export function CancelSubscriptionButton({ subscriptionId, paidUntil }: { subscriptionId: string; paidUntil: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const t = useTranslations('account.cancel');

  const cancel = () => {
    const formData = new FormData();
    formData.set('subscriptionId', subscriptionId);
    startTransition(() => cancelSubscriptionAction(formData));
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        loading={pending}
        onClick={() => setOpen(true)}
        leading={<CalendarX className="size-4" />}
      >
        {t('button')}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('title')}
        description={t('description', { date: paidUntil })}
        confirmLabel={t('confirm')}
        cancelLabel={t('back')}
        onConfirm={cancel}
      />
    </>
  );
}
