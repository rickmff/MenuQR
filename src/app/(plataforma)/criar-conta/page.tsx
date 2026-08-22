import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/platform/auth-form';
import { platform } from '@/lib/platform';
import { buildMetadata } from '@/lib/seo';
import { demoMode } from '@/lib/demo/config';
import { getCurrentUser } from '@/server/auth/session';

export const metadata: Metadata = buildMetadata({
  title: 'Criar conta',
  description: `Crie sua conta no ${platform.name}, cadastre o restaurante e publique o cardápio digital com pedidos pelo WhatsApp. Sem cartão de crédito.`,
  path: '/criar-conta',
  keywords: ['criar cardápio digital', 'cadastro restaurante', 'cardápio online'],
});

const benefits = [
  'Cardápio publicado com link e QR code próprios',
  'Pedidos organizados chegando no seu WhatsApp',
  'Entrega por bairro, retirada e pedido mínimo',
  'Sem comissão por pedido e sem cartão de crédito',
];

export default async function SignupPage() {
  if (!demoMode && (await getCurrentUser())) redirect('/painel');

  return (
    <div className="container-page grid items-center gap-12 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-ink-950 p-10 text-ink-50 lg:p-12">
        <div className="glow-hero absolute inset-0" aria-hidden="true" />
        <div className="relative">
          <p className="eyebrow text-flame-300">Comece agora</p>
          <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
            Crie o cardápio do seu restaurante
          </h1>
          <p className="mt-5 text-lg text-ink-300">
            Leva menos de dez minutos para publicar. Dá para começar com poucos itens e completar o cardápio
            depois.
          </p>

          <ul className="mt-10 space-y-4">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex gap-3 text-ink-300">
                <span aria-hidden="true" className="text-flame-300">
                  ✓
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <p className="mt-10 border-t border-ink-50/10 pt-6 text-sm text-ink-400">
            Quer ver funcionando antes?{' '}
            <Link href="/r/sabor-e-brasa" className="font-semibold text-ink-50 underline underline-offset-4">
              Abra um cardápio de exemplo
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="surface p-7 shadow-soft lg:p-9">
          <h2 className="font-display text-2xl font-semibold">Sua conta</h2>
          <p className="mb-7 mt-1 text-sm text-ink-500">Nome, e-mail e senha. Só isso.</p>
          <AuthForm mode="signup" />
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          Ao criar a conta você concorda com os{' '}
          <Link className="underline underline-offset-2" href="/termos-de-uso">
            termos de uso
          </Link>{' '}
          e a{' '}
          <Link className="underline underline-offset-2" href="/politica-de-privacidade">
            política de privacidade
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
