'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { saveItemAction } from '@/server/actions/menu';
import type { FormState } from '@/server/actions/business';
import type { MenuCategory, MenuItem, OptionType } from '@/lib/types';

const initialState: FormState = {};

interface ChoiceDraft {
  key: string;
  name: string;
  price: string;
}

interface GroupDraft {
  key: string;
  name: string;
  type: OptionType;
  required: boolean;
  max: string;
  choices: ChoiceDraft[];
}

let counter = 0;
const nextKey = () => {
  counter += 1;
  return `k${counter}`;
};

function toDrafts(item?: MenuItem): GroupDraft[] {
  return (item?.options ?? []).map((group) => ({
    key: nextKey(),
    name: group.name,
    type: group.type,
    required: group.required,
    max: group.max ? String(group.max) : '',
    choices: group.choices.map((choice) => ({
      key: nextKey(),
      name: choice.name,
      price: choice.price ? String(choice.price) : '',
    })),
  }));
}

function SubmitButton({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-ember-500 px-6 py-3 font-semibold text-white hover:bg-ember-600 disabled:bg-cream-200 disabled:text-charcoal-500"
    >
      {pending ? 'Salvando…' : isNew ? 'Adicionar ao cardápio' : 'Salvar item'}
    </button>
  );
}

/** Formulário de item, incluindo o editor de complementos. */
export function ItemForm({
  businessId,
  categories,
  item,
  defaultCategoryId,
}: {
  businessId: string;
  categories: MenuCategory[];
  item?: MenuItem;
  defaultCategoryId?: string;
}) {
  const [state, formAction] = useActionState(saveItemAction, initialState);
  const [groups, setGroups] = useState<GroupDraft[]>(() => toDrafts(item));

  const error = (field: string) => state.fieldErrors?.[field];

  // O editor envia os complementos como JSON num campo oculto.
  const optionsPayload = JSON.stringify(
    groups
      .filter((group) => group.name.trim() && group.choices.some((choice) => choice.name.trim()))
      .map((group) => ({
        name: group.name.trim(),
        type: group.type,
        required: group.required,
        max: group.type === 'multi' && group.max ? Number(group.max) : null,
        choices: group.choices
          .filter((choice) => choice.name.trim())
          .map((choice) => ({
            name: choice.name.trim(),
            price: Number(String(choice.price).replace(',', '.')) || 0,
          })),
      })),
  );

  const addGroup = () =>
    setGroups((current) => [
      ...current,
      {
        key: nextKey(),
        name: '',
        type: 'single',
        required: false,
        max: '',
        choices: [{ key: nextKey(), name: '', price: '' }],
      },
    ]);

  const updateGroup = (key: string, patch: Partial<GroupDraft>) =>
    setGroups((current) => current.map((group) => (group.key === key ? { ...group, ...patch } : group)));

  const removeGroup = (key: string) =>
    setGroups((current) => current.filter((group) => group.key !== key));

  const addChoice = (groupKey: string) =>
    setGroups((current) =>
      current.map((group) =>
        group.key === groupKey
          ? { ...group, choices: [...group.choices, { key: nextKey(), name: '', price: '' }] }
          : group,
      ),
    );

  const updateChoice = (groupKey: string, choiceKey: string, patch: Partial<ChoiceDraft>) =>
    setGroups((current) =>
      current.map((group) =>
        group.key === groupKey
          ? {
              ...group,
              choices: group.choices.map((choice) =>
                choice.key === choiceKey ? { ...choice, ...patch } : choice,
              ),
            }
          : group,
      ),
    );

  const removeChoice = (groupKey: string, choiceKey: string) =>
    setGroups((current) =>
      current.map((group) =>
        group.key === groupKey
          ? { ...group, choices: group.choices.filter((choice) => choice.key !== choiceKey) }
          : group,
      ),
    );

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="businessId" value={businessId} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      <input type="hidden" name="options" value={optionsPayload} />

      {state.error && (
        <p role="alert" className="rounded-xl bg-ember-50 px-4 py-3 text-sm font-medium text-ember-700">
          {state.error}
        </p>
      )}

      <section className="rounded-card border border-cream-200 bg-white p-6">
        <h2 className="font-display text-lg font-semibold">Dados do item</h2>

        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" htmlFor="name" error={error('name')}>
              <input
                id="name"
                name="name"
                required
                defaultValue={item?.name}
                placeholder="Ex.: Brasa Classic"
                className={inputClass(!!error('name'))}
              />
            </Field>

            <Field label="Categoria" htmlFor="categoryId" error={error('categoryId')}>
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={item?.categoryId ?? defaultCategoryId ?? categories[0]?.id}
                className={inputClass(!!error('categoryId'))}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Descrição" htmlFor="description" hint="Ingredientes e o que torna o prato especial.">
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={item?.description}
              className={inputClass(false)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Preço (R$)" htmlFor="price" error={error('price')}>
              <input
                id="price"
                name="price"
                inputMode="decimal"
                required
                defaultValue={item ? String(item.price) : ''}
                placeholder="29.90"
                className={inputClass(!!error('price'))}
              />
            </Field>

            <Field label="Imagem" htmlFor="image" hint="Emoji ou URL de foto.">
              <input id="image" name="image" defaultValue={item?.image ?? '🍽️'} className={inputClass(false)} />
            </Field>

            <Field label="Serve" htmlFor="serves" hint="Ex.: 1 pessoa">
              <input id="serves" name="serves" defaultValue={item?.serves} className={inputClass(false)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Etiquetas" htmlFor="tags" hint="Separadas por vírgula.">
              <input
                id="tags"
                name="tags"
                defaultValue={item?.tags.join(', ')}
                placeholder="Mais vendido, Vegetariano"
                className={inputClass(false)}
              />
            </Field>

            <Field label="Alérgenos" htmlFor="allergens" hint="Separados por vírgula.">
              <input
                id="allergens"
                name="allergens"
                defaultValue={item?.allergens.join(', ')}
                placeholder="Glúten, Leite"
                className={inputClass(false)}
              />
            </Field>

            <Field label="Calorias" htmlFor="calories" hint="Opcional.">
              <input
                id="calories"
                name="calories"
                inputMode="numeric"
                defaultValue={item?.calories ?? ''}
                className={inputClass(false)}
              />
            </Field>
          </div>

          <Field label="Texto alternativo da imagem" htmlFor="imageAlt" hint="Descreve a foto para leitores de tela e para o Google.">
            <input id="imageAlt" name="imageAlt" defaultValue={item?.imageAlt} className={inputClass(false)} />
          </Field>

          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              name="available"
              defaultChecked={item ? item.available : true}
              className="size-5 accent-ember-500"
            />
            Disponível para pedido
          </label>
        </div>
      </section>

      <section className="rounded-card border border-cream-200 bg-white p-6">
        <h2 className="font-display text-lg font-semibold">Complementos</h2>
        <p className="mb-5 mt-1 text-sm text-charcoal-500">
          Grupos de escolha do cliente: ponto da carne, tamanho, adicionais pagos. Deixe vazio se o item
          não tiver variações.
        </p>

        {error('options') && (
          <p role="alert" className="mb-4 rounded-xl bg-ember-50 px-4 py-3 text-sm font-medium text-ember-700">
            {error('options')}
          </p>
        )}

        <div className="space-y-4">
          {groups.map((group) => (
            <fieldset key={group.key} className="rounded-xl border border-cream-200 p-4">
              <legend className="px-2 text-sm font-semibold">Grupo de complementos</legend>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1">
                  <label className="mb-1.5 block text-xs font-semibold">Nome do grupo</label>
                  <input
                    value={group.name}
                    onChange={(event) => updateGroup(group.key, { name: event.target.value })}
                    placeholder="Ponto da carne"
                    className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-base outline-none focus:border-ember-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold">Tipo</label>
                  <select
                    value={group.type}
                    onChange={(event) =>
                      updateGroup(group.key, { type: event.target.value as OptionType })
                    }
                    className="rounded-xl border border-cream-200 px-3 py-2.5 text-base outline-none focus:border-ember-500"
                  >
                    <option value="single">Escolher uma</option>
                    <option value="multi">Escolher várias</option>
                  </select>
                </div>

                {group.type === 'multi' && (
                  <div className="w-28">
                    <label className="mb-1.5 block text-xs font-semibold">Máximo</label>
                    <input
                      value={group.max}
                      onChange={(event) => updateGroup(group.key, { max: event.target.value })}
                      inputMode="numeric"
                      placeholder="4"
                      className="w-full rounded-xl border border-cream-200 px-3 py-2.5 text-base outline-none focus:border-ember-500"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 pb-3 text-sm">
                  <input
                    type="checkbox"
                    checked={group.required}
                    onChange={(event) => updateGroup(group.key, { required: event.target.checked })}
                    className="size-5 accent-ember-500"
                  />
                  Obrigatório
                </label>

                <button
                  type="button"
                  onClick={() => removeGroup(group.key)}
                  className="pb-3 text-sm text-charcoal-500 hover:text-ember-600"
                >
                  Remover grupo
                </button>
              </div>

              <ul className="mt-4 space-y-2">
                {group.choices.map((choice) => (
                  <li key={choice.key} className="flex flex-wrap items-center gap-2 rounded-lg bg-cream-100 p-2">
                    <input
                      value={choice.name}
                      onChange={(event) => updateChoice(group.key, choice.key, { name: event.target.value })}
                      placeholder="Opção (ex.: Bacon crocante)"
                      aria-label="Nome da opção"
                      className="min-w-40 flex-1 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm"
                    />
                    <input
                      value={choice.price}
                      onChange={(event) => updateChoice(group.key, choice.key, { price: event.target.value })}
                      placeholder="Acréscimo (R$)"
                      inputMode="decimal"
                      aria-label="Preço adicional"
                      className="w-36 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeChoice(group.key, choice.key)}
                      className="rounded-lg px-3 py-2 text-sm text-charcoal-500 hover:text-ember-600"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => addChoice(group.key)}
                className="mt-3 rounded-lg border border-cream-200 bg-white px-3 py-2 text-sm font-semibold hover:border-ember-400"
              >
                + Opção
              </button>
            </fieldset>
          ))}
        </div>

        <button
          type="button"
          onClick={addGroup}
          className="mt-4 rounded-xl border border-cream-200 px-5 py-3 font-semibold hover:border-ember-400"
        >
          + Grupo de complementos
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton isNew={!item} />
        <Link href="/painel/cardapio" className="text-sm text-charcoal-500 hover:text-charcoal-900">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-charcoal-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-ember-600">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return [
    'w-full rounded-xl border bg-white px-4 py-3 text-base outline-none transition-colors focus:border-ember-500',
    invalid ? 'border-ember-500' : 'border-cream-200',
  ].join(' ');
}
