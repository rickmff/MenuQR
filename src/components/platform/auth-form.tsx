'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { demoMode } from '@/lib/demo/config';
import { demoLoginAction, demoSignupAction } from '@/lib/demo/actions';
import { loginAction, signupAction, type AuthFormState } from '@/server/actions/auth';

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

export function AuthForm({ mode, next }: { mode: 'login' | 'signup'; next?: string }) {
  const isSignup = mode === 'signup';
  // No modo demonstração a conta é criada no próprio navegador.
  const action = demoMode
    ? isSignup
      ? demoSignupAction
      : demoLoginAction
    : isSignup
      ? signupAction
      : loginAction;
  const [state, formAction] = useActionState(action, initialState);
  const fieldError = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next && <input type="hidden" name="proximo" value={next} />}

      {state.error && (
        <p role="alert" className="rounded-2xl border border-flame-200 bg-flame-50 px-4 py-3 text-sm font-medium text-flame-700">
          {state.error}
        </p>
      )}

      {isSignup && (
        <Field label="Seu nome" htmlFor="name" error={fieldError('name')}>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            defaultValue={state.values?.name}
            placeholder="Como podemos te chamar?"
            className={inputClass(Boolean(fieldError('name')))}
          />
        </Field>
      )}

      <Field label="E-mail" htmlFor="email" error={fieldError('email')}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          placeholder="voce@restaurante.com.br"
          className={inputClass(Boolean(fieldError('email')))}
        />
      </Field>

      <Field
        label="Senha"
        htmlFor="password"
        error={fieldError('password')}
        hint={isSignup ? 'Use pelo menos 8 caracteres.' : undefined}
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
        label={isSignup ? 'Criar conta' : 'Entrar'}
        pendingLabel={isSignup ? 'Criando conta…' : 'Entrando…'}
      />

      <p className="text-center text-sm text-ink-500">
        {isSignup ? (
          <>
            Já tem conta?{' '}
            <Link href="/entrar" className="font-semibold text-flame-600 hover:text-flame-700">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{' '}
            <Link href="/criar-conta" className="font-semibold text-flame-600 hover:text-flame-700">
              Criar conta
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-flame-600">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return `field-input ${invalid ? 'field-input-invalid' : ''}`;
}
