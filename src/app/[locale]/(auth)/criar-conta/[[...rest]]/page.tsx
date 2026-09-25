import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AuthForm } from '@/components/platform/auth-form';
import { SignupTerms } from '@/components/platform/signup-terms';
import { Card } from '@/components/ui/card';
import { demoMode } from '@/lib/demo/config';
import { platform } from '@/lib/platform';
import { buildMetadata } from '@/lib/seo';
import { getCurrentUser } from '@/server/auth/current-user';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth.signup' });
  return buildMetadata({
    title: t('metaTitle'),
    description: t('metaDescription', { name: platform.name }),
    path: '/criar-conta',
    keywords: t.raw('keywords') as string[],
    locale,
  });
}

/** Rota coringa pelo mesmo motivo de `/entrar`: o Clerk usa caminhos abaixo dela. */
export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/painel');
  const t = await getTranslations('auth.signup');

  return (
    <>
      {demoMode ? (
        <Card padding="lg">
          <h1 className="mb-6 text-h6 font-bold text-gray-700">{t('title')}</h1>
          <AuthForm mode="signup" />
        </Card>
      ) : (
        <div className="flex justify-center">
          <SignUp
            path="/criar-conta"
            signInUrl="/entrar"
            // Conta nova cai no cadastro do restaurante, não no painel vazio.
            fallbackRedirectUrl="/painel/comecar"
          />
        </div>
      )}

      <SignupTerms />
    </>
  );
}
