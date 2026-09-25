'use client';

import { ArrowDown, ArrowUp, Check, ChevronDown, Pencil, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from 'react';
import { flushSync } from 'react-dom';
import { ItemForm, type ItemFormGuard, type ItemMoveDirection } from '@/components/painel/item-form';
import { useLeaveGuard } from '@/components/painel/leave-guard';
import { continueAfter } from '@/components/painel/setup-steps';
import { DishImage } from '@/components/store/dish-image';
import { formHasContent, useFormAction } from '@/components/use-form-action';
import { AddButton } from '@/components/ui/add-button';
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
  demoMoveItemAction,
  demoSaveCategoryAction,
  demoToggleItemAvailabilityAction,
} from '@/lib/demo/actions';
import { formatPrice } from '@/lib/format';
import { MENU_LIMITS } from '@/lib/menu-rules';
import { allItems } from '@/lib/menu-utils';
import {
  deleteCategoryAction,
  moveCategoryAction,
  moveItemAction,
  saveCategoryAction,
  toggleItemAvailabilityAction,
} from '@/server/actions/menu';
import type { FormState } from '@/server/actions/business';
import type { Business, MenuCategory, MenuItem } from '@/lib/types';

// No modo demonstração as alterações acontecem no navegador.
const actions = demoMode
  ? {
      saveCategory: demoSaveCategoryAction,
      deleteCategory: demoDeleteCategoryAction,
      moveCategory: demoMoveCategoryAction,
      moveItem: demoMoveItemAction,
      toggleItem: demoToggleItemAvailabilityAction,
    }
  : {
      saveCategory: saveCategoryAction,
      deleteCategory: deleteCategoryAction,
      moveCategory: moveCategoryAction,
      moveItem: moveItemAction,
      toggleItem: toggleItemAvailabilityAction,
    };

const initialState: FormState = {};

interface ItemMove {
  itemId: string;
  direction: ItemMoveDirection;
  /** Onde o item estava quando a seta foi tocada. */
  from: number;
}

/**
 * O cardápio com o item trocado de lugar com o vizinho, para a ordem nova
 * aparecer na hora, antes da resposta. Só troca se o item ainda estiver onde
 * estava (`from`): na demonstração a lista gravada já chega trocada durante a
 * ação, e trocar de novo o devolveria ao lugar por um quadro.
 */
function withItemMoved(menu: MenuCategory[], { itemId, direction, from }: ItemMove): MenuCategory[] {
  return menu.map((category) => {
    const index = category.items.findIndex((item) => item.id === itemId);
    if (index < 0 || index !== from) return category;
    const target = index + (direction === 'up' ? -1 : 1);
    if (target < 0 || target >= category.items.length) return category;
    const items = [...category.items];
    [items[index], items[target]] = [items[target]!, items[index]!];
    return { ...category, items };
  });
}

/**
 * Nome de cada formulário no registro de guardas: o editor de um item, o de
 * acrescentar de uma categoria e o de renomear uma categoria.
 */
const editKey = (itemId: string) => `edit:${itemId}`;
const addKey = (categoryId: string) => `add:${categoryId}`;
const renameKey = (categoryId: string) => `rename:${categoryId}`;

/**
 * O cardápio em uma tela. Cada categoria é um card com as suas linhas; tocar
 * numa linha abre o formulário do item ali mesmo, no lugar dela; tocar no
 * nome da categoria renomeia; o "⋯" move e exclui. Nada sai desta página:
 * salvar mostra um toast e a lista chega atualizada pela revalidação (ou,
 * na demonstração, pelo store no navegador).
 *
 * Acrescentar é o `AddButton` "Adicionar item" no rodapé do card (D23), que
 * abre ali mesmo o formulário "Novo item em <categoria>". Ele já nasce aberto
 * só onde é o próximo passo óbvio: na categoria vazia (acabou de ser criada)
 * e na última que recebeu item nesta visita — quem está montando o cardápio
 * cadastra um atrás do outro, e salvar devolve o formulário em branco, com o
 * Nome em foco, em vez de fechá-lo. Antes havia um formulário inteiro aberto
 * em cada categoria: duas categorias já eram duas telas de campos vazios.
 * O da próxima categoria continua no pé da página.
 *
 * Um item em edição por vez: abrir outro fecha o que estava aberto — e
 * pergunta antes, se havia alteração não salva. Os formulários de acrescentar
 * são à parte e continuam onde estão.
 */
