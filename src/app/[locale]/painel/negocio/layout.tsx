import { BusinessTabs } from '@/components/painel/business-tabs';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { demoMode } from '@/lib/demo/config';
import { requireBusiness } from '@/server/auth/guards';
import { getTranslations, setRequestLocale } from 'next-intl/server';

/**
 * "Dados do negócio" é um conjunto de assuntos independentes — identidade,
 * contato, endereço, horário e entrega. Cada um vive numa aba, com o próprio
 * formulário e o próprio salvar.
 */
export default async function BusinessSettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Layouts renderizam em paralelo com a página: cada um fixa o idioma, senão
  // os textos daqui leem o cabeçalho e a rota inteira deixa de ser estática.
  setRequestLocale((await params).locale);
  // Só o guarda: quem chega aqui sem restaurante cadastrado volta para o
  // começo. O que falta configurar é assunto do checklist, na tela de
  // compartilhar — repetir a lista dentro de cada aba era dizer duas vezes.
  if (!demoMode) await requireBusiness('/painel/negocio');
  const t = await getTranslations('painel');

  return (
    <PanelPage width="form">
      <PanelHeader
        title={t('business.title')}
        description={t('business.description')}
      />

      <BusinessTabs />

      {children}
    </PanelPage>
  );
}
