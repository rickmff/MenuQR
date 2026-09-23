'use client';

import { ArrowDown, ArrowUp, ChevronDown, Pencil, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { useId, useState, useTransition } from 'react';
import { ItemForm } from '@/components/painel/item-form';
import { DishImage } from '@/components/store/dish-image';
import { useFormAction } from '@/components/use-form-action';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Menu } from '@/components/ui/menu';
import { Switch } from '@/components/ui/switch';
import { Tag } from '@/components/ui/tag';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { demoMode } from '@/lib/demo/config';
import {
  demoDeleteCategoryAction,
  demoMoveCategoryAction,
  demoSaveCategoryAction,
  demoToggleItemAvailabilityAction,
} from '@/lib/demo/actions';
import { formatPrice } from '@/lib/format';
import {
  deleteCategoryAction,
  moveCategoryAction,
  saveCategoryAction,
  toggleItemAvailabilityAction,
} from '@/server/actions/menu';
import type { FormState } from '@/server/actions/business';
import type { MenuCategory, MenuItem } from '@/lib/types';

// No modo demonstração as alterações acontecem no navegador.
const actions = demoMode
  ? {
      saveCategory: demoSaveCategoryAction,
      deleteCategory: demoDeleteCategoryAction,
      moveCategory: demoMoveCategoryAction,
      toggleItem: demoToggleItemAvailabilityAction,
    }
  : {
      saveCategory: saveCategoryAction,
      deleteCategory: deleteCategoryAction,
      moveCategory: moveCategoryAction,
      toggleItem: toggleItemAvailabilityAction,
    };

const initialState: FormState = {};

const plural = (count: number, singular: string, pluralForm: string) =>
  `${count} ${count === 1 ? singular : pluralForm}`;

/** O que está aberto na lista: um item em edição ou um item novo numa categoria. */
type Editor = { mode: 'new'; categoryId: string } | { mode: 'edit'; itemId: string } | null;

/**
 * O cardápio em uma tela. Cada categoria é um card com as suas linhas; tocar
 * numa linha abre o formulário do item ali mesmo, no lugar dela; tocar no
 * nome da categoria renomeia; o "⋯" move e exclui. Nada sai desta página:
 * salvar mostra um toast e a lista chega atualizada pela revalidação (ou,
 * na demonstração, pelo store no navegador).
 *
 * Um editor por vez: abrir outro fecha o que estava aberto.
 */
