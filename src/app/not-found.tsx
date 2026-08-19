import type { Metadata } from 'next';
import Link from 'next/link';
import { menu } from '@/lib/menu';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <p className="font-display text-6xl font-bold text-ember-500">404</p>
      <h1 className="mt-4 text-3xl font-semibold">Não encontramos esta página</h1>
      <p className="mx-auto mt-3 max-w-md text-charcoal-500">
        O endereço pode ter mudado ou o item saiu do cardápio. Veja o que está disponível agora:
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/cardapio"
          className="rounded-xl bg-ember-500 px-6 py-3.5 font-semibold text-white hover:bg-ember-600"
        >
          Ver o cardápio
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-cream-200 bg-white px-6 py-3.5 font-semibold hover:border-ember-400"
        >
          Voltar ao início
        </Link>
      </div>

      <ul className="mt-10 flex flex-wrap justify-center gap-3">
        {menu.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/cardapio/${category.slug}`}
              className="inline-block rounded-full border border-cream-200 bg-white px-4 py-2 text-sm font-medium hover:border-ember-400"
            >
              {category.icon} {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
