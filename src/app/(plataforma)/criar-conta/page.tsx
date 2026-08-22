import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/platform/auth-form';
import { platform } from '@/lib/platform';
import { buildMetadata } from '@/lib/seo';
import { getCurrentUser } from '@/server/auth/session';

export const metadata: Metadata = buildMetadata({
  title: 'Criar conta grátis',
  description: `Crie sua conta no ${platform.name}, cadastre o restaurante e publique o cardápio digital com pedidos pelo WhatsApp. Sem cartão de crédito.`,
  path: '/criar-conta',
  keywords: ['criar cardápio digital', 'cadastro restaurante', 'cardápio grátis'],
});

const benefits = [
  'Cardápio publicado com link e QR code próprios',
  'Pedidos organizados chegando no seu WhatsApp',
  'Entrega por bairro, retirada e pedido mínimo',
  'Sem comissão por pedido e sem cartão de crédito',
];

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/painel');

  return (
    <div className="container-page grid gap-12 py-16 lg:grid-cols-2">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">Crie o cardápio do seu restaurante</h1>
        <p className="mt-4 text-lg text-charcoal-700">
          Leva menos de dez minutos para publicar. Você pode começar com poucos itens e completar o
          cardápio depois.
        </p>
        <ul className="mt-8 space-y-3">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex gap-3 text-charcoal-700">
              <span aria-hidden="true" className="text-whatsapp-600">
                ✓
              </span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-card border border-cream-200 bg-white p-6 lg:p-8">
        <AuthForm mode="signup" />
        <p className="mt-6 text-center text-xs text-charcoal-500">
          Ao criar a conta você concorda com os{' '}
          <a className="underline" href="/termos-de-uso">
            termos de uso
          </a>{' '}
          e a{' '}
          <a className="underline" href="/politica-de-privacidade">
            política de privacidade
          </a>
          .
        </p>
      </div>
    </div>
  );
}
