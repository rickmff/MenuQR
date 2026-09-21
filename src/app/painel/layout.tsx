import Link from 'next/link';
import { DemoShell } from '@/components/demo/demo-shell';
import { demoMode } from '@/lib/demo/config';
import { DashboardNav } from '@/components/painel/dashboard-nav';
import { platform } from '@/lib/platform';
import { requireUser } from '@/server/auth/guards';
import { getBusinessByOwner } from '@/server/repositories/businesses';
import { logoutAction } from '@/server/actions/auth';

export const metadata = {
  title: 'Painel',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (demoMode) return <DemoShell>{children}</DemoShell>;

  const user = await requireUser();
  const business = await getBusinessByOwner(user.id);

  return (
    <div className="flex min-h-dvh flex-col bg-ink-100">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl">
        <div className="container-page flex h-(--header-height) items-center gap-4">
          <Link href="/painel" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-md bg-ink-950 text-body1 text-ink-50"
            >
              ◍
            </span>
            <span className="font-display text-body1 font-semibold tracking-tight">{platform.name}</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            {business?.published && (
              <Link
                href={`/r/${business.slug}`}
                target="_blank"
                rel="noopener"
                className="btn btn-sm btn-outline hidden sm:inline-flex"
              >
                Ver cardápio ↗
              </Link>
            )}
            <span className="hidden text-body2 text-ink-500 md:block">{user.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full px-3 py-2 text-body2 font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-950"
              >
                Sair
              </button>
            </form>
          </div>
        </div>

        {business && <DashboardNav />}
      </header>

      <main id="conteudo" className="container-page flex-1 py-12">
        {children}
      </main>
    </div>
  );
}
