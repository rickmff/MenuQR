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
        <section key={category.id} className="rounded-card border border-cream-200 bg-white">
          <header className="flex flex-wrap items-center gap-3 border-b border-cream-200 p-4">
            <h2 className="font-display text-lg font-semibold">
              {category.icon && <span aria-hidden="true">{category.icon} </span>}
              {category.name}
            </h2>
            <span className="text-sm text-charcoal-500">
              {category.items.length} {category.items.length === 1 ? 'item' : 'itens'}
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Link
                href={`/painel/cardapio/item?categoria=${category.id}`}
                className="rounded-lg bg-ember-500 px-3 py-2 text-sm font-semibold text-white hover:bg-ember-600"
              >
                + Item
              </Link>
              <button
                type="button"
                onClick={() => setEditing(editing === category.id ? null : category.id)}
                className="rounded-lg border border-cream-200 px-3 py-2 text-sm font-semibold hover:border-ember-400"
              >
                Editar
              </button>
              {index > 0 && (
                <form action={moveCategoryAction}>
                  <input type="hidden" name="businessId" value={businessId} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input type="hidden" name="direction" value="up" />
                  <PendingButton className="rounded-lg border border-cream-200 px-3 py-2 text-sm hover:border-ember-400">
                    <span aria-hidden="true">↑</span>
                    <span className="sr-only">Mover {category.name} para cima</span>
                  </PendingButton>
                </form>
              )}
              {index < menu.length - 1 && (
                <form action={moveCategoryAction}>
                  <input type="hidden" name="businessId" value={businessId} />
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input type="hidden" name="direction" value="down" />
                  <PendingButton className="rounded-lg border border-cream-200 px-3 py-2 text-sm hover:border-ember-400">
                    <span aria-hidden="true">↓</span>
                    <span className="sr-only">Mover {category.name} para baixo</span>
                  </PendingButton>
                </form>
              )}
              <form action={deleteCategoryAction}>
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="categoryId" value={category.id} />
                <PendingButton
                  className="rounded-lg px-3 py-2 text-sm text-charcoal-500 hover:text-ember-600"
                  confirmMessage={`Excluir a categoria “${category.name}” e todos os seus itens?`}
                >
                  Excluir
                </PendingButton>
              </form>
            </div>
          </header>

          {editing === category.id && (
            <div className="border-b border-cream-200 bg-cream-100 p-4">
              <CategoryForm
                businessId={businessId}
                category={category}
                onDone={() => setEditing(null)}
              />
            </div>
          )}

          {category.items.length === 0 ? (
            <p className="p-4 text-sm text-charcoal-500">
              Nenhum item nesta categoria ainda. Use “+ Item” para adicionar o primeiro.
            </p>
          ) : (
            <ul className="divide-y divide-cream-200">
              {category.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                  <span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-cream-100 text-xl">
                    {/^(https?:\/\/|\/)/.test(item.image) ? '🖼️' : item.image}
                  </span>
                  <div className="min-w-40 flex-1">
                    <p className="font-medium">
                      {item.name}
                      {!item.available && (
                        <span className="ml-2 rounded-md bg-cream-100 px-2 py-0.5 text-[11px] font-bold uppercase text-charcoal-500">
                          Esgotado
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-charcoal-500">
                      {formatPrice(item.price)}
                      {item.options.length > 0 &&
                        ` · ${item.options.length} ${item.options.length === 1 ? 'grupo de complementos' : 'grupos de complementos'}`}
                    </p>
                  </div>

                  <form action={toggleItemAvailabilityAction}>
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <input type="hidden" name="available" value={item.available ? 'false' : 'true'} />
                    <PendingButton className="rounded-lg border border-cream-200 px-3 py-2 text-sm font-semibold hover:border-ember-400">
                      {item.available ? 'Esgotar' : 'Reativar'}
                    </PendingButton>
                  </form>

                  <Link
                    href={`/painel/cardapio/item/${item.id}`}
                    className="rounded-lg border border-cream-200 px-3 py-2 text-sm font-semibold hover:border-ember-400"
                  >
                    Editar
                  </Link>

                  <form action={deleteItemAction}>
                    <input type="hidden" name="businessId" value={businessId} />
                    <input type="hidden" name="itemId" value={item.id} />
                    <PendingButton
                      className="rounded-lg px-3 py-2 text-sm text-charcoal-500 hover:text-ember-600"
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
        <section className="rounded-card border border-dashed border-cream-200 bg-white p-6">
          <h2 className="font-display text-lg font-semibold">Nova categoria</h2>
          <p className="mb-4 mt-1 text-sm text-charcoal-500">
            Exemplos: Hambúrgueres, Porções, Bebidas, Sobremesas.
          </p>
          <CategoryForm businessId={businessId} onDone={() => setCreating(false)} />
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-xl border border-cream-200 bg-white px-5 py-3 font-semibold hover:border-ember-400"
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
  const [state, formAction] = useActionState(saveCategoryAction, initialState);

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
          className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-base outline-none focus:border-ember-500"
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
          className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-base outline-none focus:border-ember-500"
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
          className="w-full rounded-xl border border-cream-200 bg-white px-3 py-2.5 text-base outline-none focus:border-ember-500"
        />
      </div>

      <PendingButton className="rounded-xl bg-ember-500 px-5 py-2.5 font-semibold text-white hover:bg-ember-600">
        Salvar
      </PendingButton>
      <button
        type="button"
        onClick={onDone}
        className="rounded-xl px-4 py-2.5 text-sm text-charcoal-500 hover:text-charcoal-900"
      >
        Cancelar
      </button>

      {state.fieldErrors?.name && (
        <p role="alert" className="w-full text-xs font-medium text-ember-600">
          {state.fieldErrors.name}
        </p>
      )}
      {state.error && (
        <p role="alert" className="w-full text-xs font-medium text-ember-600">
          {state.error}
        </p>
      )}
    </form>
  );
}
