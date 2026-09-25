import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AuthForm } from '@/components/platform/auth-form';
import { Card } from '@/components/ui/card';
import { demoMode } from '@/lib/demo/config';
import { platform } from '@/lib/platform';
import { buildMetadata } from '@/lib/seo';
import { getCurrentUser } from '@/server/auth/current-user';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.login' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDescription', { name: platform.name }),
    path: '/entrar',
    locale,
  });
}

/**
 * Rota coringa (`[[...rest]]`) porque o Clerk resolve as etapas do login em
 * caminhos abaixo de `/entrar` — confirmar o código, voltar de um provedor
 * externo, criar uma senha nova.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  if (await getCurrentUser()) redirect('/painel');
  const { proximo } = await searchParams;
  const next = proximo?.startsWith('/') && !proximo.startsWith('//') ? proximo : undefined;

  if (demoMode) {
    const t = await getTranslations('auth.login');
    return (
      <Card padding="lg">
        <h1 className="mb-6 text-h6 font-bold text-gray-700">{t('title')}</h1>
        <AuthForm mode="login" next={next} />
      </Card>
    );
  }

  return (
    <div className="flex justify-center">
      <SignIn
        path="/entrar"
        signUpUrl="/criar-conta"
        // Sem `proximo` cai no painel; com ele, volta para a página que o
        // lojista tinha aberto antes de ser mandado para cá.
        fallbackRedirectUrl="/painel"
        forceRedirectUrl={next}
      />
    </div>
  );
}
