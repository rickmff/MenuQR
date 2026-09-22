import { BusinessTabs } from '@/components/painel/business-tabs';
import { PanelHeader, PanelPage } from '@/components/painel/panel-page';
import { demoMode } from '@/lib/demo/config';
import { requireBusiness } from '@/server/auth/guards';

/**
 * "Dados do negócio" é um conjunto de assuntos independentes — identidade,
 * contato, endereço, horário e entrega. Cada um vive numa aba, com o próprio
 * formulário e o próprio salvar.
 */
export default async function BusinessSettingsLayout({ children }: { children: React.ReactNode }) {
  // Só o guarda: quem chega aqui sem restaurante cadastrado volta para o
  // começo. O que falta configurar é assunto do checklist, na tela de
  // compartilhar — repetir a lista dentro de cada aba era dizer duas vezes.
  if (!demoMode) await requireBusiness('/painel/negocio');

  return (
    <PanelPage width="form">
      <PanelHeader
        title="Dados do negócio"
        description="O que aparece no cardápio e as regras do pedido. Cada aba salva sozinha."
      />

      <BusinessTabs />

      {children}
    </PanelPage>
  );
}
