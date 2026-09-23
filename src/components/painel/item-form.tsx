'use client';

import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { ImageField } from '@/components/painel/image-field';
import { useFormAction } from '@/components/use-form-action';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { SelectField, TextArea, TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
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

/** "29,90", como o lojista escreve; o servidor lê vírgula e ponto. */
function priceInput(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

export interface ItemFormProps {
  businessId: string;
  categories: MenuCategory[];
  item?: MenuItem;
  defaultCategoryId?: string;
  /**
   * Embutido na lista do cardápio, no lugar da linha do item: sem card em
   * volta, com o nome já em foco, e fechar (cancelar, salvar, excluir)
   * devolve à lista pelo `onClose`. Sem isto, é a página própria do item.
   */
  inline?: boolean;
  /** Primeiro da lista: sem a linha divisória em cima. */
  first?: boolean;
  onClose?: () => void;
}

/**
 * Formulário de item, incluindo o editor de complementos. Só o essencial
 * fica à vista — foto, nome, preço, descrição — e o resto mora em duas
 * seções recolhidas: os complementos, com o resumo do que está montado, e
 * "Mais detalhes" (categoria, serve, etiquetas, alérgenos, calorias, texto
 * alternativo). A disponibilidade é o interruptor da linha, não um campo.
 *
 * Salvar não sai da tela: a action devolve a mensagem, o toast a mostra e a
 * lista já chega atualizada pela revalidação do painel.
 */
export function ItemForm({
  businessId,
  categories,
  item,
  defaultCategoryId,
  inline = false,
  first = false,
  onClose,
}: ItemFormProps) {
  const router = useRouter();
  const toast = useToast();
  const ids = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const finish = (message: string) => {
    toast({ message, tone: 'success' });
    if (inline) onClose?.();
    else router.push('/painel/cardapio');
  };

  const { state, formProps, pending } = useFormAction(async (previous: FormState, formData: FormData) => {
    const result = await (demoMode ? demoSaveItemAction : saveItemAction)(previous, formData);
    if (result.success) finish(result.success);
    return result;
  }, initialState);
  const [groups, setGroups] = useState<GroupDraft[]>(() => toDrafts(item));
  // Salvar com a foto ainda subindo gravaria a imagem antiga sem avisar ninguém.
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();

  // Embutido, o formulário aparece onde estava a linha: garante que ele entre na tela.
  useEffect(() => {
    if (!inline) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    formRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [inline]);

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
      toast('Item excluído');
      if (inline) onClose?.();
      else router.push('/painel/cardapio');
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

  // Resumo de cada seção recolhida, para saber o que há dentro sem abrir.
  const namedGroups = groups.map((group) => group.name.trim()).filter(Boolean);
  const optionsSummary = namedGroups.length
    ? `${plural(namedGroups.length, 'grupo', 'grupos')} · ${namedGroups.join(', ')}`
    : 'nenhum';
  const detailParts = item
    ? [
        item.serves && `Serve ${item.serves}`,
        item.tags.length > 0 && plural(item.tags.length, 'etiqueta', 'etiquetas'),
        item.allergens.length > 0 && plural(item.allergens.length, 'alérgeno', 'alérgenos'),
        item.calories && `${item.calories} kcal`,
      ].filter(Boolean)
    : [];
  const detailsSummary = detailParts.length ? detailParts.join(' · ') : 'serve, etiquetas, alérgenos, calorias';

  // Com uma categoria só não há o que escolher: ela vai num campo oculto.
  const showCategory = categories.length > 1;
  const categoryId = item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '';

  const summaryClass =
    'flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-body2 font-semibold text-gray-700 [&::-webkit-details-marker]:hidden';
  const chevronClass =
    'size-[18px] shrink-0 text-gray-600 transition-transform duration-150 ease-standard group-open:rotate-180';

  return (
    <>
      <form
        {...formProps}
        ref={formRef}
        noValidate
        onKeyDown={(event) => {
          // Esc fecha o editor embutido, como fecharia um sheet.
          if (inline && event.key === 'Escape' && onClose) {
            event.preventDefault();
            onClose();
          }
        }}
        className={cn(
          'space-y-4 bg-white p-4 lg:p-6',
          inline ? !first && 'border-t border-gray-200' : 'rounded-md border border-gray-200',
        )}
      >
        <input type="hidden" name="businessId" value={businessId} />
        {item && <input type="hidden" name="itemId" value={item.id} />}
        <input type="hidden" name="options" value={optionsPayload} />
        {/* Disponível ou esgotado é o interruptor da linha; item novo nasce disponível. */}
        <input type="hidden" name="available" value={item ? (item.available ? 'on' : '') : 'on'} />
        {!showCategory && <input type="hidden" name="categoryId" value={categoryId} />}

        <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <ImageField
            id={`${ids}image`}
            name="image"
            label="Foto do prato"
            businessId={businessId}
            defaultValue={item?.image ?? ''}
            error={error('image')}
            onBusyChange={setUploading}
          />

          <div className="grid content-start gap-4">
            {/* Nome e preço na mesma linha: o nome fica com o que sobra, o preço é curto. */}
            <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-4 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <TextField
                id={`${ids}name`}
                name="name"
                label="Nome"
                required
                defaultValue={item?.name}
                placeholder="Ex.: Brasa Classic"
                autoComplete="off"
                autoFocus={inline}
                error={error('name')}
              />
              <TextField
                id={`${ids}price`}
                name="price"
                label="Preço (R$)"
                required
                inputMode="decimal"
                defaultValue={item ? priceInput(item.price) : ''}
                placeholder="29,90"
                error={error('price')}
              />
            </div>

            <TextArea
              id={`${ids}description`}
              name="description"
              label="Descrição (opcional)"
              rows={2}
              defaultValue={item?.description}
              placeholder="Ingredientes e o que torna o prato especial"
            />
          </div>
        </div>

        <details className="group rounded-sm border border-gray-200" open={error('options') ? true : undefined}>
          <summary className={summaryClass}>
            <ChevronDown aria-hidden="true" className={chevronClass} />
            <span className="shrink-0">Complementos</span>
            <span className="ml-auto min-w-0 truncate text-right font-normal text-gray-600">{optionsSummary}</span>
          </summary>

          <div className="space-y-3 border-t border-gray-200 p-4">
            <p className="text-body2 text-gray-600">
              Escolhas do cliente: ponto da carne, tamanho, adicionais pagos e ingredientes que dá para
              tirar.
            </p>
            {error('options') && (
              <Banner tone="error" role="alert">
                {error('options')}
              </Banner>
            )}

            {groups.map((group, groupIndex) => (
              <fieldset key={group.key} className="space-y-3 rounded-sm border border-gray-200 bg-gray-50 p-3">
                <legend className="sr-only">Grupo de complementos {groupIndex + 1}</legend>

                <div className="flex flex-wrap items-end gap-3">
                  <TextField
                    className="min-w-48 flex-1"
                    id={`${ids}g${groupIndex}-name`}
                    label="Nome do grupo"
                    value={group.name}
                    onChange={(event) => updateGroup(group.key, { name: event.target.value })}
                    placeholder={GROUP_PLACEHOLDER[group.type]}
                  />
                  <SelectField
                    className="min-w-56"
                    id={`${ids}g${groupIndex}-type`}
                    label="Tipo"
                    value={group.type}
                    onChange={(event) => updateGroup(group.key, { type: event.target.value as OptionType })}
                  >
                    <option value="single">Escolher uma</option>
                    <option value="multi">Escolher várias, com quantidade</option>
                    <option value="remove">Retirar ingredientes</option>
                  </SelectField>
                  {group.type !== 'single' && (
                    <TextField
                      className="w-24"
                      id={`${ids}g${groupIndex}-max`}
                      label="Máximo"
                      value={group.max}
                      onChange={(event) => updateGroup(group.key, { max: event.target.value })}
                      inputMode="numeric"
                      placeholder="4"
                    />
                  )}
                  <label className="flex h-12 items-center gap-2 text-body2 text-gray-700">
                    <input
                      type="checkbox"
                      checked={group.required}
                      onChange={(event) => updateGroup(group.key, { required: event.target.checked })}
                      className="size-5 accent-primary"
                    />
                    Obrigatório
                  </label>
                  <IconButton
                    label="Remover grupo"
                    icon={<Trash2 className="size-5" />}
                    onClick={() => removeGroup(group.key)}
                    className="mb-1"
                  />
                </div>

                <ul className="space-y-2">
                  {group.choices.map((choice, choiceIndex) => (
                    <li
                      key={choice.key}
                      className={cn(
                        'grid grid-cols-[minmax(0,1fr)_2rem] items-end gap-2',
                        group.type !== 'remove' && 'sm:grid-cols-[minmax(0,1fr)_9rem_2rem]',
                      )}
                    >
                      <TextField
                        id={`${ids}g${groupIndex}c${choiceIndex}-name`}
                        label={CHOICE_LABEL[group.type]}
                        value={choice.name}
                        onChange={(event) => updateChoice(group.key, choice.key, { name: event.target.value })}
                        placeholder={CHOICE_PLACEHOLDER[group.type]}
                      />
                      {/* Tirar ingrediente não tem preço: o campo sai para não sugerir cobrança. */}
                      {group.type !== 'remove' && (
                        <TextField
                          // Celular: linha de baixo, estreito; sm+: a segunda coluna da mesma linha.
                          className="col-span-2 row-start-2 w-32 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:w-auto"
                          id={`${ids}g${groupIndex}c${choiceIndex}-price`}
                          label="Acréscimo (R$)"
                          value={choice.price}
                          onChange={(event) => updateChoice(group.key, choice.key, { price: event.target.value })}
                          placeholder="0,00"
                          inputMode="decimal"
                        />
                      )}
                      <IconButton
                        size="sm"
                        label="Remover opção"
                        icon={<X className="size-4" />}
                        onClick={() => removeChoice(group.key, choice.key)}
                        className="col-start-2 row-start-1 mb-2 sm:col-start-3"
                      />
                    </li>
                  ))}
                </ul>

                <Button
                  variant="text"
                  size="sm"
                  leading={<Plus aria-hidden="true" className="size-4" />}
                  onClick={() => addChoice(group.key)}
                >
                  Opção
                </Button>
              </fieldset>
            ))}

            <Button
              variant="secondary"
              size="sm"
              leading={<Plus aria-hidden="true" className="size-4" />}
              onClick={addGroup}
            >
              Grupo de complementos
            </Button>
          </div>
        </details>

        <details
          className="group rounded-sm border border-gray-200"
          open={error('categoryId') || error('calories') ? true : undefined}
        >
          <summary className={summaryClass}>
            <ChevronDown aria-hidden="true" className={chevronClass} />
            <span className="shrink-0">Mais detalhes</span>
            <span className="ml-auto min-w-0 truncate text-right font-normal text-gray-600">{detailsSummary}</span>
          </summary>

          <div className="grid gap-4 border-t border-gray-200 p-4 sm:grid-cols-2">
            {showCategory && (
              <SelectField
                id={`${ids}category`}
                name="categoryId"
                label="Categoria"
                defaultValue={categoryId}
                error={error('categoryId')}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </SelectField>
            )}
            <TextField
              id={`${ids}serves`}
              name="serves"
              label="Serve"
              hint="Ex.: 1 pessoa"
              defaultValue={item?.serves}
            />
            <TextField
              id={`${ids}tags`}
              name="tags"
              label="Etiquetas"
              hint="Separadas por vírgula."
              defaultValue={item?.tags.join(', ')}
              placeholder="Mais vendido, Vegetariano"
            />
            <TextField
              id={`${ids}allergens`}
              name="allergens"
              label="Alérgenos"
              hint="Separados por vírgula."
              defaultValue={item?.allergens.join(', ')}
              placeholder="Glúten, Leite"
            />
            <TextField
              id={`${ids}calories`}
              name="calories"
              label="Calorias"
              hint="Opcional."
              inputMode="numeric"
              defaultValue={item?.calories ?? ''}
              error={error('calories')}
            />
            <TextField
              className="sm:col-span-2"
              id={`${ids}imageAlt`}
              name="imageAlt"
              label="Texto alternativo da foto"
              hint="Descreve a foto para leitores de tela e para o Google."
              defaultValue={item?.imageAlt}
            />
          </div>
        </details>

        {/* O retorno do salvamento mora junto do botão, que é o que está na
            tela. A barra gruda no rodapé enquanto o formulário for mais alto
            que a janela. Excluir fica à esquerda, longe de Salvar; a ação
            principal é a última à direita. */}
        <div className="sticky bottom-0 z-10 -mx-4 -mb-4 flex flex-wrap items-center gap-3 rounded-b-md border-t border-gray-200 bg-white px-4 py-3 lg:-mx-6 lg:-mb-6 lg:px-6">
          {state.error && (
            <Banner tone="error" role="alert" className="basis-full">
              {state.error}
            </Banner>
          )}
          {hasFieldErrors && !state.error && (
            <Banner tone="error" role="alert" className="basis-full">
              Não foi salvo: revise o campo destacado.
            </Banner>
          )}
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
            {inline ? (
              <Button variant="text" onClick={onClose}>
                Cancelar
              </Button>
            ) : (
              <Button variant="text" href="/painel/cardapio">
                Cancelar
              </Button>
            )}
            <Button type="submit" loading={pending} disabled={uploading || deleting}>
              {item ? 'Salvar' : 'Adicionar ao cardápio'}
            </Button>
          </div>
        </div>
      </form>

      {item && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title={`Excluir “${item.name}”?`}
          description="O item sai do cardápio publicado na hora. Isso não desfaz."
          confirmLabel="Excluir"
          onConfirm={removeItem}
        />
      )}
    </>
  );
}
