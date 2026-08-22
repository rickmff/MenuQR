'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { formatPrice } from '@/lib/format';
import {
  deleteCategoryAction,
  moveCategoryAction,
  saveCategoryAction,
} from '@/server/actions/menu';
import { deleteItemAction, toggleItemAvailabilityAction } from '@/server/actions/menu';
import { demoMode } from '@/lib/demo/config';
import {
  demoDeleteCategoryAction,
  demoDeleteItemAction,
  demoMoveCategoryAction,
  demoSaveCategoryAction,
  demoToggleItemAvailabilityAction,
} from '@/lib/demo/actions';

// No modo demonstração as alterações acontecem no navegador.
const actions = demoMode
  ? {
      saveCategory: demoSaveCategoryAction,
      deleteCategory: demoDeleteCategoryAction,
      moveCategory: demoMoveCategoryAction,
      deleteItem: demoDeleteItemAction,
      toggleItem: demoToggleItemAvailabilityAction,
    }
  : {
      saveCategory: saveCategoryAction,
      deleteCategory: deleteCategoryAction,
      moveCategory: moveCategoryAction,
      deleteItem: deleteItemAction,
      toggleItem: toggleItemAvailabilityAction,
    };
import type { FormState } from '@/server/actions/business';
import type { MenuCategory } from '@/lib/types';

const initialState: FormState = {};

