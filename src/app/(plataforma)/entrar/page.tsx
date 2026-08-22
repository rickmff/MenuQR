import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/platform/auth-form';
import { platform } from '@/lib/platform';
import { buildMetadata } from '@/lib/seo';
import { getCurrentUser } from '@/server/auth/session';

export const metadata: Metadata = buildMetadata({
  title: 'Entrar na sua conta',
  description: `Acesse o painel do ${platform.name} para editar o cardápio, os horários e a área de entrega do seu restaurante.`,
  path: '/entrar',
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string }>;
}) {
  if (await getCurrentUser()) redirect('/painel');
  const { proximo } = await searchParams;
  const next = proximo?.startsWith('/') && !proximo.startsWith('//') ? proximo : undefined;

  return (
    <div className="container-page flex justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold">Entrar</h1>
        <p className="mt-2 text-charcoal-500">
          Acesse o painel para atualizar o cardápio e acompanhar o seu link público.
        </p>
        <div className="mt-8 rounded-card border border-cream-200 bg-white p-6">
          <AuthForm mode="login" next={next} />
        </div>
      </div>
    </div>
  );
}
