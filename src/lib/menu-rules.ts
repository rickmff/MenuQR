import { isValidImageRef, parsePriceInput } from '@/lib/format';
import type { OptionType } from '@/lib/types';

/**
 * As regras do que pode ser gravado no cardápio — categoria, item, grupo de
 * complementos e opção — num módulo puro, usado pela server action
 * (`server/actions/menu.ts`) e pela ação do modo demonstração
 * (`lib/demo/actions.ts`). Antes cada caminho tinha a sua cópia: o servidor
 * respondia "Too big: expected number to be <=20" (a mensagem crua do Zod) e a
 * demonstração nem conferia o limite.
 *
 * Toda regra tem mensagem própria, escrita para o lojista, em
 * `painel.actions.*`. Quem chama entrega o tradutor desse namespace: no
 * servidor, `getTranslations`; na demonstração, `createTranslator`.
 */

export type RuleText = (key: string, values?: Record<string, string | number>) => string;

/**
 * Limites de tamanho. Os de dinheiro estão escritos também nas mensagens
 * (`priceMax`, `choicePriceMax`): mudou aqui, muda lá.
 */
export const MENU_LIMITS = {
  categoryName: 60,
  categoryDescription: 300,
  itemName: 80,
  itemDescription: 600,
  itemPrice: 100_000,
  image: 300,
  imageAlt: 160,
  serves: 60,
  calories: 20_000,
  groups: 10,
  groupName: 80,
  choices: 30,
  choiceName: 80,
  choicePrice: 10_000,
  maxChoices: 20,
} as const;

/** A foto que o item ganha quando fica sem nenhuma — o quadro do painel a trata como vazio. */
export const DEFAULT_IMAGE = '🍽️';
const OPTION_TYPES: readonly OptionType[] = ['single', 'multi', 'remove'];

export type FieldErrors = Record<string, string>;
type Checked<T> = { ok: true; data: T } | { ok: false; fieldErrors: FieldErrors };

/** Tamanho como o lojista conta: "🍔" é uma letra, não duas. */
function length(value: string): number {
  return [...value].length;
}

function tooLong(value: string, max: number, t: RuleText): string | null {
  const count = length(value);
  return count > max ? t('tooLong', { max, count }) : null;
}

/** Nome obrigatório de categoria ou item: vazio, curto demais ou longo demais. */
function nameError(value: string, max: number, emptyKey: string, t: RuleText): string | null {
  if (!value) return t(emptyKey);
  if (length(value) < 2) return t('nameShort');
  return tooLong(value, max, t);
}

/* ------------------------------------------------------------------ categoria */

export interface CategoryFields {
  name: string;
  description: string;
}

export function checkCategory(raw: { name: string; description: string }, t: RuleText): Checked<CategoryFields> {
  const name = raw.name.trim();
  const description = raw.description.trim();
  const fieldErrors: FieldErrors = {};

  const nameProblem = nameError(name, MENU_LIMITS.categoryName, 'categoryName', t);
  if (nameProblem) fieldErrors.name = nameProblem;
  const descriptionProblem = tooLong(description, MENU_LIMITS.categoryDescription, t);
  if (descriptionProblem) fieldErrors.description = descriptionProblem;

  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };
  return { ok: true, data: { name, description } };
}

/* ----------------------------------------------------------------------- item */

export interface ItemFields {
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  imageAlt: string;
  serves: string;
  calories: number | null;
}

/** Os campos do item como chegam do formulário: tudo texto. */
export interface ItemRaw {
  categoryId: string;
  name: string;
  description: string;
  price: string;
  image: string;
  imageAlt: string;
  serves: string;
  calories: string;
}

