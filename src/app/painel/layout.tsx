import Link from 'next/link';
import { platform } from '@/lib/platform';
import { requireUser } from '@/server/auth/guards';
import { getBusinessByOwner } from '@/server/repositories/businesses';
import { logoutAction } from '@/server/actions/auth';

export const metadata = {
  title: 'Painel',
  robots: { index: false, follow: false },
};

const navigation = [
  { href: '/painel', label: 'Visão geral', icon: '📊' },
  { href: '/painel/cardapio', label: 'Cardápio', icon: '📖' },
  { href: '/painel/negocio', label: 'Dados do negócio', icon: '⚙️' },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const business = await getBusinessByOwner(user.id);

  return (
    <div className="flex min-h-dvh flex-col bg-cream-100">
      <header className="border-b border-cream-200 bg-white">
        <div className="container-page flex h-(--header-height) items-center gap-4">
          <Link href="/painel" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-linear-to-br from-ember-500 to-ember-700 text-base"
            >
              🍽️
            </span>
            <span className="font-display text-base font-semibold">{platform.name}</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            {business?.published && (
              <Link
                href={`/r/${business.slug}`}
                target="_blank"
                rel="noopener"
                className="hidden rounded-xl border border-cream-200 px-4 py-2 text-sm font-semibold hover:border-ember-400 sm:block"
              >
                Ver cardápio ↗
              </Link>
            )}
            <span className="hidden text-sm text-charcoal-500 md:block">{user.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-charcoal-700 hover:bg-cream-100"
              >
                Sair
              </button>
            </form>
          </div>
        </div>

        {business && (
          <nav aria-label="Seções do painel" className="border-t border-cream-200">
            <ul className="container-page flex gap-1 overflow-x-auto">
              {navigation.map((entry) => (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    className="inline-block whitespace-nowrap px-3 py-3 text-sm font-medium text-charcoal-700 hover:text-ember-600"
                  >
                    <span aria-hidden="true">{entry.icon}</span> {entry.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      <main id="conteudo" className="container-page flex-1 py-10">
        {children}
      </main>
    </div>
  );
}
