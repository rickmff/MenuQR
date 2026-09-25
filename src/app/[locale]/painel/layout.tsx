import { UserButton } from '@clerk/nextjs';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { DemoShell } from '@/components/demo/demo-shell';
import { demoMode } from '@/lib/demo/config';
import { BillingBanner } from '@/components/painel/billing-banner';
import { billingNotice } from '@/components/painel/billing-notice';
import { PanelShell } from '@/components/painel/panel-shell';
import { SetupWidget } from '@/components/painel/setup-widget';
import { setupProgress } from '@/components/painel/setup-steps';
import { Button } from '@/components/ui/button';
import { ExternalIcon } from '@/components/ui/button-icons';
import { nameOrEmail } from '@/lib/format';
import { requireUser } from '@/server/auth/guards';
import { getBillingAccess } from '@/server/billing/access';
import { getBusinessByOwner } from '@/server/repositories/businesses';
import { getMenu } from '@/server/repositories/menu';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'painel' });
  return { title: t('meta.dashboard'), robots: { index: false, follow: false } };
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Layouts renderizam em paralelo com a página: cada um fixa o idioma, senão
  // os textos daqui leem o cabeçalho e a rota inteira deixa de ser estática.
  setRequestLocale((await params).locale);
  if (demoMode) return <DemoShell>{children}</DemoShell>;

  const user = await requireUser();
  const t = await getTranslations('painel');
  // Sem assinatura em dia o painel fica preso em Assinatura (e Conta): sem
  // abas, sem guia, sem "Ver cardápio". As páginas conferem de novo por conta
  // própria (`requireBusiness`); aqui é só a casca que acompanha.
  const access = await getBillingAccess(user);
  const business = await getBusinessByOwner(user.id);
  const unlocked = Boolean(business) && access.allowed;
  // O guia flutuante precisa do cardápio para saber se já há o que vender.
  const menu = business && unlocked ? await getMenu(business.id) : [];

  return (
    <PanelShell
      nav={unlocked}
      notice={<BillingBanner notice={billingNotice(access)} />}
      floating={
        business &&
        unlocked && <SetupWidget businessId={business.id} progress={setupProgress(business, menu)} />
      }
      actions={
        <>
          {business?.published && unlocked && (
            <div className="hidden sm:block">
              <Button
                href={`/r/${business.slug}`}
                target="_blank"
                rel="noopener"
                variant="secondary"
                size="sm"
                after={<ExternalIcon />}
              >
                {t('shell.viewMenu')}
              </Button>
            </div>
          )}
          {/* Quem está logado, ao lado da foto. O nome sai do nosso banco (o
              Clerk só é consultado na tela de conta); sem nome preenchido,
              vale o começo do e-mail. Some no celular, onde a barra já
              divide espaço com as abas. */}
          <span className="hidden min-w-[8rem] max-w-[10rem] truncate text-body2 font-medium text-gray-700 sm:block text-end">
            {nameOrEmail(user.name, user.email)}
          </span>
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
