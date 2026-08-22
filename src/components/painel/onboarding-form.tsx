'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { demoMode } from '@/lib/demo/config';
import { demoCreateBusinessAction } from '@/lib/demo/actions';
import { createBusinessAction } from '@/server/actions/business';
import type { FormState } from '@/server/actions/business';

const initialState: FormState = {};

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full btn btn-primary"
    >
      {pending ? 'Criando cardápio…' : 'Criar meu cardápio'}
    </button>
  );
}

/** Primeiro passo do lojista: nome, endereço do cardápio e WhatsApp. */
export function OnboardingForm({ siteUrl }: { siteUrl: string }) {
  const [state, formAction] = useActionState(
    demoMode ? demoCreateBusinessAction : createBusinessAction,
    initialState,
  );
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  const currentSlug = slugTouched ? slug : slugify(name);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.error && (
        <p role="alert" className="rounded-xl bg-flame-50 px-4 py-3 text-sm font-medium text-flame-700">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
          Nome do restaurante
        </label>
        <input
          id="name"
          name="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: Cantina da Nona"
          className={inputClass(Boolean(state.fieldErrors?.name))}
        />
        {state.fieldErrors?.name && (
          <p role="alert" className="mt-1 text-xs font-medium text-flame-600">
            {state.fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="slug" className="mb-1.5 block text-sm font-semibold">
          Endereço do cardápio
        </label>
        <div className="flex items-center gap-1 rounded-xl border border-ink-200 bg-white px-4 py-3 focus-within:border-flame-500">
          <span className="shrink-0 text-sm text-ink-500">{siteUrl}/r/</span>
          <input
            id="slug"
            name="slug"
            required
            value={currentSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            placeholder="cantina-da-nona"
            className="w-full bg-transparent text-base outline-none"
          />
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Use letras minúsculas, números e hífens. Dá para mudar depois.
        </p>
        {state.fieldErrors?.slug && (
          <p role="alert" className="mt-1 text-xs font-medium text-flame-600">
            {state.fieldErrors.slug}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="whatsapp" className="mb-1.5 block text-sm font-semibold">
          WhatsApp que recebe os pedidos
        </label>
        <input
          id="whatsapp"
          name="whatsapp"
          inputMode="numeric"
          required
          placeholder="5511987654321"
          className={inputClass(Boolean(state.fieldErrors?.whatsapp))}
        />
        <p className="mt-1 text-xs text-ink-500">
          Somente números, com código do país e DDD. Ex.: 55 11 98765-4321 → 5511987654321
        </p>
        {state.fieldErrors?.whatsapp && (
          <p role="alert" className="mt-1 text-xs font-medium text-flame-600">
            {state.fieldErrors.whatsapp}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="city" className="mb-1.5 block text-sm font-semibold">
          Cidade <span className="font-normal text-ink-500">(opcional)</span>
        </label>
        <input id="city" name="city" placeholder="São Paulo" className={inputClass(false)} />
      </div>

      <SubmitButton />
    </form>
  );
}

function inputClass(invalid: boolean): string {
  return `field-input ${invalid ? 'field-input-invalid' : ''}`;
}
