'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { OptionGroup, optionGroupId } from '@/components/store/option-group';
import { useStore } from '@/components/store/store-provider';
import { useBackToMenu } from '@/components/store/use-back-to-menu';
import { useSearchParam } from '@/components/store/use-search-param';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { StickyBottomBar } from '@/components/ui/sticky-bottom-bar';
import { fieldClass } from '@/components/ui/text-field';
import { Stepper } from '@/components/ui/stepper';
import { useToast } from '@/components/ui/toast';
import { formatPrice } from '@/lib/format';
import { tapHaptic } from '@/lib/haptics';
import { scrollBehavior } from '@/lib/reduced-motion';
import { calculateUnitPrice } from '@/lib/whatsapp';
import type { CartLineSelections, MenuItem, MenuOptionGroup } from '@/lib/types';

const NOTES_MAX = 140;

/** Nada vem pré-escolhido: é a escolha do cliente que libera o botão. */
function emptySelections(item: MenuItem): CartLineSelections {
  const initial: CartLineSelections = {};
  for (const group of item.options) if (group.type !== 'single') initial[group.id] = [];
  return initial;
}

/** As escolhas guardadas numa linha da sacola, completadas com os grupos que ela não tinha. */
function selectionsOf(item: MenuItem, stored: CartLineSelections): CartLineSelections {
  return { ...emptySelections(item), ...stored };
}

function firstMissing(item: MenuItem, selections: CartLineSelections): MenuOptionGroup | undefined {
  return item.options.find((group) => {
    if (!group.required) return false;
    const chosen = selections[group.id];
    return Array.isArray(chosen) ? chosen.length === 0 : !chosen;
  });
}

/**
 * Escolha de complementos, quantidade e observação de um item do cardápio.
 *
 * Também é a tela de EDITAR uma linha da sacola: com `?editar=<uid>` na URL o
 * prato abre como está na sacola e o botão vira "Atualizar", que regrava a
 * linha e devolve a pessoa à sacola — como no iFood.
 */
