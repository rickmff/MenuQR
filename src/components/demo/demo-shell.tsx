'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardNav } from '@/components/painel/dashboard-nav';
import { DemoBanner } from '@/components/demo/demo-banner';
import { platform } from '@/lib/platform';
import { demoLogoutAction } from '@/lib/demo/actions';
import { businessOfUser, currentUser, useDemoState } from '@/lib/demo/store';

/**
 * Casca do painel no modo demonstração: mesma navegação da versão real, mas a
 * sessão vem do localStorage em vez do cookie.
 */
export function DemoShell({ children }: { children: React.ReactNode }) {
  const state = useDemoState();
  const router = useRouter();
  const user = currentUser(state);
  const business = businessOfUser(state, user?.id ?? null);

  // Só decide depois de ler o localStorage: antes disso o estado é vazio.
  useEffect(() => {
    if (state.ready && !user) router.replace('/entrar?proximo=%2Fpainel');
  }, [state.ready, user, router]);

  if (!user) {
    return (
      <div className="container-page py-24 text-center text-ink-500">Carregando seu painel…</div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-ink-100">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl">
        <div className="container-page flex h-(--header-height) items-center gap-4">
          <Link href="/painel" className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-ink-950 text-base text-ink-50"
            >
              ◍
            </span>
            <span className="font-display text-base font-semibold tracking-tight">{platform.name}</span>
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
            <span className="hidden text-sm text-ink-500 md:block">{user.email}</span>
            <form action={demoLogoutAction}>
              <button
                type="submit"
                className="rounded-full px-3 py-2 text-sm font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-950"
              >
                Sair
              </button>
            </form>
          </div>
        </div>

        {business && <DashboardNav />}
      </header>

      <main id="conteudo" className="container-page flex-1 py-8">
        <DemoBanner />
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