export function checkItem(raw: ItemRaw, t: RuleText): Checked<ItemFields> {
  const fieldErrors: FieldErrors = {};
  const set = (field: string, message: string | null) => {
    if (message && !fieldErrors[field]) fieldErrors[field] = message;
  };

  const categoryId = raw.categoryId.trim();
  if (!categoryId) set('categoryId', t('itemCategory'));

  const name = raw.name.trim();
  set('name', nameError(name, MENU_LIMITS.itemName, 'itemName', t));

  const description = raw.description.trim();
  set('description', tooLong(description, MENU_LIMITS.itemDescription, t));

  // "29,90", "R$ 1.234,50" ou "29.9": o lojista escreve como quiser.
  const price = parsePriceInput(raw.price);
  if (price === null) set('price', t('itemPrice'));
  else if (price > MENU_LIMITS.itemPrice) set('price', t('priceMax'));

  const image = raw.image.trim() || DEFAULT_IMAGE;
  if (length(image) > MENU_LIMITS.image || !isValidImageRef(image)) set('image', t('imageInvalid'));

  const imageAlt = raw.imageAlt.trim();
  set('imageAlt', tooLong(imageAlt, MENU_LIMITS.imageAlt, t));

  const serves = raw.serves.trim();
  set('serves', tooLong(serves, MENU_LIMITS.serves, t));

  const caloriesText = raw.calories.trim();
  let calories: number | null = null;
  if (caloriesText) {
    if (!/^\d+$/.test(caloriesText)) set('calories', t('caloriesInvalid'));
    else if (Number(caloriesText) > MENU_LIMITS.calories) set('calories', t('caloriesMax'));
    else calories = Number(caloriesText);
  }

  if (Object.keys(fieldErrors).length || price === null) return { ok: false, fieldErrors };
  return { ok: true, data: { categoryId, name, description, price, image, imageAlt, serves, calories } };
}

/* -------------------------------------------------------------- complementos */

/**
 * Grupo como o editor do navegador manda: os números ainda como texto, do
 * jeito que foram digitados ("4,50", "3"), para o erro poder apontar o que
 * está errado em vez de virar zero em silêncio.
 */
export interface OptionGroupDraft {
  name: string;
  type: string;
  required: boolean;
  max: string | number | null;
  choices: { name: string; price: string | number }[];
}

export interface OptionGroupInput {
  name: string;
  type: OptionType;
  required: boolean;
  max: number | null;
  choices: { name: string; price: number }[];
}

function textOf(value: unknown): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return typeof value === 'string' ? value.trim() : '';
}

/** Opção sem nome e sem preço: a linha em branco que o editor abre sozinho. */
function isBlankChoice(choice: { name?: unknown; price?: unknown }, type: unknown): boolean {
  if (textOf(choice.name)) return false;
  // No "retirar" o preço nem aparece na tela: o que sobrou dele não conta.
  if (type === 'remove') return true;
  const price = textOf(choice.price);
  return !price || !parsePriceInput(price);
}

/**
 * Grupo em que nada foi escrito — sem nome, sem máximo e sem nenhuma opção
 * preenchida. É o único que some ao salvar: "Adicionar grupo" sem querer não
 * pode travar o item. Grupo com nome e sem opção NÃO é vazio — ele volta com
 * erro, em vez de sumir calado como sumia.
 */
export function isBlankGroup(group: { name?: unknown; type?: unknown; max?: unknown; choices?: unknown }): boolean {
  if (textOf(group.name)) return false;
  if (group.type !== 'single' && textOf(group.max)) return false;
  const choices: unknown[] = Array.isArray(group.choices) ? group.choices : [];
  return choices.every((choice) => isBlankChoice((choice ?? {}) as { name?: unknown; price?: unknown }, group.type));
}

/** Nome do grupo dentro da mensagem de erro: curto, para caber na faixa. */
function shortName(name: string): string {
  const chars = [...name];
  return chars.length > 24 ? `${chars.slice(0, 23).join('')}…` : name;
}

/**
 * Confere os grupos de complementos. `number` nas mensagens é a posição do
 * grupo NA TELA (1, 2, 3…), contando os vazios que ficam de fora, para o
 * "Grupo 4" do erro ser o quarto bloco que o lojista vê.
 */
