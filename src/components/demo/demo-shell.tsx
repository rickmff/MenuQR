'use client';


import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DemoBanner } from '@/components/demo/demo-banner';
import { PanelShell } from '@/components/painel/panel-shell';
import { SetupWidget } from '@/components/painel/setup-widget';
import { setupProgress } from '@/components/painel/setup-steps';
import { Button } from '@/components/ui/button';
import { ExternalIcon } from '@/components/ui/button-icons';
import { Container } from '@/components/ui/container';
import { demoLogoutAction } from '@/lib/demo/actions';
import { businessOfUser, currentUser, menuOfBusiness, useDemoState } from '@/lib/demo/store';

/**
 * Casca do painel no modo demonstração: a mesma do painel com banco
 * (`PanelShell`), só que a sessão vem do localStorage em vez do cookie.
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
    return <Container className="py-24 text-center text-gray-600">Carregando seu painel…</Container>;
  }

  const menu = business ? menuOfBusiness(state, business.id) : [];

  return (
    <PanelShell
      nav={Boolean(business)}
      floating={
        business && (
          <SetupWidget businessId={business.id} progress={setupProgress(business, menu)} />
        )
      }
      actions={
        <>
          {business?.published && (
            <div className="hidden sm:block">
              <Button
                href={`/r/${business.slug}`}
                target="_blank"
                rel="noopener"
                variant="secondary"
                size="sm"
                after={<ExternalIcon />}
              >
                Ver cardápio
              </Button>
            </div>
          )}
          <span className="hidden text-body2 text-gray-600 md:block">{user.email}</span>
          <form action={demoLogoutAction}>
            <Button type="submit" variant="text" size="sm" leading={<LogOut className="size-4" />}>
              Sair
            </Button>
          </form>
        </>
      }
    >
      <div className="max-w-panel">
        <DemoBanner />
      </div>
      <div className="mt-6">{children}</div>
    </PanelShell>
  );
}