export function ItemOrderPanel({ item }: { item: MenuItem }) {
  const t = useTranslations('store.itemOrder');
  const { cart, addItem, updateLine, openCart, openCartAfterNav } = useStore();
  const toast = useToast();
  const { back, origin } = useBackToMenu();
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selections, setSelections] = useState<CartLineSelections>(() => emptySelections(item));
  const [announcement, setAnnouncement] = useState('');

  // A sacola só chega depois da hidratação, então a linha em edição é copiada
  // para o estado assim que aparece — uma vez por uid (ajuste de estado durante
  // o render, o mesmo padrão de bottom-sheet.tsx). Uid de outro prato é ignorado.
  const editUid = useSearchParam('editar');
  const editingLine = editUid
    ? cart.find((line) => line.uid === editUid && line.itemId === item.id)
    : undefined;
  const [loadedUid, setLoadedUid] = useState('');
  if (editingLine && loadedUid !== editingLine.uid) {
    setLoadedUid(editingLine.uid);
    setQuantity(editingLine.quantity);
    setNotes(editingLine.notes);
    setSelections(selectionsOf(item, editingLine.selections));
  }

  const unitPrice = useMemo(() => calculateUnitPrice(item, selections), [item, selections]);
  const missing = firstMissing(item, selections);

  /** +1 acrescenta uma unidade (ou marca); −1 tira a última (ou desmarca). */
  const adjust = (group: MenuOptionGroup, choiceId: string, delta: 1 | -1) => {
    setSelections((current) => {
      const chosen = Array.isArray(current[group.id]) ? (current[group.id] as string[]) : [];
      if (delta < 0) {
        const index = chosen.lastIndexOf(choiceId);
        if (index === -1) return current;
        return { ...current, [group.id]: chosen.filter((_, position) => position !== index) };
      }
      if (group.max !== null && chosen.length >= group.max) return current;
      // Tirar um ingrediente é sim ou não: não se repete.
      if (group.type === 'remove' && chosen.includes(choiceId)) return current;
      return { ...current, [group.id]: [...chosen, choiceId] };
    });
  };

  /**
   * Toque no "Adicionar" cinza: em vez de nada acontecer, a página rola até o
   * grupo que falta — o selo OBRIGATÓRIO dele explica o porquê — e o foco vai
   * para a primeira opção.
   */
  const revealMissing = () => {
    if (!missing) return;
    const section = document.getElementById(optionGroupId(missing.id));
    section?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
    section?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true });
    setAnnouncement(t('missingChoice', { group: missing.name }));
  };

  const handleSubmit = () => {
    if (missing) return;
    if (editingLine) {
      updateLine(editingLine.uid, quantity, selections, notes);
      // A edição saiu da sacola: volta para ela. Veio de lá nesta visita → o
      // voltar cai na entrada da sacola, que reabre sozinha; senão, navega e
      // abre depois que o cardápio estiver na tela.
      if (origin() === 'cart') back();
      else openCartAfterNav();
      return;
    }
    addItem(item.id, quantity, selections, notes);
    tapHaptic();
    // Como nos apps: volta ao cardápio na mesma posição, avisa e a barra da sacola sobe.
    toast({ message: t('added'), action: { label: t('viewBag'), onClick: () => openCart('cart') } });
    back();
  };

  if (!item.available) {
    return (
      <div className="pb-32 lg:contents">
        <div className="px-4 pt-6">
          <Banner tone="neutral" radius="md" title={t('unavailableTitle')}>
            {t('unavailableDescription')}
          </Banner>
        </div>
        <StickyBottomBar tone="gradient" className="lg:sticky">
          <Button size="cta" pill fullWidth aria-disabled>
            {t('unavailable')}
          </Button>
        </StickyBottomBar>
      </div>
    );
  }

  const total = formatPrice(unitPrice * quantity);

  return (
    // `lg:contents`: no desktop a barra gruda no pé da área que rola, e o
    // sticky só anda dentro do pai. Com este invólucro fora da caixa, o pai
    // passa a ser o painel inteiro e o CTA aparece sem rolar.
    <div className="pb-32 lg:contents">
      {item.options.map((group) => (
        <OptionGroup
          key={group.id}
          group={group}
          itemId={item.id}
          selected={selections[group.id]}
          onSelectSingle={(choiceId) => setSelections((current) => ({ ...current, [group.id]: choiceId }))}
          onAdjust={(choiceId, delta) => adjust(group, choiceId, delta)}
        />
      ))}

      <div className="px-4 pt-8">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`notes-${item.id}`} className="text-subtitle font-semibold text-gray-900">
            {t('notesLabel')}
          </label>
          <span id={`notes-${item.id}-count`} className={`text-caption tabular-nums ${notes.length >= NOTES_MAX ? 'text-error' : 'text-gray-600'}`}>
            {notes.length}/{NOTES_MAX}
          </span>
        </div>
        <textarea
          id={`notes-${item.id}`}
          rows={3}
          maxLength={NOTES_MAX}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t('notesPlaceholder')}
          aria-describedby={`notes-${item.id}-count`}
          className={fieldClass(false, 'mt-3 min-h-24 resize-none py-3', 'soft')}
        />
      </div>

      {/* A quantidade fica no conteúdo, grande e centrada, antes do CTA. */}
      <div className="mt-8 flex justify-center">
        <Stepper size="lg" variant="soft" value={quantity} min={1} max={99} onChange={setQuantity} label={item.name} />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {/* O contador só fala ao chegar no limite — a cada tecla seria ruído. */}
      <p role="status" aria-live="polite" className="sr-only">
        {notes.length >= NOTES_MAX ? t('notesLimit', { max: NOTES_MAX }) : ''}
      </p>

      {/* No celular o CTA flutua sobre um degradê, fixo no pé; no painel do
          desktop gruda no pé da área que rola. */}
      <StickyBottomBar tone="gradient" className="lg:sticky lg:mt-6">
        {/* Bloqueado, o botão ignora o clique (aria-disabled) mas o evento sobe até aqui:
            é assim que o toque no cinza leva ao grupo que falta. */}
        <div onClick={missing ? revealMissing : undefined}>
          <Button
            size="cta"
            pill
            fullWidth
            aria-disabled={missing ? true : undefined}
            onClick={handleSubmit}
            className="cursor-pointer tabular-nums"
          >
            {t(editingLine ? 'update' : 'add', { quantity, total })}
          </Button>
        </div>
      </StickyBottomBar>
    </div>
  );
}