export function checkOptions(
  raw: unknown,
  t: RuleText,
): { ok: true; groups: OptionGroupInput[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: t('optionsInvalid') };

  const groups: OptionGroupInput[] = [];
  for (const [index, entry] of raw.entries()) {
    if (!entry || typeof entry !== 'object') return { ok: false, error: t('optionsInvalid') };
    const group = entry as Partial<OptionGroupDraft>;
    if (isBlankGroup(group)) continue;

    const number = index + 1;
    const name = textOf(group.name);
    const fail = (message: string) => ({
      ok: false as const,
      error: name
        ? t('groupErrorNamed', { number, name: shortName(name), message })
        : t('groupError', { number, message }),
    });
    const failChoice = (choice: number, message: string) => ({
      ok: false as const,
      error: name
        ? t('choiceErrorNamed', { number, name: shortName(name), choice, message })
        : t('choiceError', { number, choice, message }),
    });

    const type = group.type as OptionType;
    if (!OPTION_TYPES.includes(type)) return { ok: false, error: t('optionsInvalid') };
    if (!name) return fail(t('groupNameMissing'));
    if (length(name) > MENU_LIMITS.groupName) return fail(t('groupNameLong', { max: MENU_LIMITS.groupName }));

    // O máximo só existe para "várias" e "retirar"; no "escolher uma" é sempre 1.
    let max: number | null = null;
    const maxText = type === 'single' ? '' : textOf(group.max);
    if (maxText) {
      const parsed = /^\d+$/.test(maxText) ? Number(maxText) : NaN;
      if (!(parsed >= 1 && parsed <= MENU_LIMITS.maxChoices)) {
        return fail(t('groupMaxRange', { max: MENU_LIMITS.maxChoices }));
      }
      max = parsed;
    }

    const choices: OptionGroupInput['choices'] = [];
    const rawChoices: unknown[] = Array.isArray(group.choices) ? group.choices : [];
    for (const [choiceIndex, choiceEntry] of rawChoices.entries()) {
      const choice = (choiceEntry ?? {}) as { name?: unknown; price?: unknown };
      if (isBlankChoice(choice, type)) continue;
      const position = choiceIndex + 1;
      const choiceName = textOf(choice.name);
      if (!choiceName) return failChoice(position, t('choiceNameMissing'));
      if (length(choiceName) > MENU_LIMITS.choiceName) {
        return failChoice(position, t('choiceNameLong', { max: MENU_LIMITS.choiceName }));
      }

      // Tirar um ingrediente não custa nada, mesmo que tenha sobrado preço de
      // quando o grupo era de outro tipo.
      let price = 0;
      if (type !== 'remove') {
        const priceText = textOf(choice.price);
        const parsed = typeof choice.price === 'number' ? choice.price : priceText ? parsePriceInput(priceText) : 0;
        if (parsed === null || !Number.isFinite(parsed) || parsed < 0) {
          return failChoice(position, t('choicePriceInvalid'));
        }
        if (parsed > MENU_LIMITS.choicePrice) return failChoice(position, t('choicePriceMax'));
        price = parsed;
      }
      choices.push({ name: choiceName, price });
    }

    if (choices.length === 0) return fail(t('groupNoChoices'));
    if (choices.length > MENU_LIMITS.choices) return fail(t('groupTooManyChoices', { max: MENU_LIMITS.choices }));

    groups.push({
      name,
      type,
      // "Retirar ingredientes" nunca é obrigatório: quem não quer tirar nada
      // não conseguiria pôr o prato na sacola.
      required: type === 'remove' ? false : Boolean(group.required),
      max,
      choices,
    });
  }

  if (groups.length > MENU_LIMITS.groups) return { ok: false, error: t('groupsMax', { max: MENU_LIMITS.groups }) };
  return { ok: true, groups };
}

/** "<nome> (cópia)" sem passar do limite do nome: o que sai é o fim do nome original. */
export function copyName(name: string, t: RuleText): string {
  const full = t('copyName', { name });
  const overflow = length(full) - MENU_LIMITS.itemName;
  if (overflow <= 0) return full;
  const chars = [...name];
  return t('copyName', { name: chars.slice(0, Math.max(1, chars.length - overflow)).join('').trimEnd() });
}
