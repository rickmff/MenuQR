'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ContactSection } from '@/components/painel/business-form/contact-section';
import { DeliverySection } from '@/components/painel/business-form/delivery-section';
import { HoursSection } from '@/components/painel/business-form/hours-section';
import { IdentitySection } from '@/components/painel/business-form/identity-section';
import { usePanelBottomBar } from '@/components/painel/bottom-inset';
import type { BusinessSection } from '@/components/painel/business-sections';
import { leaveTo, useLeaveGuard } from '@/components/painel/leave-guard';
import { continueAfter, type SetupStep, type SetupTarget } from '@/components/painel/setup-steps';
import { useFormAction } from '@/components/use-form-action';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { demoMode } from '@/lib/demo/config';
import { demoUpdateBusinessSectionAction } from '@/lib/demo/actions';
import { updateBusinessSectionAction, type FormState } from '@/server/actions/business';
import type { Business, MenuCategory } from '@/lib/types';

const initialState: FormState = {};

/**
 * Uma aba de "Dados do negócio". Cada aba é um formulário próprio e salva só os
 * campos que mostra — ver `updateBusinessSectionAction`. Os campos de cada aba
 * moram em `business-form/*`; aqui ficam o que as quatro dividem: o envio, o
 * retorno, a barra de salvar e o encadeamento.
 *
 * **Encadeamento.** Enquanto falta configurar alguma coisa, salvar leva ao
 * próximo passo — o mesmo que o guia aponta (`continueAfter`, a regra única de
 * "próximo passo") —, e o botão diz para onde: "Salvar e ir para os horários".
 * Não depende de o guia estar aberto: recolher a lista é "não quero ver isto
 * agora", não "não quero terminar". Tudo configurado, leva a publicar enquanto
 * o cardápio for rascunho; publicado, salvar é só salvar.
 *
 * O rótulo é uma PREVISÃO, feita com o que estava gravado antes do salvar. Quem
 * decide para onde ir é o servidor, com o negócio já salvo (`result.next`): a
 * semana salva toda fechada continua pendente, e aí a aba fica onde está com
 * "Alterações salvas." em vez de pular para o passo seguinte.
 */
