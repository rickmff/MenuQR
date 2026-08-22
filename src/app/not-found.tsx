import type { Metadata } from 'next';
import Link from 'next/link';
import { platform } from '@/lib/platform';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main id="conteudo" className="container-page flex flex-1 flex-col justify-center py-24 text-center">
      <p className="font-display text-6xl font-bold text-ember-500">404</p>
      <h1 className="mt-4 text-3xl font-semibold">Não encontramos esta página</h1>
      <p className="mx-auto mt-3 max-w-md text-charcoal-500">
        O endereço pode ter mudado, ou o cardápio que você procura ainda não foi publicado.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-ember-500 px-6 py-3.5 font-semibold text-white hover:bg-ember-600"
        >
          Ir para a página inicial
        </Link>
        <Link
          href="/criar-conta"
          className="rounded-xl border border-cream-200 bg-white px-6 py-3.5 font-semibold hover:border-ember-400"
        >
          Criar meu cardápio no {platform.name}
        </Link>
      </div>
    </main>
  );
}
