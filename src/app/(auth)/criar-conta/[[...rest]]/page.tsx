import { SignUp } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/platform/auth-form';
import { SignupTerms } from '@/components/platform/signup-terms';
import { Card } from '@/components/ui/card';
import { demoMode } from '@/lib/demo/config';
import { platform } from '@/lib/platform';
import { buildMetadata } from '@/lib/seo';
import { getCurrentUser } from '@/server/auth/current-user';

export const metadata: Metadata = buildMetadata({
  title: 'Criar conta',
  description: `Crie sua conta no ${platform.name}, cadastre o restaurante e publique o cardápio digital com pedidos pelo WhatsApp. Sem cartão de crédito.`,
  path: '/criar-conta',
  keywords: ['criar cardápio digital', 'cadastro restaurante', 'cardápio online'],
});

/** Rota coringa pelo mesmo motivo de `/entrar`: o Clerk usa caminhos abaixo dela. */
export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/painel');

  return (
    <>
      {demoMode ? (
        <Card padding="lg">
          <h1 className="mb-6 text-h6 font-bold text-gray-700">Criar conta</h1>
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
