'use client';

import { TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { AccountSection, Notice } from '@/components/painel/account-parts';
import { Button, buttonClass } from '@/components/ui/button';
import { useFormAction } from '@/components/use-form-action';
import { DELETE_ACCOUNT_PHRASE, matchesDeleteAccountPhrase } from '@/lib/account';
import { cn } from '@/lib/cn';
import { changePasswordAction, deleteAccountAction, updateProfileAction } from '@/server/actions/account';
import type { FormState } from '@/server/actions/business';

const initialState: FormState = {};

/* -------------------------------------------------------------- seus dados */

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const { state, formProps, pending } = useFormAction(updateProfileAction, initialState);
  const [typedEmail, setTypedEmail] = useState(email);
  const error = (field: string) => state.fieldErrors?.[field];

  // A senha só é pedida quando o e-mail muda: corrigir o nome não merece o
  // atrito. A comparação é a mesma do servidor (sem espaços, minúsculas). O
  // erro também mantém o campo na tela — sem JavaScript é o único jeito de ele
  // aparecer depois que o servidor reclamou da falta dele.
  const emailChanged = typedEmail.trim().toLowerCase() !== email;
  const askPassword = emailChanged || Boolean(error('currentPassword'));

  return (
    <AccountSection title="Seus dados" description="Seu nome e o e-mail que você usa para entrar no painel.">
      <form {...formProps} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="profile-name"
            name="name"
            label="Seu nome"
            autoComplete="name"
            defaultValue={name}
            error={error('name')}
          />
          <Field
            id="profile-email"
            name="email"
            type="email"
            label="E-mail"
            autoComplete="email"
            value={typedEmail}
            onChange={(event) => setTypedEmail(event.target.value)}
            error={error('email')}
          />
        </div>

        {askPassword && (
          <Field
            id="profile-password"
            name="currentPassword"
            type="password"
            label="Senha atual"
            autoComplete="current-password"
            hint="Pedimos a senha porque o e-mail é o seu login."
            error={error('currentPassword')}
          />
        )}

        <FormFooter state={state} pending={pending}>
          <Button type="submit" loading={pending}>
            Salvar alterações
          </Button>
        </FormFooter>
      </form>
    </AccountSection>
  );
}

/* ------------------------------------------------------------ trocar senha */

export function PasswordForm({ email }: { email: string }) {
  const { state, formProps, pending } = useFormAction(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const error = (field: string) => state.fieldErrors?.[field];

  // `useFormAction` preserva o que foi digitado — ótimo no erro, mas depois do
  // sucesso a senha antiga e a nova não têm por que continuar nos campos.
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <AccountSection
      title="Trocar senha"
      description="Ao trocar, todos os outros aparelhos conectados são desconectados. Você continua logado aqui."
    >
      <form ref={formRef} {...formProps} className="space-y-4" noValidate>
        {/* Sem um campo de usuário no formulário, o gerenciador de senhas não sabe de qual conta é a senha nova. */}
        <input
          type="text"
          name="username"
          autoComplete="username"
          value={email}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />

        <Field
          id="password-current"
          name="currentPassword"
          type="password"
          label="Senha atual"
          autoComplete="current-password"
          error={error('currentPassword')}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="password-new"
            name="newPassword"
            type="password"
            label="Nova senha"
            autoComplete="new-password"
            minLength={8}
            hint="Use pelo menos 8 caracteres."
            error={error('newPassword')}
          />
          <Field
            id="password-confirm"
            name="confirmPassword"
            type="password"
            label="Repita a nova senha"
            autoComplete="new-password"
            error={error('confirmPassword')}
          />
        </div>

        <FormFooter state={state} pending={pending}>
          <Button type="submit" loading={pending}>
            Trocar senha
          </Button>
        </FormFooter>
      </form>
    </AccountSection>
  );
}

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

        <form {...formProps} className="mt-5 space-y-4" noValidate>
          <Field
            id="delete-password"
            name="currentPassword"
            type="password"
            label="Senha atual"
            autoComplete="current-password"
            error={error('currentPassword')}
          />
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