export function MenuEditor({ business, menu: savedMenu }: { business: Business; menu: MenuCategory[] }) {
  const businessId = business.id;
  const toast = useToast();
  const t = useTranslations('painel.menuEditor');
  const tDestination = useTranslations('painel.setup.destination');
  const [menu, showMove] = useOptimistic(savedMenu, withItemMoved);
  const [editing, setEditing] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  /*
   * Categorias com itens cujo formulário de acrescentar está aberto: a que o
   * lojista abriu por "Adicionar item" e a que recebeu o último envio. A
   * categoria vazia tem o dela aberto sempre, e não precisa estar aqui.
   */
  const [openAdds, setOpenAdds] = useState<string[]>([]);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  /*
   * O formulário da próxima categoria recomeça em branco depois de salvar: a
   * chave muda e o React o remonta. (O de item volta em branco no lugar — ver
   * `ItemForm`.)
   */
  const [categoryRestarts, setCategoryRestarts] = useState(0);
  // A categoria a excluir continua guardada enquanto o sheet sai de cena.
  const [toDelete, setToDelete] = useState<MenuCategory | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, startTransition] = useTransition();

  /*
   * Os formulários de item e o de renomear categoria se registram aqui com a
   * pergunta de "Descartar alterações?" e se ainda têm o que perder. É por onde
   * esta tela pergunta antes de fechar um deles por outro caminho que não o
   * dele (tocar noutra linha, renomear outra categoria) e sabe qual formulário
   * aberto não pode sumir.
   */
  const guards = useRef<Map<string, ItemFormGuard>>(new Map());
  const registerGuard = useCallback((key: string, guard: ItemFormGuard | null) => {
    if (guard) guards.current.set(key, guard);
    else guards.current.delete(key);
  }, []);
  /*
   * Fecha os formulários `keys` perguntando UMA vez, pelo primeiro que tiver o
   * que perder: com o item e a renomeação alterados ao mesmo tempo, duas
   * perguntas seguidas pareceriam a mesma repetida. O outro sai junto.
   */
  const leaving = (keys: (string | null)[], proceed: () => void) => {
    const guard = keys
      .map((key) => (key ? guards.current.get(key) : undefined))
      .find((candidate) => candidate?.dirty);
    if (guard) guard.confirmLeave(proceed);
    else proceed();
  };
  const hasContent = (categoryId: string) => guards.current.get(addKey(categoryId))?.dirty ?? false;
  const openKeys = () => [editing ? editKey(editing) : null, renaming ? renameKey(renaming) : null];

  // Abrir uma linha fecha o item em edição e a categoria sendo renomeada.
  const openEditor = (itemId: string) =>
    leaving(openKeys(), () => {
      setEditing(itemId);
      setRenaming(null);
    });
  /*
   * Salvar, Cancelar, Esc ou "Descartar" desmontam o editor com o foco dentro
   * dele, e o navegador o jogava no <body>: quem usa teclado ou leitor de tela
   * voltava ao começo da página. O foco volta à linha que abriu o editor — ou,
   * com o item excluído (`itemId` nulo), ao título da categoria: a linha dele
   * ainda pode estar na tela, esperando a lista nova, e sumiria com o foco.
   * Mesmo padrão do `closeAdd`: `flushSync` para a linha existir antes do foco.
   */
  const closeEditor = (itemId: string | null, categoryId: string) => {
    flushSync(() => setEditing(null));
    const row = itemId
      ? document.querySelector<HTMLButtonElement>(`[data-item-open="${CSS.escape(itemId)}"]`)
      : null;
    (row ?? categoryTitleButton(categoryId))?.focus({ preventScroll: true });
  };
  // A renomeação fecha (salvou, Cancelar, Esc): o foco volta ao título da categoria.
  const closeRename = (categoryId: string) => {
    flushSync(() => setRenaming(null));
    categoryTitleButton(categoryId)?.focus({ preventScroll: true });
  };
  // Renomear outra categoria fecha a renomeação aberta; o item em edição fica.
  const openRename = (categoryId: string) =>
    leaving([renaming && renaming !== categoryId ? renameKey(renaming) : null], () => setRenaming(categoryId));

  /*
   * "Adicionar item" abre o formulário da categoria e fecha o que foi aberto
   * antes por este botão — nunca o da última que recebeu item, nem um que
   * ainda tenha algo escrito. `flushSync` faz o formulário existir ainda
   * dentro do toque: o foco no Nome precisa acontecer ali para o teclado
   * abrir no iPhone (armadilha 21).
   */
  const openAdd = (categoryId: string, event: MouseEvent<HTMLButtonElement>) => {
    const section = event.currentTarget.closest('section');
    const keep = openAdds.filter((id) => id !== categoryId && (id === lastAdded || hasContent(id)));
    flushSync(() => setOpenAdds([categoryId, ...keep]));
    const name = section?.querySelector<HTMLInputElement>('[data-add-form] input[name="name"]');
    name?.focus({ preventScroll: true });
    name?.scrollIntoView({ block: 'nearest' });
  };

  /*
   * Enviou um item: o formulário desta categoria fica aberto (a categoria
   * vazia deixa de estar vazia no meio do envio — sem isto o formulário
   * sumiria com o cursor dentro). Só isso: o envio ainda pode voltar recusado.
   */
  const addSubmitted = (categoryId: string) =>
    setOpenAdds((current) => (current.includes(categoryId) ? current : [categoryId, ...current]));

  /*
   * Gravou: esta passa a ser a última categoria que recebeu item, e os outros
   * formulários de acrescentar abertos e em branco fecham. Recusado pela
   * validação, nada disso acontece — a categoria não recebeu item nenhum.
   */
  const addSaved = (categoryId: string) => {
    // O registro é lido aqui, no handler; o atualizador só recebe o resultado.
    const written = new Set([...guards.current.keys()].filter((key) => guards.current.get(key)?.dirty));
    setOpenAdds((current) => [categoryId, ...current.filter((id) => id !== categoryId && written.has(addKey(id)))]);
    setLastAdded(categoryId);
  };

  // Fechou: o foco vai para o "Adicionar item" que tomou o lugar do
  // formulário, em vez de cair no <body> com o botão que o tinha.
  const closeAdd = (categoryId: string) => {
    flushSync(() => {
      setOpenAdds((current) => current.filter((id) => id !== categoryId));
      setLastAdded((current) => (current === categoryId ? null : current));
    });
    document
      .getElementById(`${categoryId}-title`)
      ?.closest('section')
      ?.querySelector<HTMLButtonElement>('[data-add-button] button')
      ?.focus({ preventScroll: true });
  };

  const categoryForm = (categoryId: string, extra: Record<string, string> = {}) => {
    const formData = new FormData();
    formData.set('businessId', businessId);
    formData.set('categoryId', categoryId);
    for (const [key, value] of Object.entries(extra)) formData.set(key, value);
    return formData;
  };

  // A ação de mover lança quando a posse falha ou a rede cai: o erro vira um
  // toast aqui, em vez de subir até o error boundary e derrubar a tela inteira.
  const moveFailed = () => toast({ message: t('moveFailed'), tone: 'error' });

  const move = (categoryId: string, direction: 'up' | 'down') =>
    startTransition(async () => {
      try {
        await actions.moveCategory(categoryForm(categoryId, { direction }));
      } catch {
        moveFailed();
      }
    });

  // A lista mostra a ordem nova na hora; a resposta do servidor confirma (e,
  // se falhar, a ordem otimista se desfaz sozinha quando a transição acaba).
  const moveItem = (itemId: string, from: number, direction: ItemMoveDirection) =>
    startTransition(async () => {
      showMove({ itemId, direction, from });
      try {
        await actions.moveItem(businessId, itemId, direction);
      } catch {
        moveFailed();
      }
    });

  const remove = (category: MenuCategory) =>
    startTransition(async () => {
      await actions.deleteCategory(categoryForm(category.id));
      // Só fecha o editor se o item era desta categoria (ele sumiu com ela): um
      // item em edição noutra categoria continua aberto, com o que foi mudado.
      setEditing((current) => (current && category.items.some((item) => item.id === current) ? null : current));
      toast(t('categoryDeleted'));
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

  // Sem nenhum item disponível, o próximo item novo conclui o passo do
  // cardápio: o toast dele aponta o destino seguinte da configuração — a
  // mesma regra do guia (`continueAfter`), com o que estava gravado antes.
  const firstItem = !allItems(savedMenu).some((item) => item.available);
  const target = firstItem ? continueAfter(business, savedMenu, 'cardapio') : null;
  const next = target
    ? {
        label: tDestination(target.kind === 'publish' ? 'publicar' : target.step),
        href: target.href,
      }
    : null;

  return (
    <div className="space-y-6">
      {menu.map((category, index) => {
        const empty = category.items.length === 0;
        const adding = empty || openAdds.includes(category.id);
        return (
          <Card key={category.id} as="section" padding="none" aria-labelledby={`${category.id}-title`}>
            <header className="flex min-h-14 flex-wrap items-center gap-2 py-2 pl-4 pr-2">
              {renaming === category.id ? (
                <CategoryForm
                  businessId={businessId}
                  category={category}
                  onDone={() => closeRename(category.id)}
                  guardKey={renameKey(category.id)}
                  registerGuard={registerGuard}
                />
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
                        title={t('rename')}
                        onClick={() => openRename(category.id)}
                        className="press -ml-2 inline-flex items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-gray-50 active:bg-gray-100"
                      >
                        <span className="min-w-0">{category.name}</span>
                        <Pencil aria-hidden="true" className="size-4 shrink-0 text-gray-400" />
                      </button>
                    </h2>
                    <span className="text-body2 text-gray-600">{t('itemCount', { count: category.items.length })}</span>
                  </div>
                  <div className="shrink-0">
                    <Menu
                      label={t('categoryOptions', { name: category.name })}
                      items={[
                        {
                          label: t('rename'),
                          icon: <Pencil className="size-[18px]" />,
                          onSelect: () => openRename(category.id),
                        },
                        {
                          label: t('moveUp'),
                          icon: <ArrowUp className="size-[18px]" />,
                          disabled: index === 0,
                          onSelect: () => move(category.id, 'up'),
                        },
                        {
                          label: t('moveDown'),
                          icon: <ArrowDown className="size-[18px]" />,
                          disabled: index === menu.length - 1,
                          onSelect: () => move(category.id, 'down'),
                        },
                        {
                          label: t('deleteCategory'),
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
                  {editing === item.id ? (
                    <ItemForm
                      inline
                      first={itemIndex === 0}
                      businessId={businessId}
                      categories={menu}
                      item={item}
                      onClose={() => closeEditor(item.id, category.id)}
                      onDeleted={() => closeEditor(null, category.id)}
                      guardKey={editKey(item.id)}
                      registerGuard={registerGuard}
                      move={{
                        index: itemIndex,
                        canUp: itemIndex > 0,
                        canDown: itemIndex < category.items.length - 1,
                        onMove: (direction) => moveItem(item.id, itemIndex, direction),
                      }}
                      // A pergunta sobre o que não foi salvo já foi feita no editor.
                      onDuplicated={(copyId) => setEditing(copyId)}
                    />
                  ) : (
                    <ItemRow
                      item={item}
                      onOpen={() => openEditor(item.id)}
                      onToggle={(available) => toggle(item, available)}
                    />
                  )}
                </li>
              ))}
            </ul>

            {/* O rodapé do card é onde o próximo item é escrito. O divisor e o
                título marcam onde a lista acaba e o formulário em branco começa —
                sem eles, o campo vazio pareceria a última linha da categoria. */}
            {adding ? (
              <div data-add-form className="border-t border-gray-200 pt-4">
                <h3 id={`${category.id}-new-item`} className="px-4 text-body2 font-semibold text-gray-700 lg:px-6">
                  {t('newItemIn', { category: category.name })}
                </h3>
                <ItemForm
                  inline
                  standing
                  first
                  businessId={businessId}
                  categories={menu}
                  defaultCategoryId={category.id}
                  next={next}
                  guardKey={addKey(category.id)}
                  registerGuard={registerGuard}
                  labelledBy={`${category.id}-new-item`}
                  onSubmitStart={() => addSubmitted(category.id)}
                  onAdded={() => addSaved(category.id)}
                  // Na categoria vazia ele não fecha: é o que ela está pedindo.
                  onCancel={empty ? undefined : () => closeAdd(category.id)}
                />
              </div>
            ) : (
              <div data-add-button className="border-t border-gray-200 p-4">
                <AddButton onClick={(event) => openAdd(category.id, event)}>{t('addItem')}</AddButton>
              </div>
            )}
          </Card>
        );
      })}

      {menu.length === 0 && (
        <Card padding="none">
          <EmptyState
            icon={<UtensilsCrossed className="size-12" />}
            title={t('emptyTitle')}
            description={t('emptyText')}
          />
        </Card>
      )}

      {/* A próxima categoria já está escrita na tela, no fim de tudo: é para
          onde quem acabou de cadastrar uma categoria inteira está olhando. */}
      <Card as="section" padding="sm" aria-label={t('newCategory')}>
        <CategoryForm
          key={`categoria:${categoryRestarts}`}
          standing
          businessId={businessId}
          onDone={() => setCategoryRestarts((count) => count + 1)}
        />
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={toDelete ? t('confirmTitle', { name: toDelete.name }) : ''}
        description={
          !toDelete || toDelete.items.length === 0
            ? t('confirmEmpty')
            : t('confirmItems', { count: toDelete.items.length })
        }
        confirmLabel={t('confirmLabel')}
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
  const t = useTranslations('painel.menuEditor');
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
        data-item-open={item.id}
        aria-label={t('editItem', { name: item.name })}
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
            {!available && <Tag>{t('soldOut')}</Tag>}
          </span>
          <span className="block text-body2 text-gray-600 tabular-nums">
            {formatPrice(item.price)}
            {groups > 0 && ` · ${t('optionCount', { count: groups })}`}
          </span>
        </span>
      </button>

      <Switch
        checked={available}
        disabled={pending}
        label={t('availableFor', { name: item.name })}
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

/** O botão do título da categoria (o que abre a renomeação). */
function categoryTitleButton(categoryId: string): HTMLButtonElement | null {
  return document.getElementById(`${categoryId}-title`)?.querySelector('button') ?? null;
}

/** O negócio e a categoria em edição vêm do contexto, não de quem digita. */
const CONTEXT_FIELDS = ['businessId', 'categoryId'];

/** Nome (e, ao renomear, a descrição) da categoria, no lugar do título do card. */
function CategoryForm({
  businessId,
  category,
  standing = false,
  onDone,
  guardKey,
  registerGuard,
}: {
  businessId: string;
  category?: MenuCategory;
  /** Nome no registro de guardas do `MenuEditor`, que pergunta por aqui antes de fechar a renomeação. */
  guardKey?: string;
  registerGuard?: (key: string, guard: ItemFormGuard | null) => void;
  /**
   * Formulário da próxima categoria, sempre aberto no pé da página: não rouba o
   * foco ao montar (ele não foi aberto por ninguém) e `onDone` o devolve em
   * branco em vez de fechá-lo.
   */
  standing?: boolean;
  onDone: () => void;
}) {
  const toast = useToast();
  const t = useTranslations('painel.menuEditor');
  const ids = useId();
  // Salvou: o formulário fecha e a categoria aparece na lista.
  const { state, formProps, pending, isEdited, edited, dirty } = useFormAction(async (previous: FormState, formData: FormData) => {
    const result = await actions.saveCategory(previous, formData);
    if (result.success) {
      toast({ message: result.success, tone: 'success' });
      onDone();
    }
    return result;
  }, initialState);
  // Em branco não há o que salvar nem o que limpar. Renomeando, o nome já está
  // lá e os botões nascem acesos.
  const [filled, setFilled] = useState(() => Boolean(category));
  // Renomeando, qualquer mudança não salva conta; na próxima categoria, só o
  // que ainda está escrito. Links e fechar a página perguntam pelo host; Esc
  // pergunta aqui. Cancelar não pergunta (D24).
  const guardDirty = standing ? dirty && filled : dirty;
  const { confirmLeave } = useLeaveGuard(guardDirty);
  useEffect(() => {
    if (!guardKey || !registerGuard) return;
    registerGuard(guardKey, { confirmLeave, dirty: guardDirty });
    return () => registerGuard(guardKey, null);
  }, [guardKey, registerGuard, confirmLeave, guardDirty]);
  // Erro do envio anterior sai quando o lojista volta ao campo para corrigir.
  const error = (field: string) => (isEdited(field) ? undefined : state.fieldErrors?.[field]);

  return (
    <form
      {...formProps}
      onKeyDown={(event) => {
        // Esc devolve o título da categoria ao lugar. O permanente não tem o
        // que fechar, e apagar o que foi digitado ali seria surpresa.
        if (event.key === 'Escape' && !standing) {
          event.preventDefault();
          confirmLeave(onDone);
        }
      }}
      onInput={(event) => {
        formProps.onInput(event);
        setFilled(formHasContent(event.currentTarget, CONTEXT_FIELDS));
      }}
      className="flex w-full flex-wrap items-end gap-3"
    >
      <input type="hidden" name="businessId" value={businessId} />
      {category && <input type="hidden" name="categoryId" value={category.id} />}

      <TextField
        className="min-w-48 flex-1"
        id={`${ids}name`}
        name="name"
        label={t('categoryName')}
        required
        maxLength={MENU_LIMITS.categoryName}
        defaultValue={category?.name ?? ''}
        placeholder={t('categoryPlaceholder')}
        autoComplete="off"
        autoFocus={!standing}
        error={error('name')}
      />
      {category && (
        <TextField
          className="min-w-56 flex-1"
          id={`${ids}description`}
          name="description"
          label={t('categoryDescription')}
          maxLength={MENU_LIMITS.categoryDescription}
          defaultValue={category.description}
          placeholder={t('categoryDescriptionPlaceholder')}
          error={error('description')}
        />
      )}
      {/* Confirmar é sempre o botão mais à direita da linha, e o que desiste
        * fica à esquerda dele — a mesma ordem do formulário de item, do sheet
        * de confirmação e de toda linha de ações do sistema. */}
      <div className="flex items-center gap-2">
        <Button
          variant="text"
          onClick={onDone}
          // "Cancelar" devolve o título da categoria ao lugar e vale sempre;
          // "Limpar" não tem o que limpar num formulário em branco.
          disabled={standing && !filled}
          leading={<X className="size-5" />}
        >
          {standing ? t('clear') : t('cancel')}
        </Button>
        <Button
          type="submit"
          loading={pending}
          disabled={!filled}
          leading={category ? <Check className="size-5" /> : <Plus className="size-5" />}
        >
          {category ? t('save') : t('create')}
        </Button>
      </div>

      {state.error && !edited && (
        <Banner tone="error" role="alert" className="basis-full">
          {state.error}
        </Banner>
      )}
    </form>
  );
}
