'use client';

import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { ImageField } from '@/components/painel/image-field';
import { useFormAction } from '@/components/use-form-action';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/cn';
import { demoMode } from '@/lib/demo/config';
import { demoDeleteItemAction, demoSaveItemAction } from '@/lib/demo/actions';
import { deleteItemAction, saveItemAction } from '@/server/actions/menu';
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

/** Exemplo no campo vazio, conforme o tipo do grupo. */
const GROUP_PLACEHOLDER: Record<OptionType, string> = {
  single: 'Ponto da carne',
  multi: 'Adicionais',
  remove: 'Retirar ingredientes',
};
const CHOICE_PLACEHOLDER: Record<OptionType, string> = {
  single: 'Ao ponto',
  multi: 'Bacon crocante',
  remove: 'Sem cebola',
};
/** Rótulo da opção conforme o tipo do grupo: no "retirar", cada opção é um ingrediente. */
const CHOICE_LABEL: Record<OptionType, string> = {
  single: 'Opção',
  multi: 'Opção',
  remove: 'Ingrediente',
};

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
  const { state, formProps, pending } = useFormAction(
    demoMode ? demoSaveItemAction : saveItemAction,
    initialState,
  );
  const [groups, setGroups] = useState<GroupDraft[]>(() => toDrafts(item));
  // Salvar com a foto ainda subindo gravaria a imagem antiga sem avisar ninguém.
  const [uploading, setUploading] = useState(false);
  // Ids dos campos de complemento vêm daqui e do índice, nunca de `nextKey()`:
  // o contador do módulo não zera entre requisições no servidor, e o id
  // gerado lá não bateria com o do navegador na hidratação.
  const ids = useId();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  const error = (field: string) => state.fieldErrors?.[field];
  const hasFieldErrors = Boolean(state.fieldErrors && Object.keys(state.fieldErrors).length > 0);

  // A exclusão não passa pelo <form> do item: é outra ação, disparada depois
  // da confirmação. Ao terminar, a lista já vem sem o item.
  const removeItem = () => {
    if (!item) return;
    const formData = new FormData();
    formData.set('businessId', businessId);
    formData.set('itemId', item.id);
    startDelete(async () => {
      await (demoMode ? demoDeleteItemAction : deleteItemAction)(formData);
      router.push('/painel/cardapio');
    });
  };

  // O editor envia os complementos como JSON num campo oculto.
  const optionsPayload = JSON.stringify(
    groups
      .filter((group) => group.name.trim() && group.choices.some((choice) => choice.name.trim()))
      .map((group) => ({
        name: group.name.trim(),
        type: group.type,
        required: group.required,
        max: group.type !== 'single' && group.max ? Number(group.max) : null,
        choices: group.choices
          .filter((choice) => choice.name.trim())
          .map((choice) => ({
            name: choice.name.trim(),
            // Tirar um ingrediente não tem preço.
            price: group.type === 'remove' ? 0 : Number(String(choice.price).replace(',', '.')) || 0,
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
    <>
    <form {...formProps} className="space-y-6" noValidate>
      <input type="hidden" name="businessId" value={businessId} />
      {item && <input type="hidden" name="itemId" value={item.id} />}
      <input type="hidden" name="options" value={optionsPayload} />

      <section className="surface p-6">
        <h2 className="font-display text-subtitle font-semibold">Dados do item</h2>

        <div className="mt-5 space-y-4">
          {/* Nome e preço na mesma linha em qualquer largura: o nome fica com o que sobra, o preço é curto. */}
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
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

            <Field label="Preço (R$)" htmlFor="price" error={error('price')}>
              <input
                id="price"
                name="price"
                inputMode="decimal"
                required
                defaultValue={item ? String(item.price) : ''}
                placeholder="29,90"
                className={inputClass(!!error('price'))}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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

            <Field label="Serve" htmlFor="serves" hint="Ex.: 1 pessoa">
              <input id="serves" name="serves" defaultValue={item?.serves} className={inputClass(false)} />
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

          {/* Só o quadro, sem rótulo. Item novo começa vazio: o servidor grava o emoji padrão ao salvar. */}
          <ImageField
            id="image"
            name="image"
            label="Foto do prato"
            businessId={businessId}
            defaultValue={item?.image ?? ''}
            error={error('image')}
            onBusyChange={setUploading}
          />

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

            <Field label="Calorias" htmlFor="calories" hint="Opcional." error={error('calories')}>
              <input
                id="calories"
                name="calories"
                inputMode="numeric"
                defaultValue={item?.calories ?? ''}
                className={inputClass(!!error('calories'))}
              />
            </Field>
          </div>

          <Field label="Texto alternativo da imagem" htmlFor="imageAlt" hint="Descreve a foto para leitores de tela e para o Google.">
            <input id="imageAlt" name="imageAlt" defaultValue={item?.imageAlt} className={inputClass(false)} />
          </Field>

          <label className="flex items-center gap-2.5 text-body2 font-medium">
            <input
              type="checkbox"
              name="available"
              defaultChecked={item ? item.available : true}
              className="size-5 accent-flame-500"
            />
            Disponível para pedido
          </label>
        </div>
      </section>

      <section className="surface p-6">
        <h2 className="font-display text-subtitle font-semibold">Complementos</h2>
        <p className="mb-5 mt-1 text-body2 text-ink-500">
          Grupos de escolha do cliente: ponto da carne, tamanho, adicionais pagos (o cliente escolhe a
          quantidade de cada um) e ingredientes que dá para tirar. Deixe vazio se o item não tiver
          variações.
        </p>

        {error('options') && (
          <p role="alert" className="mb-4 rounded-md bg-flame-50 px-4 py-3 text-body2 font-medium text-flame-700">
            {error('options')}
          </p>
        )}

        <div className="space-y-4">
          {groups.map((group, groupIndex) => (
            <fieldset key={group.key} className="rounded-md border border-ink-200 p-4">
              <legend className="px-2 text-body2 font-semibold">Grupo de complementos</legend>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1">
                  <label htmlFor={`${ids}g${groupIndex}-name`} className="mb-1.5 block text-caption font-semibold">
                    Nome do grupo
                  </label>
                  <input
                    id={`${ids}g${groupIndex}-name`}
                    value={group.name}
                    onChange={(event) => updateGroup(group.key, { name: event.target.value })}
                    placeholder={GROUP_PLACEHOLDER[group.type]}
                    className="field-input"
                  />
                </div>

                <div>
                  <label htmlFor={`${ids}g${groupIndex}-type`} className="mb-1.5 block text-caption font-semibold">
                    Tipo
                  </label>
                  <select
                    id={`${ids}g${groupIndex}-type`}
                    value={group.type}
                    onChange={(event) =>
                      updateGroup(group.key, { type: event.target.value as OptionType })
                    }
                    className="field-input w-auto"
                  >
                    <option value="single">Escolher uma</option>
                    <option value="multi">Escolher várias, com quantidade</option>
                    <option value="remove">Retirar ingredientes</option>
                  </select>
                </div>

                {group.type !== 'single' && (
                  <div className="w-28">
                    <label htmlFor={`${ids}g${groupIndex}-max`} className="mb-1.5 block text-caption font-semibold">
                      Máximo
                    </label>
                    <input
                      id={`${ids}g${groupIndex}-max`}
                      value={group.max}
                      onChange={(event) => updateGroup(group.key, { max: event.target.value })}
                      inputMode="numeric"
                      placeholder="4"
                      className="field-input"
                    />
                  </div>
                )}

                <label className="flex items-center gap-2 pb-3 text-body2">
                  <input
                    type="checkbox"
                    checked={group.required}
                    onChange={(event) => updateGroup(group.key, { required: event.target.checked })}
                    className="size-5 accent-flame-500"
                  />
                  Obrigatório
                </label>

                <button
                  type="button"
                  onClick={() => removeGroup(group.key)}
                  className="pb-3 text-body2 text-ink-500 hover:text-flame-600"
                >
                  Remover grupo
                </button>
              </div>

              <ul className="mt-4 space-y-2">
                {group.choices.map((choice, choiceIndex) => (
                  <li key={choice.key} className="flex flex-wrap items-end gap-3 rounded-sm bg-ink-100 p-3">
                    <div className="min-w-40 flex-1">
                      <label htmlFor={`${ids}g${groupIndex}c${choiceIndex}-name`} className="mb-1.5 block text-caption font-semibold">
                        {CHOICE_LABEL[group.type]}
                      </label>
                      <input
                        id={`${ids}g${groupIndex}c${choiceIndex}-name`}
                        value={choice.name}
                        onChange={(event) => updateChoice(group.key, choice.key, { name: event.target.value })}
                        placeholder={CHOICE_PLACEHOLDER[group.type]}
                        className="field-input py-2 text-body2"
                      />
                    </div>
                    {/* Tirar ingrediente não tem preço: o campo sai para não sugerir cobrança. */}
                    {group.type !== 'remove' && (
                      <div className="w-36">
                        <label htmlFor={`${ids}g${groupIndex}c${choiceIndex}-price`} className="mb-1.5 block text-caption font-semibold">
                          Acréscimo (R$)
                        </label>
                        <input
                          id={`${ids}g${groupIndex}c${choiceIndex}-price`}
                          value={choice.price}
                          onChange={(event) => updateChoice(group.key, choice.key, { price: event.target.value })}
                          placeholder="0,00"
                          inputMode="decimal"
                          className="field-input py-2 text-body2"
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeChoice(group.key, choice.key)}
                      className="rounded-sm px-3 py-2 text-body2 text-ink-500 hover:text-flame-600"
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => addChoice(group.key)}
                className="mt-3 btn btn-sm btn-outline"
              >
                + Opção
              </button>
            </fieldset>
          ))}
        </div>

        <button
          type="button"
          onClick={addGroup}
          className="mt-4 btn btn-outline"
        >
          + Grupo de complementos
        </button>
      </section>

      {/* Mesma barra do formulário do negócio: o retorno do salvamento mora
          junto do botão, que é o que está na tela; fundo sólido para o botão
          não flutuar sobre texto; camada declarada porque `sticky` sozinho não
          ganha de conteúdo posicionado. Excluir fica à esquerda, longe de
          Salvar; a ação principal é a última à direita. */}
      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 bg-gray-50 px-1 py-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {hasFieldErrors && !state.error && <Alert tone="error">Não foi salvo: revise o campo destacado.</Alert>}
        {item && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => setConfirmDelete(true)}
            className="press inline-flex h-12 shrink-0 items-center gap-2 rounded-sm px-3 text-body2 font-semibold text-gray-600 hover:bg-gray-100 hover:text-error active:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400"
          >
            <Trash2 aria-hidden="true" className="size-5" />
            {deleting ? 'Excluindo…' : 'Excluir item'}
          </button>
        )}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          <Button variant="text" href="/painel/cardapio">
            Cancelar
          </Button>
          <Button type="submit" loading={pending} disabled={uploading || deleting}>
            {item ? 'Salvar alterações' : 'Adicionar ao cardápio'}
          </Button>
        </div>
      </div>
    </form>

    {item && (
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Excluir “${item.name}”?`}
        description="O item sai do cardápio na hora. Isso não desfaz."
        confirmLabel="Excluir"
        onConfirm={removeItem}
      />
    )}
    </>
  );
}

/** Retorno do salvamento, na barra: ocupa a linha inteira e os botões descem. */
function Alert({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex basis-full items-center gap-2 rounded-sm px-4 py-3 text-body2 font-medium',
        tone === 'error' ? 'bg-error-bg text-gray-700' : 'bg-white text-gray-700 shadow-low',
      )}
    >
      {children}
    </p>
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
      <label htmlFor={htmlFor} className="mb-1.5 block text-body2 font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-caption text-ink-500">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-caption font-medium text-flame-600">
          {error}
        </p>
      )}
    </div>
  );
}

function inputClass(invalid: boolean): string {
  return `field-input ${invalid ? 'field-input-invalid' : ''}`;
}