export function BusinessForm({
  business,
  menu,
  section,
  siteUrl,
}: {
  business: Business;
  /** O cardápio gravado: o próximo passo pode ser ele (o primeiro item). */
  menu: MenuCategory[];
  section: BusinessSection;
  siteUrl: string;
}) {
  const t = useTranslations('painel.businessForm');
  const tSections = useTranslations('painel.sections');
  const tDestination = useTranslations('painel.setup.destination');
  const router = useRouter();
  const toast = useToast();

  // Previsão, com o que estava gravado ANTES deste salvar (ver `continueAfter`).
  const target = continueAfter(business, menu, section);
  const formRef = useRef<HTMLFormElement>(null);

  /*
   * A confirmação sai num toast ANTES de trocar de tela: o aviso que morava no
   * formulário sumia com ele em ~50ms, e o lojista não sabia se tinha salvado
   * nem por que estava em outra aba. O toast vive na casca do painel e
   * atravessa a navegação. Fica no envio, e não num efeito, como no item.
   */
  const { state, formProps, pending, isEdited, edited, dirty, markEdited } = useFormAction(
    async (previous: FormState, formData: FormData) => {
      const result = await (demoMode ? demoUpdateBusinessSectionAction : updateBusinessSectionAction)(
        previous,
        formData,
      );
      if (result.success) {
        // O destino do servidor, quando ele manda um; senão, a previsão.
        const next = 'next' in result ? (result.next ?? null) : target;
        if (next) {
          toast({ message: t('savedNext', { destination: tDestination(destinationKey(next)) }), tone: 'success' });
          leaveTo(router, next.href);
        }
      }
      return result;
    },
    initialState,
    formRef,
  );

  // Campo mexido, ou foto enviada e não salva: abas, links e guia perguntam antes de sair.
  useLeaveGuard(dirty);

  const barRef = useRef<HTMLDivElement>(null);
  usePanelBottomBar(barRef);

  // Salvar com a logo ou a capa ainda subindo gravaria a imagem antiga sem avisar ninguém.
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const uploading = uploadingLogo || uploadingCover;

  /*
   * O erro de um campo que o lojista já mexeu depois da resposta não vale
   * mais. Os campos que não emitem o próprio nome (horários, interruptores,
   * foto, taxa de um bairro) avisam pelo nome do erro via `markEdited`.
   */
  const error = (field: string) => (isEdited(field) ? undefined : state.fieldErrors?.[field]);
  const hasFieldErrors = Boolean(state.fieldErrors && Object.keys(state.fieldErrors).length > 0);

  /*
   * Sem isto o lojista salva, o erro aparece fora da tela e nada parece ter
   * acontecido. Vai até o primeiro na ordem da tela: o campo recusado
   * (`aria-invalid`) — não a mensagem, que fica depois dele — ou o aviso de
   * uma regra que não mora num campo.
   */
  useEffect(() => {
    if (!hasFieldErrors) return;
    formRef.current
      ?.querySelector('[aria-invalid="true"], [data-field-error]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [state, hasFieldErrors]);

  const saveLabel = target ? t(`saveAndGoTo.${destinationKey(target)}`) : t('save');

  return (
    <form {...formProps} className="space-y-6" noValidate>
      <input type="hidden" name="businessId" value={business.id} />
      <input type="hidden" name="section" value={section} />

      <Card padding="md">
        <h2 className="text-subtitle font-bold text-gray-700">{tSections(`${section}.title`)}</h2>
        <p className="mb-5 mt-1 text-body2 text-gray-600">{tSections(`${section}.description`)}</p>

        <div className="space-y-4">
          {section === 'identidade' && (
            <IdentitySection
              business={business}
              siteUrl={siteUrl}
              error={error}
              markEdited={markEdited}
              onLogoBusy={setUploadingLogo}
              onCoverBusy={setUploadingCover}
            />
          )}

          {section === 'contato' && <ContactSection business={business} error={error} markEdited={markEdited} />}

          {section === 'horarios' && <HoursSection business={business} error={error} markEdited={markEdited} />}

          {section === 'entrega' && (
            <DeliverySection business={business} error={error} isEdited={isEdited} markEdited={markEdited} />
          )}
        </div>
      </Card>

      {/* O retorno do salvamento mora junto do botão, que é o que está na tela. */}
      {/* Fundo sólido: flutuando sobre o texto, o botão ficava ilegível. */}
      {/* A camada é declarada: `sticky` sozinho não ganha de conteúdo posicionado. */}
      <div
        ref={barRef}
        className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-end gap-3 bg-gray-50 px-1 py-4"
      >
        {/* Mexeu depois da resposta: o "não foi salvo" e o "salvo" daquele envio já não descrevem a tela. */}
        {state.error && !edited && (
          <Banner tone="error" role="alert">
            {state.error}
          </Banner>
        )}
        {/* Cada campo recusado já se anuncia (`role="alert"` no erro dele):
            a faixa é só o resumo, e não repete o anúncio. */}
        {hasFieldErrors && !edited && (
          <Banner tone="error" role="status">
            {t('notSaved')}
          </Banner>
        )}
        {state.success && !pending && !edited && (
          <Banner tone="success" role="status" icon={<Check className="size-4" />}>
            {state.success}
          </Banner>
        )}
        {/* Abaixo de `sm` o botão ocupa a linha inteira: o `Button` não encolhe
            (`shrink-0`), e na largura natural o rótulo com destino saía pela
            borda esquerda a 320px. Com a largura presa, o rótulo mais longo
            ("Salvar e ir para a identidade", 188px) cabe nos 192px que sobram
            a 320px, e o `truncate` do rótulo passa a valer se um dia não couber. */}
        <Button
          type="submit"
          loading={pending}
          disabled={uploading}
          leading={<Check className="size-5" />}
          after={target ? <NavIcon /> : undefined}
          className="w-full sm:w-auto"
        >
          {saveLabel}
        </Button>
      </div>
    </form>
  );
}

/** A chave do destino em `painel.setup.destination` e em `saveAndGoTo`. */
function destinationKey(target: SetupTarget): 'publicar' | SetupStep {
  return target.kind === 'publish' ? 'publicar' : target.step;
}
