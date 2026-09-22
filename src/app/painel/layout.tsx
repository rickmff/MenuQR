import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { DemoShell } from '@/components/demo/demo-shell';
import { demoMode } from '@/lib/demo/config';
import { DashboardNav } from '@/components/painel/dashboard-nav';
import { platform } from '@/lib/platform';
import { requireUser } from '@/server/auth/guards';
import { getBusinessByOwner } from '@/server/repositories/businesses';

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
            {/* Único caminho para a tela de conta antes de o restaurante existir:
                as abas do painel só aparecem depois do cadastro do negócio. Por
                isso "Gerenciar conta" abre a nossa página, e não o modal do
                Clerk — é lá que fica também a exclusão da conta. */}
            <UserButton userProfileMode="navigation" userProfileUrl="/painel/conta" />
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