export function MenuEditor({ businessId, menu }: { businessId: string; menu: MenuCategory[] }) {
  const toast = useToast();
  const [editor, setEditor] = useState<Editor>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [creating, setCreating] = useState(menu.length === 0);
  // A categoria a excluir continua guardada enquanto o sheet sai de cena.
  const [toDelete, setToDelete] = useState<MenuCategory | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, startTransition] = useTransition();

  const openEditor = (next: Editor) => {
    setEditor(next);
    setRenaming(null);
    setCreating(false);
  };
  const closeEditor = () => setEditor(null);

  const categoryForm = (categoryId: string, extra: Record<string, string> = {}) => {
    const formData = new FormData();
    formData.set('businessId', businessId);
    formData.set('categoryId', categoryId);
    for (const [key, value] of Object.entries(extra)) formData.set(key, value);
    return formData;
  };

  const move = (categoryId: string, direction: 'up' | 'down') =>
    startTransition(() => actions.moveCategory(categoryForm(categoryId, { direction })));

  const remove = (category: MenuCategory) =>
    startTransition(async () => {
      await actions.deleteCategory(categoryForm(category.id));
      setEditor(null);
      toast('Categoria excluída');
    });

  const toggle = (item: MenuItem, available: boolean) =>
    actions.toggleItem(
      (() => {
        const formData = new FormData();
        formData.set('businessId', businessId);
        formData.set('itemId', item.id);
        formData.set('available', String(available));
        return formData;
      })(),
    );

  return (
    <div className="space-y-6">
      {menu.map((category, index) => (
        <Card key={category.id} as="section" padding="none" aria-labelledby={`${category.id}-title`}>
          <header className="flex min-h-14 flex-wrap items-center gap-2 py-2 pl-4 pr-2">
            {renaming === category.id ? (
              <CategoryForm businessId={businessId} category={category} onDone={() => setRenaming(null)} />
            ) : (
              <>
                {/* `text-wrap` anula o `balance` global do h2: no Chrome ele encolhe a caixa
                    de um item flex e o nome saía cortado com espaço sobrando. */}
                {/* Título e contagem num bloco que encolhe (quebrando o nome em duas linhas
                    se precisar), para o "⋯" ficar sempre na mesma linha, à direita. */}
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2">
                  <h2 id={`${category.id}-title`} className="min-w-0 text-wrap text-subtitle font-semibold text-gray-700">
                    <button
                      type="button"
                      title="Renomear"
                      onClick={() => {
                        setRenaming(category.id);
                        setCreating(false);
                      }}
                      className="press -ml-2 inline-flex items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-gray-50 active:bg-gray-100"
                    >
                      <span className="min-w-0">{category.name}</span>
                      <Pencil aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
                    </button>
                  </h2>
                  <span className="text-body2 text-gray-600">{plural(category.items.length, 'item', 'itens')}</span>
                </div>
                <div className="shrink-0">
                  <Menu
                    label={`Opções de ${category.name}`}
                    items={[
                      {
                        label: 'Renomear',
                        icon: <Pencil className="size-[18px]" />,
                        onSelect: () => {
                          setRenaming(category.id);
                          setCreating(false);
                        },
                      },
                      {
                        label: 'Mover para cima',
                        icon: <ArrowUp className="size-[18px]" />,
                        disabled: index === 0,
                        onSelect: () => move(category.id, 'up'),
                      },
                      {
                        label: 'Mover para baixo',
                        icon: <ArrowDown className="size-[18px]" />,
                        disabled: index === menu.length - 1,
                        onSelect: () => move(category.id, 'down'),
                      },
                      {
                        label: 'Excluir categoria',
                        icon: <Trash2 className="size-[18px]" />,
                        destructive: true,
                        onSelect: () => {
                          setToDelete(category);
                          setConfirmOpen(true);
                        },
                      },
                    ]}
                  />
                </div>
              </>
            )}
          </header>

          <ul>
            {category.items.map((item, itemIndex) => (
              <li key={item.id}>
                {editor?.mode === 'edit' && editor.itemId === item.id ? (
                  <ItemForm
                    inline
                    first={itemIndex === 0}
                    businessId={businessId}
                    categories={menu}
                    item={item}
                    onClose={closeEditor}
                  />
                ) : (
                  <ItemRow
                    item={item}
                    onOpen={() => openEditor({ mode: 'edit', itemId: item.id })}
                    onToggle={(available) => toggle(item, available)}
                  />
                )}
              </li>
            ))}
          </ul>

          {editor?.mode === 'new' && editor.categoryId === category.id ? (
            <ItemForm
              inline
              first={category.items.length === 0}
              businessId={businessId}
              categories={menu}
              defaultCategoryId={category.id}
              onClose={closeEditor}
            />
          ) : (
            <button
              type="button"
              onClick={() => openEditor({ mode: 'new', categoryId: category.id })}
              className="press flex w-full items-center gap-2 rounded-b-md border-t border-gray-200 px-4 py-3.5 text-body2 font-semibold text-primary hover:bg-gray-50 active:bg-gray-100"
            >
              <Plus aria-hidden="true" className="size-5" />
              Adicionar item
            </button>
          )}
        </Card>
      ))}

      {menu.length === 0 && !creating && (
        <Card padding="none">
          <EmptyState
            icon={<UtensilsCrossed className="size-12" />}
            title="Comece pela primeira categoria"
            description="Hambúrgueres, Porções, Bebidas… os itens ficam dentro delas."
          />
        </Card>
      )}

      {creating ? (
        <Card as="section" padding="sm" aria-label="Nova categoria">
          <CategoryForm businessId={businessId} onDone={() => setCreating(false)} />
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setRenaming(null);
          }}
          className="press flex w-full items-center gap-2 rounded-md border border-dashed border-gray-300 px-4 py-4 text-body2 font-semibold text-primary hover:bg-white active:bg-gray-100"
        >
          <Plus aria-hidden="true" className="size-5" />
          Nova categoria
        </button>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={toDelete ? `Excluir “${toDelete.name}”?` : ''}
        description={
          !toDelete || toDelete.items.length === 0
            ? 'A categoria está vazia.'
            : toDelete.items.length === 1
              ? 'O item dela sai do cardápio junto.'
              : `Os ${toDelete.items.length} itens dela saem do cardápio junto.`
        }
        confirmLabel="Excluir"
        onConfirm={() => toDelete && remove(toDelete)}
      />
    </div>
  );
}

