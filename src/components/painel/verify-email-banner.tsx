'use client';

import { CircleCheck, MailWarning } from 'lucide-react';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { resendVerificationAction, type ResendVerificationState } from '@/server/actions/auth';

const initialState: ResendVerificationState = {};

/**
 * Lembrete de confirmar o e-mail. Não bloqueia nada do painel: a confirmação
 * só garante que a recuperação de senha vai chegar na caixa certa. Quem decide
 * se a faixa aparece é o layout — sem envio de e-mail ativo ela nem é montada.
 */
export function VerifyEmailBanner({
  email,
  consoleDelivery = false,
}: {
  email: string;
  /** Desenvolvimento sem provedor: o link sai no terminal do servidor. */
  consoleDelivery?: boolean;
}) {
  // Sem campos para preservar, o `action` puro do <form> serve.
  const [state, formAction, pending] = useActionState(resendVerificationAction, initialState);

  // Confirmou em outra aba e voltou para cá: a faixa vira um "tudo certo" até o
  // layout ser recarregado sem ela.
  if (state.status === 'verified') {
    return (
      <div role="status" className="mb-6 flex items-center gap-3 rounded-sm bg-success-bg p-3 text-body2 text-gray-700">
        <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-success" />
        <p>{state.message}</p>
      </div>
    );
  }

  const feedback =
    state.status === 'sent' && consoleDelivery
      ? `${state.message} Sem provedor de e-mail, ele aparece no terminal do servidor.`
      : state.message;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-sm bg-warning-bg p-3 text-body2 text-gray-700">
      <div className="flex min-w-0 flex-1 basis-64 gap-3">
        {/* Cinza e não o amarelo do tom: amarelo sobre amarelo-claro não se lê. */}
        <MailWarning aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-gray-700" />
        <div className="min-w-0">
          <p className="font-semibold">Confirme seu e-mail</p>
          <p className="break-words">
            Enviamos um link para <span className="font-medium">{email}</span>. É por esse e-mail que você
            recupera a senha.
          </p>
          {/* Sempre montado: região aria-live criada junto com o texto não é anunciada. */}
          <p
            aria-live="polite"
            className={cn(
              'font-medium',
              feedback && 'mt-1',
              state.status === 'error' && 'text-primary-pressed',
            )}
          >
            {feedback}
          </p>
        </div>
      </div>

      <form action={formAction} className="shrink-0">
        <Button type="submit" variant="secondary" size="sm" loading={pending}>
          Reenviar e-mail
        </Button>
      </form>
    </div>
  );
}
