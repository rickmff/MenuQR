import type { Metadata } from 'next';
import { FlaskConical, Link2Off } from 'lucide-react';
import { AuthShell, AuthStatus } from '@/components/platform/auth-shell';
import { ResetPasswordForm } from '@/components/platform/reset-password-form';
import { Button } from '@/components/ui/button';
import { demoMode } from '@/lib/demo/config';
import { buildMetadata } from '@/lib/seo';
import { hashToken } from '@/server/auth/tokens';
import { getValidPasswordReset } from '@/server/repositories/password-resets';

// O canonical para no prefixo: o token é segredo e não entra em metadado nenhum.
export const metadata: Metadata = buildMetadata({
  title: 'Criar nova senha',
  description: 'Crie uma senha nova para voltar ao painel do seu restaurante.',
  path: '/redefinir-senha',
  noIndex: true,
});

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (demoMode) {
    return (
      <AuthStatus
        icon={<FlaskConical className="size-12 text-gray-400" />}
        title="Este link não funciona no modo demonstração"
        description={
          <p>Aqui a conta vive só no navegador, sem servidor nem e-mail: não há senha para redefinir.</p>
        }
        action={
          <Button href="/entrar" fullWidth>
            Voltar para o login
          </Button>
        }
      />
    );
  }

  // Abrir a página só confere o link. Ele é gasto no envio do formulário —
  // senão o antivírus do e-mail, que visita os links antes da pessoa, o queimaria.
  const reset = await getValidPasswordReset(hashToken(token));

  if (!reset) {
    return (
      <AuthStatus
        icon={<Link2Off className="size-12 text-gray-400" />}
        title="Este link não vale mais"
        description={
          <p>
            O link para criar uma senha nova vale por 1 hora e funciona uma vez só. Peça outro que a gente envia
            na hora.
          </p>
        }
        action={
          <>
            <Button href="/esqueci-senha" fullWidth>
              Pedir outro link
            </Button>
            <Button href="/entrar" variant="text" fullWidth>
              Voltar para o login
            </Button>
          </>
        }
      />
    );
  }

  return (
    <AuthShell title="Criar nova senha" description="Escolha uma senha que você ainda não usa em outro lugar.">
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
