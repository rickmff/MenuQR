'use client';

import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { AuthField } from '@/components/platform/auth-field';
import { AuthNotice } from '@/components/platform/auth-shell';
import { Button } from '@/components/ui/button';
import { useFormAction } from '@/components/use-form-action';
import { requestPasswordResetAction, type ForgotPasswordState } from '@/server/actions/auth';

const initialState: ForgotPasswordState = {};

/**
 * `consoleDelivery`: servidor de desenvolvimento sem provedor de e-mail. O link
 * sai no terminal, e a tela avisa — senão quem está testando fica esperando um
 * e-mail que não vem.
 */
export function ForgotPasswordForm({ consoleDelivery = false }: { consoleDelivery?: boolean }) {
  // O estado do useActionState não tem "voltar ao início": trocar a `key`
  // remonta o formulário para quem quer tentar com outro e-mail.
  const [attempt, setAttempt] = useState(0);
  return (
    <RequestForm
      key={attempt}
      consoleDelivery={consoleDelivery}
      onRestart={() => setAttempt((current) => current + 1)}
    />
  );
}

function RequestForm({ consoleDelivery, onRestart }: { consoleDelivery: boolean; onRestart: () => void }) {
  const { state, formProps, pending } = useFormAction(requestPasswordResetAction, initialState);

  if (state.done) {
    return (
      <div role="status" className="text-center">
        <MailCheck aria-hidden="true" className="mx-auto size-12 text-positive" />
        <h2 className="mt-4 text-subtitle font-bold text-gray-700">Confira seu e-mail</h2>
        <p className="mt-2 text-body2 text-gray-600">{state.message}</p>
        <p className="mt-2 text-body2 text-gray-600">Não chegou em alguns minutos? Olhe a caixa de spam.</p>
        {consoleDelivery && <ConsoleDeliveryNotice className="mt-4 text-left" />}
        <Button variant="text" size="sm" className="mt-4" onClick={onRestart}>
          Usar outro e-mail
        </Button>
      </div>
    );
  }

  return (
    <form {...formProps} className="space-y-4" noValidate>
      {state.error && (
        <AuthNotice tone="error" role="alert">
          <p>{state.error}</p>
        </AuthNotice>
      )}

      <AuthField
        id="email"
        name="email"
        type="email"
        label="E-mail da conta"
        autoComplete="email"
        required
        placeholder="voce@restaurante.com.br"
        error={state.fieldErrors?.email}
      />

      <Button type="submit" fullWidth loading={pending}>
        Enviar link
      </Button>

      {consoleDelivery && <ConsoleDeliveryNotice />}
    </form>
  );
}

function ConsoleDeliveryNotice({ className }: { className?: string }) {
  return (
    <AuthNotice tone="info" className={className}>
      <p>
        Ambiente de desenvolvimento, sem provedor de e-mail: o link aparece no terminal do servidor em vez de
        ser enviado.
      </p>
    </AuthNotice>
  );
}
