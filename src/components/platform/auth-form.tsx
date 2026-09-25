'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { demoLoginAction, demoSignupAction, type AuthFormState } from '@/lib/demo/actions';

const initialState: AuthFormState = {};

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn btn-primary w-full"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Entrar e criar conta no modo demonstração, onde a conta é inventada no
 * próprio navegador. Com banco, estas telas são as do Clerk.
 */
export function AuthForm({ mode, next }: { mode: 'login' | 'signup'; next?: string }) {
  const t = useTranslations('auth.form');
  const isSignup = mode === 'signup';
  const [state, formAction] = useActionState(isSignup ? demoSignupAction : demoLoginAction, initialState);
  const fieldError = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next && <input type="hidden" name="proximo" value={next} />}

      {state.error && (
        <p role="alert" className="rounded-lg border border-flame-200 bg-flame-50 px-4 py-3 text-body2 font-medium text-flame-700">
          {state.error}
        </p>
      )}

      {isSignup && (
        <Field label={t('name')} htmlFor="name" error={fieldError('name')}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            defaultValue={state.values?.name}
            placeholder={t('namePlaceholder')}
            className={inputClass(Boolean(fieldError('name')))}
          />
        </Field>
      )}

      <Field label={t('email')} htmlFor="email" error={fieldError('email')}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          placeholder={t('emailPlaceholder')}
          className={inputClass(Boolean(fieldError('email')))}
        />
      </Field>

      <Field
        label={t('password')}
        htmlFor="password"
        error={fieldError('password')}
        hint={isSignup ? t('passwordHint') : undefined}
      >
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          required
          minLength={isSignup ? 8 : undefined}
          placeholder="••••••••"
          className={inputClass(Boolean(fieldError('password')))}
        />
      </Field>

      <SubmitButton
        label={isSignup ? t('createAccount') : t('signIn')}
        pendingLabel={isSignup ? t('creatingAccount') : t('signingIn')}
      />

      <p className="text-center text-body2 text-ink-500">
        {isSignup ? (
          <>
            {t('haveAccount')}{' '}
            <Link href="/entrar" className="font-semibold text-flame-600 hover:text-flame-700">
              {t('signIn')}
            </Link>
          </>
        ) : (
          <>
            {t('noAccount')}{' '}
            <Link href="/criar-conta" className="font-semibold text-flame-600 hover:text-flame-700">
              {t('createAccount')}
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-body2 font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-caption text-ink-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-caption font-medium text-flame-600">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return `field-input ${invalid ? 'field-input-invalid' : ''}`;
}
