'use client';

import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Notice } from '@/components/painel/account-parts';
import { Button } from '@/components/ui/button';
import { useFormAction } from '@/components/use-form-action';
import { refreshSubscriptionAction } from '@/server/actions/billing';
import type { FormState } from '@/server/actions/business';

const initialState: FormState = {};

/** "Já paguei": consulta o Asaas na hora, para quem não quer esperar o webhook. */
export function RefreshSubscriptionButton() {
  const { state, formProps, pending } = useFormAction(refreshSubscriptionAction, initialState);
  const t = useTranslations('account.pix');

  return (
    <form {...formProps} className="space-y-3">
      <Button type="submit" loading={pending} leading={<RefreshCw className="size-5" />}>
        {t('alreadyPaid')}
      </Button>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.success && <Notice tone="success">{state.success}</Notice>}
    </form>
  );
}
