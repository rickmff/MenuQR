import { BusinessTabs } from '@/components/painel/business-tabs';
import { OnboardingGuide } from '@/components/painel/onboarding-guide';
import { demoMode } from '@/lib/demo/config';
import { requireBusiness } from '@/server/auth/guards';

/**
 * "Dados do negócio" é um conjunto de assuntos independentes — identidade,
 * contato, endereço, horário, entrega e pagamento. Cada um vive numa aba, com o
 * próprio formulário e o próprio salvar.
 */
export default async function BusinessSettingsLayout({ children }: { children: React.ReactNode }) {
  // No modo demonstração o negócio vive no navegador: o guia é montado pela página.
  const businessId = demoMode ? null : (await requireBusiness('/painel/negocio')).business.id;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-h4 font-bold text-gray-700">Dados do negócio</h1>
      <p className="mt-2 text-body1 text-gray-600">
        O que aparece no cardápio e as regras do pedido. Cada aba salva sozinha.
      </p>

      <div className="mt-6">
        <OnboardingGuide businessId={businessId ?? undefined} />
      </div>

      <div className="mt-6">
        <BusinessTabs />
      </div>

      <div className="mt-6">{children}</div>
    </div>
  );
}
