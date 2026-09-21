'use client';

import { useFormStatus } from 'react-dom';
import { demoMode } from '@/lib/demo/config';
import { demoTogglePublishAction } from '@/lib/demo/actions';
import { togglePublishAction } from '@/server/actions/business';

function SubmitButton({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        published
          ? 'btn btn-sm btn-outline disabled:opacity-60'
          : 'rounded-md bg-whatsapp-500 px-5 py-2.5 text-body2 font-semibold text-white hover:bg-whatsapp-600 disabled:opacity-60'
      }
    >
      {pending ? 'Salvando…' : published ? 'Despublicar cardápio' : 'Publicar cardápio'}
    </button>
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
      <div className="flex max-w-xs flex-col items-end gap-1.5 text-right">
        <button
          type="button"
          disabled
          aria-describedby="motivo-publicar"
          className="cursor-not-allowed rounded-md bg-ink-200 px-5 py-2.5 text-body2 font-semibold text-ink-500"
        >
          Publicar cardápio
        </button>
        <p id="motivo-publicar" className="text-caption text-ink-500">
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
