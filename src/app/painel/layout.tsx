import { UserButton } from '@clerk/nextjs';
import { ExternalLink } from 'lucide-react';
import { DemoShell } from '@/components/demo/demo-shell';
import { demoMode } from '@/lib/demo/config';
import { PanelShell } from '@/components/painel/panel-shell';
import { SetupWidget } from '@/components/painel/setup-widget';
import { setupProgress } from '@/components/painel/setup-steps';
import { Button } from '@/components/ui/button';
import { requireUser } from '@/server/auth/guards';
import { getBusinessByOwner } from '@/server/repositories/businesses';
import { getMenu } from '@/server/repositories/menu';

export const metadata = {
  title: 'Painel',
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (demoMode) return <DemoShell>{children}</DemoShell>;

  const user = await requireUser();
  const business = await getBusinessByOwner(user.id);
  // O guia flutuante precisa do cardápio para saber se já há o que vender.
  const menu = business ? await getMenu(business.id) : [];

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
                trailing={<ExternalLink aria-hidden="true" className="size-4" />}
              >
                Ver cardápio
              </Button>
            </div>
          )}
          {/* Único caminho para a tela de conta antes de o restaurante existir:
              as abas do painel só aparecem depois do cadastro do negócio. Por
              isso "Gerenciar conta" abre a nossa página, e não o modal do
              Clerk — é lá que fica também a exclusão da conta. */}
          <UserButton userProfileMode="navigation" userProfileUrl="/painel/conta" />
        </>
      }
    >
      {children}
    </PanelShell>
  );
}