/**
 * Linha do item: miniatura, nome, preço e o interruptor de disponível. A
 * linha inteira abre o editor; o interruptor é a única parte que não abre.
 * O estado do interruptor muda na hora e a resposta do servidor confirma.
 */
function ItemRow({
  item,
  onOpen,
  onToggle,
}: {
  item: MenuItem;
  onOpen: () => void;
  onToggle: (available: boolean) => Promise<void>;
}) {
  const [optimistic, setOptimistic] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();
  const available = pending && optimistic !== null ? optimistic : item.available;
  const groups = item.options.length;

  return (
    <div
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('[role="switch"]')) return;
        onOpen();
      }}
      className="flex cursor-pointer items-center gap-3 border-t border-gray-200 px-4 py-3 transition-colors duration-150 ease-standard hover:bg-gray-50"
    >
      <button
        type="button"
        aria-label={`Editar ${item.name}`}
        onClick={(event) => {
          event.stopPropagation();
          onOpen();
        }}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left"
      >
        <DishImage image={item.image} alt="" emojiSize="sm" sizes="40px" className="size-10 shrink-0 rounded-sm" />
        <span className={cn('min-w-0 flex-1', !available && 'opacity-60')}>
          <span className="flex flex-wrap items-center gap-2 text-body1 font-semibold text-gray-700">
            <span className="truncate">{item.name}</span>
            {!available && <Tag>Esgotado</Tag>}
          </span>
          <span className="block text-body2 text-gray-600 tabular-nums">
            {formatPrice(item.price)}
            {groups > 0 && ` · ${plural(groups, 'complemento', 'complementos')}`}
          </span>
        </span>
      </button>

      <Switch
        checked={available}
        disabled={pending}
        label={`Disponível para pedido: ${item.name}`}
        onChange={(next) => {
          setOptimistic(next);
          startTransition(async () => {
            await onToggle(next);
          });
        }}
      />
      <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-gray-400" />
    </div>
  );
}

/** Nome (e, ao renomear, a descrição) da categoria, no lugar do título do card. */
function CategoryForm({
  businessId,
  category,
  onDone,
}: {
  businessId: string;
  category?: MenuCategory;
  onDone: () => void;
}) {
  const toast = useToast();
  const ids = useId();
  // Salvou: o formulário fecha e a categoria aparece na lista.
  const { state, formProps, pending } = useFormAction(async (previous: FormState, formData: FormData) => {
    const result = await actions.saveCategory(previous, formData);
    if (result.success) {
      toast({ message: result.success, tone: 'success' });
      onDone();
    }
    return result;
  }, initialState);

  return (
    <form
      {...formProps}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onDone();
        }
      }}
      className="flex w-full flex-wrap items-end gap-3"
    >
      <input type="hidden" name="businessId" value={businessId} />
      {category && <input type="hidden" name="categoryId" value={category.id} />}

      <TextField
        className="min-w-48 flex-1"
        id={`${ids}name`}
        name="name"
        label="Nome da categoria"
        required
        defaultValue={category?.name ?? ''}
        placeholder="Ex.: Porções"
        autoComplete="off"
        autoFocus
        error={state.fieldErrors?.name}
      />
      {category && (
        <TextField
          className="min-w-56 flex-1"
          id={`${ids}description`}
          name="description"
          label="Descrição (opcional)"
          defaultValue={category.description}
          placeholder="Blend artesanal, pão brioche…"
        />
      )}
      <div className="flex items-center gap-2">
        <Button type="submit" loading={pending}>
          {category ? 'Salvar' : 'Criar categoria'}
        </Button>
        <Button variant="text" onClick={onDone}>
          Cancelar
        </Button>
      </div>

      {state.error && (
        <Banner tone="error" role="alert" className="basis-full">
          {state.error}
        </Banner>
      )}
    </form>
  );
}
