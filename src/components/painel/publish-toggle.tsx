'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { demoMode } from '@/lib/demo/config';
import { demoTogglePublishAction } from '@/lib/demo/actions';
import { togglePublishAction } from '@/server/actions/business';

function SubmitButton({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={published ? 'secondary' : 'primary'} loading={pending}>
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
  if (!published && blockedReason) {
    return (
      <div className="flex flex-col gap-1.5">
        <Button disabled aria-describedby="motivo-publicar">
          Publicar cardápio
        </Button>
        <p id="motivo-publicar" className="text-caption text-gray-600">
          {blockedReason}
        </p>
      </div>
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
