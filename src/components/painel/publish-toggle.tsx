'use client';

import { EyeOff, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { Tooltip } from '@/components/ui/tooltip';
import { demoMode } from '@/lib/demo/config';
import { demoTogglePublishAction } from '@/lib/demo/actions';
import { describePublishBlocker } from '@/lib/menu-utils';
import { useUiText } from '@/lib/use-ui-text';
import { togglePublishAction, type PublishResult } from '@/server/actions/business';

/**
 * Um pouco mais que a saída do sheet de confirmação (200ms): o `<dialog>` modal
 * fica no top layer até sair e cobriria o toast (armadilha 8 do design).
 */
const SHEET_EXIT_MS = 250;

const afterSheetExit = () => new Promise<void>((resolve) => window.setTimeout(resolve, SHEET_EXIT_MS));

export function PublishToggle({
  businessId,
  businessName,
  published,
  blockedReason,
}: {
  businessId: string;
  businessName: string;
  published: boolean;
  /** Por que ainda não dá para publicar. Despublicar nunca é bloqueado. */
  blockedReason?: string | null;
}) {
  const t = useTranslations('painel.publish');
  const toast = useToast();
  const uiText = useUiText();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const feedback = (result: PublishResult, publish: boolean) => {
    if ('success' in result) return { message: t(result.success), tone: 'success' as const };
    const reason = result.error === 'session' ? null : describePublishBlocker(result.error, uiText);
    return { message: reason ?? t(publish ? 'failed' : 'unpublishFailed'), tone: 'error' as const };
  };

  const run = (publish: boolean) => {
    const formData = new FormData();
    formData.set('businessId', businessId);
    formData.set('publish', String(publish));
    const action = demoMode ? demoTogglePublishAction : togglePublishAction;

    startTransition(async () => {
      // Despublicar sai de um sheet: o toast espera ele terminar de fechar.
      const [result] = await Promise.all([action(formData), publish ? undefined : afterSheetExit()]);
      toast(feedback(result, publish));
    });
  };

  // O motivo mora no tooltip: ele só interessa a quem tenta publicar, e fora
  // do hover o botão cinza já diz que ainda não dá.
  if (!published && blockedReason) {
    return (
      <Tooltip label={blockedReason} placement="bottom" align="end">
        <Button aria-disabled="true" leading={<Globe className="size-5" />}>
          {t('publish')}
        </Button>
      </Tooltip>
    );
  }

  if (!published) {
    return (
      <Button loading={pending} onClick={() => run(true)} leading={<Globe className="size-5" />}>
        {t('publish')}
      </Button>
    );
  }

  // Despublicar derruba o link e o QR impresso na hora: pergunta antes, como
  // excluir um item (D24: confirmar à direita, cancelar sempre vale). No demo
  // a promessa é outra: o link publicado carrega o cardápio no endereço, então
  // só este navegador passa a ver "fora do ar" — quem já recebeu o link
  // continua abrindo, e a pergunta não pode dizer que ele para na hora.
  return (
    <>
      <Button
        variant="secondary"
        loading={pending}
        onClick={() => setConfirming(true)}
        leading={<EyeOff className="size-5" />}
      >
        {t('unpublish')}
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t('confirmTitle', { name: businessName })}
        description={t(demoMode ? 'confirmTextDemo' : 'confirmText')}
        confirmLabel={t('confirmLabel')}
        onConfirm={() => run(false)}
      />
    </>
  );
}
