'use client';

import { ArrowDown, ArrowUp, Check, ChevronDown, Copy, Plus, Trash2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { usePanelBottomBar } from '@/components/painel/bottom-inset';
import { ImageField } from '@/components/painel/image-field';
import { DEFAULT_IMAGE } from '@/lib/menu-rules';
import { leaveTo, useLeaveGuard } from '@/components/painel/leave-guard';
import { formHasContent, useFormAction } from '@/components/use-form-action';
import { AddButton } from '@/components/ui/add-button';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { SelectField, TextArea, TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { demoMode } from '@/lib/demo/config';
import { demoDeleteItemAction, demoDuplicateItemAction, demoSaveItemAction } from '@/lib/demo/actions';
import { isBlankGroup, MENU_LIMITS } from '@/lib/menu-rules';
import { deleteItemAction, duplicateItemAction, saveItemAction } from '@/server/actions/menu';
import type { FormState } from '@/server/actions/business';
import type { MenuCategory, MenuItem, OptionType } from '@/lib/types';

const initialState: FormState = {};

/**
 * O que não conta como "algo preenchido": o negócio, o item em edição, a
 * categoria (que já vem escolhida), a disponibilidade e os complementos — estes
 * últimos são conferidos à parte, porque o campo oculto guarda `[]` quando não
 * há nenhum.
 */
const CONTEXT_FIELDS = ['businessId', 'itemId', 'categoryId', 'available', 'options'];

/** Campos que moram em "Mais detalhes": erro em qualquer um abre a seção. */
const DETAIL_FIELDS = ['categoryId', 'serves', 'calories', 'imageAlt'];

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

/*
 * Exemplo no campo vazio e rótulo da opção, conforme o tipo do grupo, moram
 * nas mensagens: `painel.itemForm.groupPlaceholder.<tipo>`,
 * `choicePlaceholder.<tipo>` e `choiceLabel.<tipo>` — no "retirar", cada opção
 * é um ingrediente.
 */

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

/**
 * O que o formulário diz a quem monta vários na mesma tela (`MenuEditor`):
 * como perguntar antes de fechá-lo e se ainda há o que perder nele.
 */
export interface ItemFormGuard {
  confirmLeave: (proceed: () => void) => void;
  dirty: boolean;
}

export type ItemMoveDirection = 'up' | 'down';

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
  /**
   * Formulário do próximo item, no pé da categoria: não rouba o foco nem puxa
   * a página ao montar (quem o abre por "Adicionar item" dá o foco), e salvar
   * não fecha nada — ele volta em branco no lugar, com o Nome em foco, para o
   * seguinte.
   */
  standing?: boolean;
  /** Primeiro da lista: sem a linha divisória em cima. */
  first?: boolean;
  onClose?: () => void;
  /**
   * Embutido: o item foi excluído. Sem isto, excluir fecha pelo `onClose`.
   * Existe porque a linha do item ainda pode estar na lista quando o editor
   * fecha (a lista nova chega depois), e quem devolve o foco precisa saber
   * que ela vai sumir.
   */
  onDeleted?: () => void;
  /**
   * Formulário de acrescentar que pode fechar (a categoria já tem itens):
   * "Cancelar" e Esc chamam isto. Sem ele é o da categoria vazia, que fica
   * aberto — o botão é "Limpar".
   */
  onCancel?: () => void;
  /** O formulário de acrescentar foi enviado: quem monta o segura aberto enquanto a lista muda. */
  onSubmitStart?: () => void;
  /** O formulário de acrescentar gravou um item (o envio recusado não chama). */
  onAdded?: () => void;
  /** Id do título que nomeia o formulário ("Novo item em Bebidas"), quando há vários na tela. */
  labelledBy?: string;
  /**
   * O próximo destino da configuração, quando o item novo é o primeiro
   * disponível do cardápio: o toast de sucesso leva até ele.
   */
  next?: { label: string; href: string } | null;
  /** Mover o item dentro da categoria — só no editor embutido de um item salvo. */
  move?: {
    /** Posição atual na categoria; mudar é o sinal de que a lista chegou na ordem nova. */
    index: number;
    canUp: boolean;
    canDown: boolean;
    onMove: (direction: ItemMoveDirection) => void;
  };
  /** Duplicou: quem monta abre o editor da cópia. Sem isto, não há "Duplicar item". */
  onDuplicated?: (id: string) => void;
  /** Nome deste formulário no registro de `registerGuard`. */
  guardKey?: string;
  /** Quem troca de formulário sem passar por ele (abrir outra linha) pergunta por aqui antes. */
  registerGuard?: (key: string, guard: ItemFormGuard | null) => void;
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
  standing = false,
  first = false,
  onClose,
  onDeleted,
  onCancel,
  onSubmitStart,
  onAdded,
  labelledBy,
  next,
  move,
  onDuplicated,
  guardKey,
  registerGuard,
}: ItemFormProps) {
  const router = useRouter();
  const toast = useToast();
  const t = useTranslations('painel.itemForm');
  const ids = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDetailsElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  /*
   * A pergunta de "Descartar alterações?" mais recente. O toast do primeiro
   * item é montado no `finish` e tocado depois, com o formulário já em branco
   * e talvez com o próximo item começado: ele pergunta pelo estado de agora.
   */
  const leaveRef = useRef<(proceed: () => void) => void>((proceed) => proceed());

  const [groups, setGroups] = useState<GroupDraft[]>(() => toDrafts(item));
  // Formulário em branco não tem o que salvar nem o que limpar: os dois botões
  // só acendem quando há algo dentro. Editando um item já existente eles
  // nascem acesos, porque os campos chegam preenchidos.
  const [typed, setTyped] = useState(() => Boolean(item));
  const syncTyped = () => setTyped(formHasContent(formRef.current, CONTEXT_FIELDS));
  // Salvar com a foto ainda subindo gravaria a imagem antiga sem avisar ninguém.
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [duplicating, startDuplicate] = useTransition();
  // A foto guarda a imagem no próprio estado, onde `form.reset()` não chega:
  // em branco, só ela é remontada.
  const [imageKey, setImageKey] = useState(0);
  // Pedido de foco no Nome, atendido depois que o formulário em branco aparece.
  const [focusName, setFocusName] = useState(0);
  // A resposta que "Limpar" dispensou: o erro dela não volta para a tela.
  const [dismissed, setDismissed] = useState<FormState | null>(null);

  /*
   * O formulário de acrescentar volta em branco NO LUGAR: `form.reset()` nos
   * campos, e o estado (complementos, foto) zerado à mão. Antes ele era
   * remontado por `key`, e o <input> em foco sumia junto — o foco caía no
   * <body>, cada item a mais custava um toque, e no iPhone o teclado fechava;
   * foco dado depois, fora do toque, não o reabre (armadilha 21). Resetando no
   * lugar, o Nome é o mesmo elemento e o foco só passa de um campo a outro com
   * o teclado ainda aberto.
   */
  const blank = () => {
    const form = formRef.current;
    if (!form) return;
    form.reset();
    // As seções recolhidas voltam fechadas, como num formulário novo.
    form.querySelectorAll('details').forEach((details) => {
      details.open = false;
    });
    setGroups([]);
    setTyped(false);
    setImageKey((key) => key + 1);
  };

  const finish = (message: string) => {
    if (standing) {
      // O primeiro item disponível conclui o passo do cardápio: o toast diz
      // para onde a configuração segue e leva até lá.
      // "Continuar" é um router.push, não um link: o `LeaveGuardHost` não o
      // vê, e a pergunta passa por aqui.
      const target = next;
      toast(
        target
          ? {
              message: t('addedNext', { destination: target.label }),
              tone: 'success',
              action: { label: t('continue'), onClick: () => leaveRef.current(() => leaveTo(router, target.href)) },
            }
          : { message, tone: 'success' },
      );
      blank();
      onAdded?.();
      setFocusName((count) => count + 1);
      return;
    }
    toast({ message, tone: 'success' });
    if (inline) onClose?.();
    else leaveTo(router, '/painel/cardapio');
  };

  const {
    state: response,
    formProps,
    pending,
    isEdited,
    edited,
    dirty,
    markEdited,
  } = useFormAction(async (previous: FormState, formData: FormData) => {
    const result = await (demoMode ? demoSaveItemAction : saveItemAction)(previous, formData);
    if (result.success) finish(result.success);
    // Erro numa seção recolhida a abre — aqui, na chegada da resposta, e nunca
    // pelo atributo `open`: a resposta seguinte sem erro nela o tiraria, e a
    // seção fecharia no meio da correção.
    const errors = result.fieldErrors;
    if (errors?.options && optionsRef.current) optionsRef.current.open = true;
    if (DETAIL_FIELDS.some((field) => errors?.[field]) && detailsRef.current) detailsRef.current.open = true;
    return result;
  }, initialState, formRef);
  const state = response === dismissed ? initialState : response;

  // Depois de "Adicionar ao cardápio", o Nome do próximo item já em foco —
  // sem rolar a página: `nearest` só mexe se o campo tiver saído da tela
  // (quando os complementos abertos fecham e o formulário encolhe).
  useEffect(() => {
    if (focusName === 0) return;
    const name = formRef.current?.elements.namedItem('name');
    if (!(name instanceof HTMLInputElement)) return;
    name.focus({ preventScroll: true });
    name.scrollIntoView({ block: 'nearest' });
  }, [focusName]);

  // "Limpar" devolve o formulário em branco, sem o erro da resposta anterior,
  // e põe o cursor no Nome (o próprio botão apaga, e o foco sairia dele).
  const clear = () => {
    blank();
    setDismissed(response);
    const name = formRef.current?.elements.namedItem('name');
    if (name instanceof HTMLInputElement) name.focus({ preventScroll: true });
  };

  // Embutido, o formulário aparece onde estava a linha: garante que ele entre
  // na tela. O permanente não: ele já estava ali, e rolar sozinho ao carregar a
  // página jogaria o lojista para a última categoria.
  useEffect(() => {
    if (!inline || standing) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    formRef.current?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [inline, standing]);

  // O erro que o servidor devolveu some assim que o lojista mexe no campo: ele
  // está corrigindo, e o aviso antigo ao lado do valor novo parecia recusá-lo.
  const error = (field: string) => (isEdited(field) ? undefined : state.fieldErrors?.[field]);
  // A faixa de baixo resume a resposta anterior: sai ao primeiro toque no formulário.
  const hasFieldErrors = Boolean(state.fieldErrors && Object.keys(state.fieldErrors).length > 0) && !edited;

  // A exclusão não passa pelo <form> do item: é outra ação, disparada depois
  // da confirmação. Ao terminar, a lista já vem sem o item.
  const removeItem = () => {
    if (!item) return;
    const formData = new FormData();
    formData.set('businessId', businessId);
    formData.set('itemId', item.id);
    startDelete(async () => {
      await (demoMode ? demoDeleteItemAction : deleteItemAction)(formData);
      toast(t('deleted'));
      if (inline) (onDeleted ?? onClose)?.();
      else leaveTo(router, '/painel/cardapio');
    });
  };

  // O editor envia os complementos como JSON num campo oculto, do jeito que
  // estão na tela — um grupo por bloco, os números como foram digitados. Quem
  // confere é o servidor (`lib/menu-rules.ts`): só o grupo totalmente em branco
  // fica de fora, e o erro de qualquer outro volta com o número do bloco. Antes
  // o grupo com nome e sem opção era filtrado aqui e sumia sem aviso.
  const optionsPayload = JSON.stringify(
    groups.map((group) => ({
      name: group.name,
      type: group.type,
      required: group.required,
      max: group.max,
      choices: group.choices.map((choice) => ({ name: choice.name, price: choice.price })),
    })),
  );

  // Desistir: fecha o editor (ou o de acrescentar); na página própria, volta à lista.
  const cancel = () => {
    if (!inline) leaveTo(router, '/painel/cardapio');
    else if (standing) onCancel?.();
    else onClose?.();
  };

  // Complemento montado também é conteúdo, e ele não vive num campo do <form>.
  const filled = typed || groups.some((group) => !isBlankGroup(group));

  // O que se perde ao sair sem salvar: no editor, qualquer mudança; no de
  // acrescentar, só o que ainda está escrito (Limpar já descartou o resto).
  // Links e fechar a página são segurados pelo `LeaveGuardHost`; trocar de
  // linha e Esc perguntam por `confirmLeave`. Cancelar não pergunta (D24).
  const guardDirty = standing ? dirty && filled : dirty;
  const { confirmLeave } = useLeaveGuard(guardDirty);
  useEffect(() => {
    leaveRef.current = confirmLeave;
  }, [confirmLeave]);
  useEffect(() => {
    if (!guardKey || !registerGuard) return;
    registerGuard(guardKey, { confirmLeave, dirty: guardDirty });
    return () => registerGuard(guardKey, null);
  }, [guardKey, registerGuard, confirmLeave, guardDirty]);

  // O formulário de acrescentar em branco não tem barra grudada: no celular
  // ela flutuava sobre o Nome e o Preço dele mesmo, sem nada para salvar.
  const stickyBar = !standing || filled;
  usePanelBottomBar(barRef, stickyBar);

  // A cópia sai do que está gravado: o que foi mudado aqui e não salvo ficaria
  // para trás sem aviso — daí a mesma pergunta de trocar de linha. Pronta, o
  // editor fecha e abre a cópia, com o Nome em foco para renomear. Se falhar, o
  // editor fica com a alteração, e ela continua protegida: "Descartar" só tira
  // o formulário do registro quando ele desmonta (`leave-guard.tsx`).
  const duplicate = () => {
    if (!item || !onDuplicated) return;
    const original = item;
    confirmLeave(() =>
      startDuplicate(async () => {
        const result = await (demoMode ? demoDuplicateItemAction : duplicateItemAction)(businessId, original.id);
        if (!result.id) {
          toast({ message: result.error ?? t('duplicateFailed'), tone: 'error' });
          return;
        }
        if (result.success) toast({ message: result.success, tone: 'success' });
        onDuplicated(result.id);
      }),
    );
  };

  // Mover troca o <li> de lugar na lista, e o navegador tira o foco do que sai
  // do documento no caminho. O pedido fica guardado até a lista chegar na
  // ordem nova (a posição muda); aí o foco volta à seta — ou à outra, se esta
  // chegou na ponta e apagou.
  const moveFocus = useRef<ItemMoveDirection | null>(null);
  const moveTo = (direction: ItemMoveDirection) => {
    moveFocus.current = direction;
    move?.onMove(direction);
  };
  const moveIndex = move?.index;
  useEffect(() => {
    const direction = moveFocus.current;
    if (!direction) return;
    moveFocus.current = null;
    const form = formRef.current;
    if (!form) return;
    const wanted = form.querySelector<HTMLButtonElement>(`[data-move="${direction}"]`);
    const other = form.querySelector<HTMLButtonElement>(`[data-move="${direction === 'up' ? 'down' : 'up'}"]`);
    const target = wanted && !wanted.disabled ? wanted : other;
    if (target && document.activeElement !== target) target.focus({ preventScroll: true });
  }, [moveIndex]);

  // Toda mudança nos complementos passa por aqui: a lista vive em estado, e os
  // campos dela não têm `name` — sem o aviso, o erro do bloco não saberia que
  // o lojista já está corrigindo.
  const changeGroups = (update: (current: GroupDraft[]) => GroupDraft[]) => {
    setGroups(update);
    markEdited('options');
  };

  // "Escolher uma" nasce obrigatório: um "Tamanho" opcional ganha o "+" rápido
  // na loja (D5) e o cliente põe a pizza na sacola sem escolher o tamanho.
  const addGroup = () =>
    changeGroups((current) => [
      ...current,
      {
        key: nextKey(),
        name: '',
        type: 'single',
        required: true,
        max: '',
        choices: [{ key: nextKey(), name: '', price: '' }],
      },
    ]);

  const updateGroup = (key: string, patch: Partial<GroupDraft>) =>
    changeGroups((current) => current.map((group) => (group.key === key ? { ...group, ...patch } : group)));

  // Trocar para "Escolher uma" liga o obrigatório pelo mesmo motivo; para
  // "Retirar ingredientes" desliga, porque obrigar a tirar algo trava o pedido.
  const changeType = (group: GroupDraft, type: OptionType) =>
    updateGroup(group.key, {
      type,
      required: type === 'single' ? true : type === 'remove' ? false : group.required,
    });

  const removeGroup = (key: string) => changeGroups((current) => current.filter((group) => group.key !== key));

  const addChoice = (groupKey: string) =>
    changeGroups((current) =>
      current.map((group) =>
        group.key === groupKey
          ? { ...group, choices: [...group.choices, { key: nextKey(), name: '', price: '' }] }
          : group,
      ),
    );

  const updateChoice = (groupKey: string, choiceKey: string, patch: Partial<ChoiceDraft>) =>
    changeGroups((current) =>
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
    changeGroups((current) =>
      current.map((group) =>
        group.key === groupKey
          ? { ...group, choices: group.choices.filter((choice) => choice.key !== choiceKey) }
          : group,
      ),
    );

  // Resumo de cada seção recolhida, para saber o que há dentro sem abrir. Conta
  // só o grupo que vai ser gravado — com nome e alguma opção —, e não o bloco
  // em branco ou o que ainda vai voltar com erro.
  const namedGroups = groups
    .filter((group) => group.name.trim() && group.choices.some((choice) => choice.name.trim()))
    .map((group) => group.name.trim());
  const optionsSummary = namedGroups.length
    ? t('optionsSummary', { count: namedGroups.length, names: namedGroups.join(', ') })
    : t('optionsNone');
  const detailParts = item
    ? [
        item.serves && t('detailServes', { serves: item.serves }),
        item.tags.length > 0 && t('detailTags', { count: item.tags.length }),
        item.allergens.length > 0 && t('detailAllergens', { count: item.allergens.length }),
        item.calories && t('detailCalories', { calories: item.calories }),
      ].filter(Boolean)
    : [];
  const detailsSummary = detailParts.length ? detailParts.join(' · ') : t('detailsEmpty');

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
        aria-labelledby={labelledBy}
        noValidate
        onSubmit={(event) => {
          onSubmitStart?.();
          formProps.onSubmit(event);
        }}
        onInput={(event) => {
          formProps.onInput(event);
          syncTyped();
        }}
        onChange={syncTyped}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          // Esc fecha o editor embutido e o formulário de acrescentar que
          // pode fechar, como fecharia um sheet — perguntando antes se há o
          // que perder. O da categoria vazia não fecha: Esc ali não faz nada.
          const close = standing ? onCancel : inline ? onClose : undefined;
          if (!close) return;
          event.preventDefault();
          confirmLeave(close);
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

        {/* Ordem dentro da categoria. Mora no editor, e não na linha: a linha
            já leva foto, nome, preço, interruptor e seta, e no celular não
            cabem mais dois alvos de toque. */}
        {move && (
          <div role="group" aria-label={t('position')} className="-mt-1 flex items-center justify-end gap-1">
            <span aria-hidden="true" className="mr-1 text-body2 text-gray-600">
              {t('position')}
            </span>
            <IconButton
              data-move="up"
              label={t('moveUp')}
              icon={<ArrowUp className="size-5" />}
              disabled={!move.canUp}
              onClick={() => moveTo('up')}
            />
            <IconButton
              data-move="down"
              label={t('moveDown')}
              icon={<ArrowDown className="size-5" />}
              disabled={!move.canDown}
              onClick={() => moveTo('down')}
            />
          </div>
        )}

        {/* Celular: a foto (96px) ao lado só do Nome, o Preço embaixo — antes a
            foto ocupava uma linha inteira com ~200px vazios ao lado, e foto,
            Nome e Preço juntos na mesma linha não cabem em 390px. sm+: foto à
            esquerda, Nome e Preço na mesma linha, Descrição por baixo dos dois.
            No celular o campo da foto é `contents`: o quadro fica na coluna de
            96px e a mensagem dele (lembrete, erro de HEIC ou de tamanho) ganha
            uma linha inteira embaixo — presa nos 96px, ela passava de oito
            linhas e empurrava o Preço. Sem mensagem, ela sai da grade
            (`sr-only`, mas continua região viva) e não deixa um vão. */}
        <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-4 sm:grid-cols-[8rem_minmax(0,1fr)_10rem]">
          <div className="contents sm:block sm:row-span-2">
            <ImageField
              className="contents sm:block"
              messageClassName="col-span-2 row-start-2 -mt-3 data-[empty]:sr-only sm:mt-0"
              key={imageKey}
              id={`${ids}image`}
              name="image"
              label={t('photo')}
              businessId={businessId}
              // A foto padrão (🍽️) não é escolha do lojista: o quadro abre vazio, como a logo.
              defaultValue={item && item.image !== DEFAULT_IMAGE ? item.image : ''}
              error={error('image')}
              savedBy={item ? 'save' : 'add'}
              onBusyChange={setUploading}
              onValueChange={() => {
                markEdited('image');
                syncTyped();
              }}
            />
          </div>

          <TextField
            id={`${ids}name`}
            name="name"
            label={t('name')}
            required
            maxLength={MENU_LIMITS.itemName}
            defaultValue={item?.name}
            placeholder={t('namePlaceholder')}
            autoComplete="off"
            autoFocus={inline && !standing}
            error={error('name')}
          />
          <TextField
            className="col-span-2 w-40 sm:col-span-1 sm:w-auto"
            id={`${ids}price`}
            name="price"
            label={t('price')}
            required
            inputMode="decimal"
            defaultValue={item ? priceInput(item.price) : ''}
            placeholder="29,90"
            error={error('price')}
          />

          <TextArea
            className="col-span-2 sm:col-start-2"
            id={`${ids}description`}
            name="description"
            label={t('description')}
            rows={2}
            maxLength={MENU_LIMITS.itemDescription}
            defaultValue={item?.description}
            placeholder={t('descriptionPlaceholder')}
            error={error('description')}
          />
        </div>

        {/* Com erro nos complementos, a seção abre sozinha na chegada da resposta. */}
        <details ref={optionsRef} className="group rounded-sm border border-gray-200">
          <summary className={summaryClass}>
            <ChevronDown aria-hidden="true" className={chevronClass} />
            <span className="shrink-0">{t('options')}</span>
            <span className="ml-auto min-w-0 truncate text-right font-normal text-gray-600">{optionsSummary}</span>
          </summary>

          <div className="space-y-3 border-t border-gray-200 p-4">
            <p className="text-body2 text-gray-600">{t('optionsIntro')}</p>
            {error('options') && (
              <Banner tone="error" role="alert">
                {error('options')}
              </Banner>
            )}

            {groups.map((group, groupIndex) => (
              <fieldset key={group.key} className="space-y-3 rounded-sm border border-gray-200 bg-gray-50 p-3">
                <legend className="sr-only">{t('groupLegend', { number: groupIndex + 1 })}</legend>

                <div className="flex flex-wrap items-end gap-3">
                  <TextField
                    className="min-w-48 flex-1"
                    id={`${ids}g${groupIndex}-name`}
                    label={t('groupName')}
                    maxLength={MENU_LIMITS.groupName}
                    value={group.name}
                    onChange={(event) => updateGroup(group.key, { name: event.target.value })}
                    placeholder={t(`groupPlaceholder.${group.type}`)}
                  />
                  <SelectField
                    className="min-w-56"
                    id={`${ids}g${groupIndex}-type`}
                    label={t('type')}
                    value={group.type}
                    onChange={(event) => changeType(group, event.target.value as OptionType)}
                  >
                    <option value="single">{t('types.single')}</option>
                    <option value="multi">{t('types.multi')}</option>
                    <option value="remove">{t('types.remove')}</option>
                  </SelectField>
                  {group.type !== 'single' && (
                    <TextField
                      className="w-24"
                      id={`${ids}g${groupIndex}-max`}
                      label={t('max')}
                      value={group.max}
                      onChange={(event) => updateGroup(group.key, { max: event.target.value })}
                      inputMode="numeric"
                      placeholder="4"
                    />
                  )}
                  {/* "Retirar ingredientes" não tem obrigatório: obrigar o cliente a
                      tirar algo travaria o pedido de quem quer o prato como vem. */}
                  {group.type !== 'remove' && (
                    <label className="flex h-12 items-center gap-2 text-body2 text-gray-700">
                      <input
                        type="checkbox"
                        checked={group.required}
                        onChange={(event) => updateGroup(group.key, { required: event.target.checked })}
                        className="size-5 accent-primary"
                      />
                      {t('required')}
                    </label>
                  )}
                  <IconButton
                    label={t('removeGroup')}
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
                        label={t(`choiceLabel.${group.type}`)}
                        maxLength={MENU_LIMITS.choiceName}
                        value={choice.name}
                        onChange={(event) => updateChoice(group.key, choice.key, { name: event.target.value })}
                        placeholder={t(`choicePlaceholder.${group.type}`)}
                      />
                      {/* Tirar ingrediente não tem preço: o campo sai para não sugerir cobrança. */}
                      {group.type !== 'remove' && (
                        <TextField
                          // Celular: linha de baixo, estreito; sm+: a segunda coluna da mesma linha.
                          className="col-span-2 row-start-2 w-32 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:w-auto"
                          id={`${ids}g${groupIndex}c${choiceIndex}-price`}
                          label={t('extraPrice')}
                          value={choice.price}
                          onChange={(event) => updateChoice(group.key, choice.key, { price: event.target.value })}
                          placeholder="0,00"
                          inputMode="decimal"
                        />
                      )}
                      {/* 32px de desenho, 44px de toque (`hit`). */}
                      <IconButton
                        size="sm"
                        hit
                        label={t('removeChoice')}
                        icon={<X className="size-4" />}
                        onClick={() => removeChoice(group.key, choice.key)}
                        className="col-start-2 row-start-1 mb-2 sm:col-start-3"
                      />
                    </li>
                  ))}
                </ul>

                <AddButton onClick={() => addChoice(group.key)}>{t('addChoice')}</AddButton>
              </fieldset>
            ))}

            <AddButton onClick={addGroup}>{t('addGroup')}</AddButton>
          </div>
        </details>

        {/* Idem com erro num campo daqui (`DETAIL_FIELDS`). */}
        <details ref={detailsRef} className="group rounded-sm border border-gray-200">
          <summary className={summaryClass}>
            <ChevronDown aria-hidden="true" className={chevronClass} />
            <span className="shrink-0">{t('details')}</span>
            <span className="ml-auto min-w-0 truncate text-right font-normal text-gray-600">{detailsSummary}</span>
          </summary>

          <div className="grid gap-4 border-t border-gray-200 p-4 sm:grid-cols-2">
            {showCategory && (
              <SelectField
                id={`${ids}category`}
                name="categoryId"
                label={t('category')}
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
              label={t('serves')}
              maxLength={MENU_LIMITS.serves}
              defaultValue={item?.serves}
              placeholder={t('servesPlaceholder')}
              error={error('serves')}
            />
            <TextField
              id={`${ids}tags`}
              name="tags"
              label={t('tags')}
              hint={t('tagsHint')}
              defaultValue={item?.tags.join(', ')}
              placeholder={t('tagsPlaceholder')}
            />
            <TextField
              id={`${ids}allergens`}
              name="allergens"
              label={t('allergens')}
              hint={t('allergensHint')}
              defaultValue={item?.allergens.join(', ')}
              placeholder={t('allergensPlaceholder')}
            />
            <TextField
              id={`${ids}calories`}
              name="calories"
              label={t('calories')}
              inputMode="numeric"
              defaultValue={item?.calories ?? ''}
              placeholder="540"
              error={error('calories')}
            />
            <TextField
              className="sm:col-span-2"
              id={`${ids}imageAlt`}
              name="imageAlt"
              label={t('imageAlt')}
              hint={t('imageAltHint')}
              maxLength={MENU_LIMITS.imageAlt}
              defaultValue={item?.imageAlt}
              placeholder={t('imageAltPlaceholder')}
              error={error('imageAlt')}
            />
          </div>
        </details>

        {/* O retorno do salvamento mora junto do botão, que é o que está na
            tela. A barra gruda no rodapé enquanto o formulário for mais alto
            que a janela (e se registra, para a pílula do guia e o toast não a
            cobrirem). Excluir fica à esquerda, longe de Salvar; a ação
            principal é a última à direita (D24).
            Abaixo de sm tudo cabe numa linha só — em duas linhas a barra comia
            133px, e com o teclado aberto sobravam 128px de formulário —, e o
            principal nunca fica mais estreito que o próprio rótulo (ele
            cortava para "Adicionar ao car…" a 390px e sumia a 320px). A linha
            tem 254px a 320px, 294px a 360px e 324px a 390px (o card menos os
            16px de cada lado), e os rótulos são medidos em Inter 600 de 14px:
            - item novo: "Cancelar" sem o X (93) + "+ Adicionar" (135, com a
              borda) = 228 + 4 de vão. O título "Novo item em X" já diz onde
              ele entra, e o rótulo inteiro volta a partir de sm. "Limpar" com
              o X (107) + 135 = 242 + 4;
            - item salvo: lixeira, Duplicar e Cancelar só com o ícone (48 cada,
              "Cancelar" continua no nome acessível: ali ele fecha o editor) e
              "Salvar" sem o check (85) = 229 + 12 de vão.
            O vão é de 4px abaixo de sm: com 8px a conta do item salvo sobrava
            3px a 320px. */}
        <div
          ref={barRef}
          className={cn(
            '-mx-4 -mb-4 flex flex-wrap items-center gap-x-1 gap-y-2 rounded-b-md border-t border-gray-200 bg-white px-4 py-3 sm:gap-3 lg:-mx-6 lg:-mb-6 lg:px-6',
            stickyBar && 'sticky bottom-0 z-10',
          )}
        >
          {state.error && !edited && (
            <Banner tone="error" role="alert" className="basis-full">
              {state.error}
            </Banner>
          )}
          {/* Cada campo recusado já se anuncia (`role="alert"` no erro dele):
              a faixa é só o resumo, e não repete o anúncio — como no negócio. */}
          {hasFieldErrors && !state.error && (
            <Banner tone="error" role="status" className="basis-full">
              {t('notSaved')}
            </Banner>
          )}
          {item && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmDelete(true)}
              className="press inline-flex size-12 shrink-0 items-center justify-center gap-2 rounded-sm text-body2 font-semibold text-gray-600 hover:bg-gray-100 hover:text-error active:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 sm:w-auto sm:px-3"
            >
              <Trash2 aria-hidden="true" className="size-5" />
              <span className="sr-only sm:not-sr-only">{deleting ? t('deleting') : t('delete')}</span>
            </button>
          )}
          {/* Duplicar fica com Excluir, do lado oposto ao principal: é outra
              ação sobre o item gravado, não um jeito de salvar (D24). */}
          {item && onDuplicated && (
            <button
              type="button"
              disabled={duplicating || deleting}
              onClick={duplicate}
              className="press inline-flex size-12 shrink-0 items-center justify-center gap-2 rounded-sm text-body2 font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-400 sm:w-auto sm:px-3"
            >
              <Copy aria-hidden="true" className="size-5" />
              <span className="sr-only sm:not-sr-only">{duplicating ? t('duplicating') : t('duplicate')}</span>
            </button>
          )}
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1 sm:flex-none sm:gap-3">
            {inline && standing && !onCancel ? (
              // O da categoria vazia não fecha: o que o botão faz é devolver o
              // formulário em branco — e não há o que limpar num em branco.
              <Button
                variant="text"
                size="sm"
                className="shrink-0 sm:h-12 sm:px-5"
                onClick={clear}
                disabled={!filled}
                leading={<X className="size-5" />}
              >
                {t('clear')}
              </Button>
            ) : item ? (
              // "Cancelar" fecha e vale sempre, até com o campo vazio. É botão,
              // e não link, também na página própria: o `LeaveGuardHost`
              // pergunta antes de seguir um link, e desistir de propósito
              // descarta sem perguntar (D24). No item salvo, abaixo de sm, só o
              // X (o mesmo desenho da lixeira e do Duplicar ao lado), com o
              // nome no leitor de tela; a partir de sm, o `Button text` de sempre.
              <button
                type="button"
                onClick={cancel}
                className="press inline-flex size-12 shrink-0 items-center justify-center gap-2 rounded-sm text-body2 font-semibold text-primary hover:bg-gray-50 active:bg-gray-100 sm:w-auto sm:px-5"
              >
                <X aria-hidden="true" className="size-5" />
                <span className="sr-only sm:not-sr-only">{t('cancel')}</span>
              </button>
            ) : (
              <Button
                variant="text"
                size="sm"
                className="shrink-0 sm:h-12 sm:px-5"
                onClick={cancel}
                leading={<X className="hidden size-5 sm:block" />}
              >
                {t('cancel')}
              </Button>
            )}
            <Button
              type="submit"
              className="min-w-0 flex-1 sm:flex-none"
              loading={pending}
              disabled={uploading || deleting || duplicating || !filled}
              leading={item ? <Check className="hidden size-5 sm:block" /> : <Plus className="size-5" />}
            >
              {item ? (
                t('save')
              ) : (
                <>
                  <span className="sm:hidden">{t('addShort')}</span>
                  <span className="hidden sm:inline">{t('add')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {item && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => setConfirmDelete(false)}
          title={t('confirmTitle', { name: item.name })}
          description={t('confirmText')}
          confirmLabel={t('confirmLabel')}
          onConfirm={removeItem}
        />
      )}
    </>
  );
}
