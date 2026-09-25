'use client';

import { QrCode } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Notice } from '@/components/painel/account-parts';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useFormAction } from '@/components/use-form-action';
import { formatCpfCnpj, normalizeCpfCnpj } from '@/lib/cpf-cnpj';
import { startSubscriptionAction } from '@/server/actions/billing';
import type { FormState } from '@/server/actions/business';

const initialState: FormState = {};

/** Nome do titular, CPF/CNPJ e aceite: o que o Asaas precisa para gerar a cobrança. */
export function SubscribeForm({
  defaultName,
  defaultCpfCnpj,
  submitLabel,
}: {
  defaultName: string;
  defaultCpfCnpj: string | null;
  submitLabel: string;
}) {
  const { state, formProps, pending } = useFormAction(startSubscriptionAction, initialState);
  const [document, setDocument] = useState(defaultCpfCnpj ? formatCpfCnpj(defaultCpfCnpj) : '');
  const error = (field: string) => state.fieldErrors?.[field];
  const t = useTranslations('account.subscribeForm');

  return (
    <form {...formProps} className="space-y-4" noValidate>
      <TextField
        id="subscribe-name"
        name="name"
        label={t('nameLabel')}
        defaultValue={defaultName}
        placeholder="Maria Silva"
        autoComplete="name"
        required
        error={error('name')}
      />
      <TextField
        id="subscribe-document"
        name="cpfCnpj"
        label={t('documentLabel')}
        value={document}
        onChange={(event) => {
          const clean = normalizeCpfCnpj(event.target.value).slice(0, 14);
          setDocument(clean.length === 11 || clean.length === 14 ? formatCpfCnpj(clean) : clean);
        }}
        placeholder="000.000.000-00"
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        required
        hint={t('documentHint')}
        error={error('cpfCnpj')}
      />

      <label className="flex cursor-pointer items-start gap-2.5 text-body2 text-gray-700">
        <input type="checkbox" name="accept" className="mt-0.5 size-5 shrink-0 accent-primary" />
        <span>
          {t.rich('acceptTerms', {
            terms: (chunks) => (
              <Link href="/termos-de-uso" target="_blank" rel="noopener" className="font-semibold underline">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      {error('accept') && (
        <p role="alert" className="text-caption font-medium text-error">
          {error('accept')}
        </p>
      )}

      {state.error && <Notice tone="error">{state.error}</Notice>}

      <Button type="submit" loading={pending} leading={<QrCode className="size-5" />}>
        {submitLabel}
      </Button>
    </form>
  );
}
