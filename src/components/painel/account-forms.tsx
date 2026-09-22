'use client';

import { TriangleAlert } from 'lucide-react';
import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Notice } from '@/components/painel/account-parts';
import { Button, buttonClass } from '@/components/ui/button';
import { useFormAction } from '@/components/use-form-action';
import { DELETE_ACCOUNT_PHRASE, matchesDeleteAccountPhrase } from '@/lib/account';
import { cn } from '@/lib/cn';
import { deleteAccountAction } from '@/server/actions/account';
import type { FormState } from '@/server/actions/business';

const initialState: FormState = {};

/* ----------------------------------------------------------- excluir conta */

export function DeleteAccountForm({
  store,
}: {
  /** Negócio que vai junto. `null` para quem ainda não cadastrou o restaurante. */
  store: { name: string; address: string } | null;
}) {
  const { state, formProps, pending } = useFormAction(deleteAccountAction, initialState);
  const [phrase, setPhrase] = useState('');
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    // Borda vermelha à mão: o `Card` não aceita cor de borda (sem tailwind-merge,
    // duas classes de cor brigariam), e esta é a única seção destrutiva do painel.
    <section
      aria-labelledby="delete-account-title"
      className="rounded-md border border-error bg-white p-4 lg:p-6"
    >
      <h2 id="delete-account-title" className="flex items-center gap-2 text-subtitle font-bold text-gray-700">
        <TriangleAlert aria-hidden="true" className="size-5 shrink-0 text-error" />
        Excluir conta
      </h2>
      <p className="mt-1 text-body2 text-gray-600">Vale na hora e não dá para desfazer. O que some:</p>

      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-body2 text-gray-700">
        {store && (
          <>
            <li>
              O cardápio de <strong className="font-semibold">{store.name}</strong>: categorias, itens, fotos e
              dados do negócio.
            </li>
            <li>
              O link <strong className="break-all font-semibold">{store.address}</strong> e o QR code param de
              funcionar, inclusive os que já estão impressos.
            </li>
          </>
        )}
        <li>Seu nome, e-mail e senha. Você sai de todos os aparelhos.</li>
        <li>Sua assinatura é cancelada. O valor já pago não é devolvido.</li>
      </ul>

      {/* <details> e não estado: abre sem JavaScript e continua aberto quando a ação devolve erro. */}
      <details className="mt-5">
        <summary
          className={cn(
            buttonClass({ variant: 'secondary', size: 'sm' }),
            'cursor-pointer list-none justify-center [&::-webkit-details-marker]:hidden',
          )}
        >
          Quero excluir minha conta
        </summary>

        {/* Só a frase confirma. A senha ficou no Clerk, e pedir a de lá aqui
            seria um campo de senha fora da tela de login — hábito ruim de
            ensinar. */}
        <form {...formProps} className="mt-5 space-y-4" noValidate>
          <Field
            id="delete-confirmation"
            name="confirmation"
            label={`Para confirmar, digite “${DELETE_ACCOUNT_PHRASE}”`}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={phrase}
            onChange={(event) => setPhrase(event.target.value)}
            error={error('confirmation')}
          />

          <FormFooter state={state} pending={pending}>
            {/* O servidor confere a frase de novo; aqui o botão só deixa claro que ainda falta digitar. */}
            <Button type="submit" loading={pending} disabled={!matchesDeleteAccountPhrase(phrase)}>
              Excluir conta definitivamente
            </Button>
          </FormFooter>
        </form>
      </details>
    </section>
  );
}

/* ------------------------------------------------------------------ peças */

/** Retorno da ação logo acima do botão — é para onde o lojista está olhando quando envia. */
function FormFooter({
  state,
  pending,
  children,
}: {
  state: FormState;
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {state.error && <Notice tone="error">{state.error}</Notice>}
      {state.success && !pending && <Notice tone="success">{state.success}</Notice>}
      <div className="flex justify-end">{children}</div>
    </>
  );
}

const INPUT_CLASS =
  'h-12 w-full rounded-sm border bg-white px-4 text-body1 text-gray-700 placeholder:text-gray-400 focus:border-primary focus:outline-none';

function Field({
  id,
  label,
  hint,
  error,
  ...input
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'>) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-body2 font-medium text-gray-700">
        {label}
      </label>
      <input
        {...input}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        // Uma cor de borda por vez: sem tailwind-merge, as duas juntas brigariam.
        className={cn(INPUT_CLASS, error ? 'border-error' : 'border-gray-300')}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-caption text-gray-600">
          {hint}
        </p>
      )}
      {error && (
        // Tom mais escuro que o `error` da borda: em texto de 12px o vermelho puro não fecha contraste AA.
        <p id={`${id}-error`} role="alert" className="mt-1 text-caption font-medium text-primary-pressed">
          {error}
        </p>
      )}
    </div>
  );
}