function PendingButton({
  children,
  className,
  confirmMessage,
}: {
  children: React.ReactNode;
  className: string;
  confirmMessage?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

/** Lista de categorias e itens do cardápio, com as ações de cada linha. */
export function CategoryManager({
  businessId,
  menu,
}: {
  businessId: string;
  menu: MenuCategory[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(menu.length === 0);

  return (
    <div className="space-y-6">
      {menu.map((category, index) => (
        <section key={category.id} className="surface">
          <header className="flex flex-wrap items-center gap-3 border-b border-ink-200 p-4">
            <h2 className="font-display text-lg font-semibold">
              {category.icon && <span aria-hidden="true">{category.icon} </span>}
              {category.name}
            </h2>
            <span className="text-sm text-ink-500">
              {category.items.length} {category.items.length === 1 ? 'item' : 'itens'}
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Link
                href={`/painel/cardapio/item?categoria=${category.id}`}
                className="btn btn-sm btn-primary"
              >
                + Item
              </Link>
              <button
                type="button"
                onClick={() => setEditing(editing === category.id ? null : category.id)}
                className="btn btn-sm btn-outline"
              >
                Editar
              </button>
              {index > 0 && (
                <form action={actions.moveCategory}>
                  <input type="hidden" name="businessId" value={businessId} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input type="hidden" name="direction" value="up" />
                  <PendingButton className="rounded-lg border border-ink-200 px-3 py-2 text-sm hover:border-flame-400">
                    <span aria-hidden="true">↑</span>
                    <span className="sr-only">Mover {category.name} para cima</span>
                  </PendingButton>
                </form>
              )}
              {index < menu.length - 1 && (
                <form action={actions.moveCategory}>
                  <input type="hidden" name="businessId" value={businessId} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input type="hidden" name="direction" value="down" />
                  <PendingButton className="rounded-lg border border-ink-200 px-3 py-2 text-sm hover:border-flame-400">
                    <span aria-hidden="true">↓</span>
                    <span className="sr-only">Mover {category.name} para baixo</span>
                  </PendingButton>
                </form>
              )}
              <form action={actions.deleteCategory}>
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="categoryId" value={category.id} />
                <PendingButton
                  className="rounded-lg px-3 py-2 text-sm text-ink-500 hover:text-flame-600"
                  confirmMessage={`Excluir a categoria “${category.name}” e todos os seus itens?`}
                >
                  Excluir
                </PendingButton>
              </form>
            </div>
          </header>

          {editing === category.id && (
            <div className="border-b border-ink-200 bg-ink-100 p-4">
              <CategoryForm
                businessId={businessId}
                category={category}
                onDone={() => setEditing(null)}
              />
            </div>
          )}

          {category.items.length === 0 ? (
            <p className="p-4 text-sm text-ink-500">
              Nenhum item nesta categoria ainda. Use “+ Item” para adicionar o primeiro.
            </p>
          ) : (
            <ul className="divide-y divide-ink-200">
              {category.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-ink-100 text-xl">
                    {/^(https?:\/\/|\/)/.test(item.image) ? '🖼️' : item.image}
                  </span>
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">
                      {item.name}
                      {!item.available && (
                        <span className="ml-2 rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-bold uppercase text-ink-500">
                          Esgotado
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-ink-500">
                      {formatPrice(item.price)}
                      {item.options.length > 0 &&
                        ` · ${item.options.length} ${item.options.length === 1 ? 'grupo de complementos' : 'grupos de complementos'}`}
                    </p>
                  </div>

                  <form action={actions.toggleItem}>
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="available" value={item.available ? 'false' : 'true'} />
                    <PendingButton className="btn btn-sm btn-outline">
                      {item.available ? 'Esgotar' : 'Reativar'}
                    </PendingButton>
                  </form>

                  <Link
                    href={`/painel/cardapio/item/${item.id}`}
                    className="btn btn-sm btn-outline"
                  >
                    Editar
                  </Link>

                  <form action={actions.deleteItem}>
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <PendingButton
                      className="rounded-lg px-3 py-2 text-sm text-ink-500 hover:text-flame-600"
                      confirmMessage={`Excluir “${item.name}” do cardápio?`}
                    >
                      Excluir
                    </PendingButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {creating ? (
        <section className="rounded-card border border-dashed border-ink-200 bg-white p-6">
          <h2 className="font-display text-lg font-semibold">Nova categoria</h2>
          <p className="mb-4 mt-1 text-sm text-ink-500">
            Exemplos: Hambúrgueres, Porções, Bebidas, Sobremesas.
          </p>
          <CategoryForm businessId={businessId} onDone={() => setCreating(false)} />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="btn btn-outline"
        >
          + Nova categoria
        </button>
      )}
    </div>
  );
}

function CategoryForm({
  businessId,
  category,
  onDone,
}: {
  businessId: string;
  category?: MenuCategory;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(actions.saveCategory, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="businessId" value={businessId} />
      {category && <input type="hidden" name="categoryId" value={category.id} />}

      <div className="w-20">
        <label htmlFor={`icon-${category?.id ?? 'novo'}`} className="mb-1.5 block text-xs font-semibold">
          Emoji
        </label>
        <input
          id={`icon-${category?.id ?? 'novo'}`}
          name="icon"
          defaultValue={category?.icon ?? ''}
          placeholder="🍔"
          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-base outline-none focus:border-flame-500"
        />
      </div>

      <div className="min-w-48 flex-1">
        <label htmlFor={`name-${category?.id ?? 'novo'}`} className="mb-1.5 block text-xs font-semibold">
          Nome da categoria
        </label>
        <input
          id={`name-${category?.id ?? 'novo'}`}
          name="name"
          required
          defaultValue={category?.name ?? ''}
          placeholder="Hambúrgueres"
          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-base outline-none focus:border-flame-500"
        />
      </div>

      <div className="min-w-60 flex-1">
        <label htmlFor={`desc-${category?.id ?? 'novo'}`} className="mb-1.5 block text-xs font-semibold">
          Descrição (opcional)
        </label>
        <input
          id={`desc-${category?.id ?? 'novo'}`}
          name="description"
          defaultValue={category?.description ?? ''}
          placeholder="Blend artesanal, pão brioche…"
          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-base outline-none focus:border-flame-500"
        />
      </div>

      <PendingButton className="btn btn-sm btn-primary">
        Salvar
      </PendingButton>
      <button
        type="button"
        onClick={onDone}
        className="rounded-xl px-4 py-2.5 text-sm text-ink-500 hover:text-ink-950"
      >
        Cancelar
      </button>

      {state.fieldErrors?.name && (
        <p role="alert" className="w-full text-xs font-medium text-flame-600">
          {state.fieldErrors.name}
        </p>
      )}
      {state.error && (
        <p role="alert" className="w-full text-xs font-medium text-flame-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
