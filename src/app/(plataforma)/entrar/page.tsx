import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/platform/auth-form';
import { platform } from '@/lib/platform';
import { buildMetadata } from '@/lib/seo';
import { demoMode } from '@/lib/demo/config';
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
  if (!demoMode && (await getCurrentUser())) redirect('/painel');
  const { proximo } = await searchParams;
  const next = proximo?.startsWith('/') && !proximo.startsWith('//') ? proximo : undefined;

  return (
    <div className="container-page flex justify-center py-20">
      <div className="w-full max-w-md">
        <p className="eyebrow text-flame-600">Painel do restaurante</p>
        <h1 className="mt-4 text-4xl font-semibold">Entrar</h1>
        <p className="mt-3 text-ink-500">
          Acesse para atualizar o cardápio e acompanhar o seu link público.
        </p>

        <div className="surface mt-8 p-7 shadow-soft">
          <AuthForm mode="login" next={next} />
        </div>
      </div>
    </div>
  );
}
