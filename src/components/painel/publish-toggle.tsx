'use client';

import { EyeOff, Globe } from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { demoMode } from '@/lib/demo/config';
import { demoTogglePublishAction } from '@/lib/demo/actions';
import { togglePublishAction } from '@/server/actions/business';

function SubmitButton({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={published ? 'secondary' : 'primary'}
      loading={pending}
      leading={published ? <EyeOff className="size-5" /> : <Globe className="size-5" />}
    >
      {published ? 'Despublicar' : 'Publicar cardápio'}
    </Button>
  );
}

export function PublishToggle({
  businessId,
  published,
  blockedReason,
}: {
  businessId: string;
  published: boolean;
  /** Por que ainda não dá para publicar. Despublicar nunca é bloqueado. */
  blockedReason?: string | null;
}) {
  // O motivo mora no tooltip: ele só interessa a quem tenta publicar, e fora
  // do hover o botão cinza já diz que ainda não dá.
  if (!published && blockedReason) {
    return (
      <Tooltip label={blockedReason} placement="bottom" align="end">
        <Button aria-disabled="true" leading={<Globe className="size-5" />}>
          Publicar cardápio
        </Button>
      </Tooltip>
    );
  }

  return (
    <form action={demoMode ? demoTogglePublishAction : togglePublishAction}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="publish" value={published ? 'false' : 'true'} />
      <SubmitButton published={published} />
    </form>
  );
}
