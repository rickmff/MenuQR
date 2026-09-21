'use client';

import Link from 'next/link';
import { AuthField } from '@/components/platform/auth-field';
import { AuthNotice } from '@/components/platform/auth-shell';
import { Button } from '@/components/ui/button';
import { useFormAction } from '@/components/use-form-action';
import { resetPasswordAction, type ResetPasswordState } from '@/server/actions/auth';

const initialState: ResetPasswordState = {};

/**
 * `useFormAction` e não o `action` puro do <form>: com erro de validação o
 * React 19 zeraria os dois campos de senha, e a pessoa teria de digitar tudo de
 * novo por causa de uma confirmação errada.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const { state, formProps, pending } = useFormAction(resetPasswordAction, initialState);

  return (
    <form {...formProps} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />

      {/* A página já validou o link ao abrir; isto é para quem demorou e ele venceu no caminho. */}
      {state.invalidToken && (
        <AuthNotice tone="error" role="alert">
          <p>Este link venceu ou já foi usado.</p>
          <p>
            <Link href="/esqueci-senha" className="font-semibold text-primary-pressed underline underline-offset-2">
              Pedir outro link
            </Link>
          </p>
        </AuthNotice>
      )}
      <AuthField
        id="password"
        name="password"
        type="password"
        label="Nova senha"
        autoComplete="new-password"
        required
        minLength={8}
        hint="Use pelo menos 8 caracteres."
        error={state.fieldErrors?.password}
      />

      <AuthField
        id="confirmation"
        name="confirmation"
        type="password"
        label="Repita a nova senha"
        autoComplete="new-password"
        required
        minLength={8}
        error={state.fieldErrors?.confirmation}
      />

      <Button type="submit" fullWidth loading={pending}>
        Salvar nova senha
      </Button>

      <p className="text-center text-caption text-gray-600">
        Ao salvar, você entra no painel e as outras sessões abertas da conta são encerradas.
      </p>
    </form>
  );
}
