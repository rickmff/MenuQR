'use client';

import { useFormStatus } from 'react-dom';
import { togglePublishAction } from '@/server/actions/business';

function SubmitButton({ published }: { published: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={
        published
          ? 'rounded-xl border border-cream-200 bg-white px-5 py-2.5 text-sm font-semibold hover:border-ember-400 disabled:opacity-60'
          : 'rounded-xl bg-whatsapp-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-whatsapp-600 disabled:opacity-60'
      }
    >
      {pending ? 'Salvando…' : published ? 'Despublicar cardápio' : 'Publicar cardápio'}
    </button>
  );
}

export function PublishToggle({ businessId, published }: { businessId: string; published: boolean }) {
  return (
    <form action={togglePublishAction}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="publish" value={published ? 'false' : 'true'} />
      <SubmitButton published={published} />
    </form>
  );
}
