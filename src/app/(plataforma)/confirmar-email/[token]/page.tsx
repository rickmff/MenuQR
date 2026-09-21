import type { Metadata } from 'next';
import { FlaskConical, Link2Off, MailCheck } from 'lucide-react';
import { AuthStatus } from '@/components/platform/auth-shell';
import { Button } from '@/components/ui/button';
import { demoMode } from '@/lib/demo/config';
import { buildMetadata } from '@/lib/seo';
import { getCurrentUser } from '@/server/auth/session';
import { hashToken } from '@/server/auth/tokens';
import { isEmailVerified, verifyEmailByToken } from '@/server/repositories/email-verifications';

// O canonical para no prefixo: o token não entra em metadado nenhum.
export const metadata: Metadata = buildMetadata({
  title: 'Confirmar e-mail',
  description: 'Confirmação do e-mail da sua conta.',
  path: '/confirmar-email',
  noIndex: true,
});

export default async function ConfirmEmailPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (demoMode) {
    return (
      <AuthStatus
        icon={<FlaskConical className="size-12 text-gray-400" />}
        title="Nada para confirmar no modo demonstração"
        description={<p>Aqui a conta vive só no navegador e nenhum e-mail é enviado.</p>}
        action={
          <Button href="/painel" fullWidth>
            Ir para o painel
          </Button>
        }
      />
    );
  }

  // A confirmação acontece ao abrir o link, sem botão: é o que a pessoa espera
  // de um "confirme seu e-mail", e o pior que uma visita automática do antivírus
  // consegue é confirmar um endereço que de fato recebeu a mensagem.
  const confirmed = Boolean(await verifyEmailByToken(hashToken(token)));

  // O link vale uma vez. Segundo clique (ou clique depois da visita do
  // antivírus) cai aqui sem token válido, mas com o e-mail já confirmado:
  // para quem está logado dá para saber, e mostrar "link inválido" seria mentira.
  const alreadyConfirmed = !confirmed && (await currentUserIsVerified());

  if (confirmed || alreadyConfirmed) {
    return (
      <AuthStatus
        icon={<MailCheck className="size-12 text-positive" />}
        title={confirmed ? 'E-mail confirmado!' : 'Seu e-mail já está confirmado'}
        description={<p>É por ele que você recupera o acesso ao painel se esquecer a senha.</p>}
        action={
          <Button href="/painel" fullWidth>
            Ir para o painel
          </Button>
        }
      />
    );
  }

  return (
    <AuthStatus
      icon={<Link2Off className="size-12 text-gray-400" />}
      title="Este link não vale mais"
      description={
        <p>
          Ele pode ter vencido ou sido trocado por um mais novo. Entre no painel e toque em “Reenviar e-mail”
          para receber outro.
        </p>
      }
      action={
        <Button href="/painel" fullWidth>
          Ir para o painel
        </Button>
      }
    />
  );
}

async function currentUserIsVerified(): Promise<boolean> {
  const user = await getCurrentUser();
  return user ? isEmailVerified(user.id) : false;
}
