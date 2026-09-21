import type { Metadata } from 'next';
import Link from 'next/link';
import { FlaskConical, MailQuestion } from 'lucide-react';
import { AuthShell, AuthStatus } from '@/components/platform/auth-shell';
import { ForgotPasswordForm } from '@/components/platform/forgot-password-form';
import { Button } from '@/components/ui/button';
import { demoMode } from '@/lib/demo/config';
import { platform } from '@/lib/platform';
import { buildMetadata } from '@/lib/seo';
import { emailAvailable, emailGoesToConsole } from '@/server/email';

export const metadata: Metadata = buildMetadata({
  title: 'Esqueci minha senha',
  description: `Receba por e-mail um link para criar uma senha nova e voltar ao painel do ${platform.name}.`,
  path: '/esqueci-senha',
  noIndex: true,
});

// A tela depende de variáveis lidas na hora (RESEND_API_KEY, EMAIL_FROM).
// Pré-renderizada, ela congelaria a resposta do momento do build.
export const dynamic = 'force-dynamic';

export default function ForgotPasswordPage() {
  if (demoMode) {
    return (
      <AuthStatus
        icon={<FlaskConical className="size-12 text-gray-400" />}
        title="Não há senha para recuperar aqui"
        description={
          <>
            <p>
              No modo demonstração a conta vive só neste navegador: nada vai para um servidor, então não existe
              e-mail de recuperação.
            </p>
            <p>Se não lembra a senha, crie outra conta de teste. Leva um minuto.</p>
          </>
        }
        action={
          <>
            <Button href="/criar-conta" fullWidth>
              Criar outra conta
            </Button>
            <Button href="/entrar" variant="text" fullWidth>
              Voltar para o login
            </Button>
          </>
        }
      />
    );
  }

  // Sem provedor em produção o formulário seria uma promessa vazia: melhor
  // dizer a verdade e dar o caminho que funciona.
  if (!emailAvailable()) {
    const subject = encodeURIComponent('Recuperar acesso à minha conta');
    return (
      <AuthStatus
        icon={<MailQuestion className="size-12 text-gray-400" />}
        title="Recuperação por e-mail ainda não está ativa"
        description={
          <>
            <p>
              Por enquanto a troca de senha é feita pela nossa equipe. Escreva para{' '}
              <a
                href={`mailto:${platform.email}?subject=${subject}`}
                className="font-semibold text-primary hover:text-primary-pressed"
              >
                {platform.email}
              </a>{' '}
              usando o e-mail da sua conta.
            </p>
            <p>A gente confirma que a conta é sua e devolve o acesso.</p>
          </>
        }
        action={
          <Button href="/entrar" variant="secondary" fullWidth>
            Voltar para o login
          </Button>
        }
      />
    );
  }

  return (
    <AuthShell
      title="Esqueci minha senha"
      description="Informe o e-mail da conta. Enviamos um link para você criar uma senha nova."
      footer={
        <>
          Lembrou a senha?{' '}
          <Link href="/entrar" className="font-semibold text-primary hover:text-primary-pressed">
            Entrar
          </Link>
        </>
      }
    >
      <ForgotPasswordForm consoleDelivery={emailGoesToConsole()} />
    </AuthShell>
  );
}
