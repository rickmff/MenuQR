'use server';

import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { assertOwnership } from '../auth/guards';
import { cleanupOrphanImagesLater } from '../image-cleanup';
import { revalidateStore } from '../revalidate';
import { slugify } from '../repositories/businesses';
import {
  categoryBelongsTo,
  categorySlugTaken,
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  getItem,
  itemSlugTaken,
  moveCategory,
  replaceItemOptions,
  setItemAvailability,
  updateCategory,
  updateItem,
  type ItemInput,
} from '../repositories/menu';
import { isValidImageRef, parsePriceInput } from '@/lib/format';
import type { FormState } from './business';

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}

/* ------------------------------------------------------------------ categorias */

/** Tradutor de `painel.actions` — as mensagens que voltam ao formulário. */
type ActionText = Awaited<ReturnType<typeof actionText>>;

function actionText() {
  return getTranslations('painel.actions');
}

function categorySchema(t: ActionText) {
  return z.object({
    name: z.string().trim().min(2, t('categoryName')).max(60),
    description: z.string().trim().max(300).default(''),
  });
}

export async function saveCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const businessId = String(formData.get('businessId') ?? '');
  const categoryId = String(formData.get('categoryId') ?? '');
  const t = await actionText();

  let business;
  try {
    ({ business } = await assertOwnership(businessId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : t('saveFailed') };
  }

  const parsed = categorySchema(t).safeParse({
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const base = slugify(parsed.data.name) || 'categoria';
  let slug = base;
  let suffix = 2;
  while (await categorySlugTaken(business.id, slug, categoryId || undefined)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  const input = { ...parsed.data, slug };
  if (categoryId) {
    await updateCategory(categoryId, business.id, input);
  } else {
    await createCategory(business.id, input);
  }

  revalidateStore(business.slug);
  return { success: categoryId ? t('categoryUpdated') : t('categoryCreated') };
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const { business } = await assertOwnership(String(formData.get('businessId') ?? ''));
  await deleteCategory(String(formData.get('categoryId') ?? ''), business.id);
  revalidateStore(business.slug);
  // Os itens da categoria foram junto, e as fotos deles ficaram sem dono.
  cleanupOrphanImagesLater(business.id);
}

export async function moveCategoryAction(formData: FormData): Promise<void> {
  const { business } = await assertOwnership(String(formData.get('businessId') ?? ''));
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  await moveCategory(String(formData.get('categoryId') ?? ''), business.id, direction);
  revalidateStore(business.slug);
}

/* ----------------------------------------------------------------------- itens */

const choiceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().min(0).max(10000),
});

function groupSchema(t: ActionText) {
  return z.object({
    name: z.string().trim().min(1, t('groupName')).max(80),
    type: z.enum(['single', 'multi', 'remove']),
    required: z.boolean(),
    max: z.number().int().min(1).max(20).nullable(),
    choices: z.array(choiceSchema).min(1, t('groupChoices')).max(30),
  });
}

type GroupInput = z.infer<ReturnType<typeof groupSchema>>;

function itemSchema(t: ActionText) {
  return z.object({
    categoryId: z.string().min(1, t('itemCategory')),
    name: z.string().trim().min(2, t('itemName')).max(80),
    description: z.string().trim().max(600).default(''),
    price: z
      .number({ error: t('itemPrice') })
      .min(0, t('priceInvalid'))
      .max(100000, t('priceInvalid')),
    image: z
      .string()
      .trim()
      .max(300)
      .refine(isValidImageRef, t('imageInvalid'))
      .default('🍽️'),
    imageAlt: z.string().trim().max(160).default(''),
    serves: z.string().trim().max(60).default(''),
    calories: z
      .number({ error: t('caloriesInvalid') })
      .int(t('caloriesInvalid'))
      .min(0)
      .max(20000)
      .nullable(),
  });
}

function parseList(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function saveItemAction(_state: FormState, formData: FormData): Promise<FormState> {
  const businessId = String(formData.get('businessId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const t = await actionText();

  let business;
  try {
    ({ business } = await assertOwnership(businessId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : t('saveFailed') };
  }

  // O id do item vem de um campo oculto: só vale se o item for deste negócio.
  const existing = itemId ? await getItem(itemId, business.id) : null;
  if (itemId && !existing) {
    return { error: t('itemMissing') };
  }

  const caloriesRaw = String(formData.get('calories') ?? '').trim();

  const parsed = itemSchema(t).safeParse({
    categoryId: String(formData.get('categoryId') ?? ''),
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
    price: parsePriceInput(String(formData.get('price') ?? '')),
    image: String(formData.get('image') ?? '🍽️'),
    imageAlt: String(formData.get('imageAlt') ?? ''),
    serves: String(formData.get('serves') ?? ''),
    calories: caloriesRaw ? Number(caloriesRaw) : null,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  if (!(await categoryBelongsTo(parsed.data.categoryId, business.id))) {
    return { fieldErrors: { categoryId: t('categoryNotOwned') } };
  }

  // Os complementos chegam como JSON montado pelo editor no navegador.
  let groups: GroupInput[] = [];
  try {
    const rawOptions = JSON.parse(String(formData.get('options') ?? '[]')) as unknown;
    const result = z.array(groupSchema(t)).max(10).safeParse(rawOptions);
    if (!result.success) {
      return { fieldErrors: { options: result.error.issues[0]?.message ?? t('optionsInvalid') } };
    }
    groups = result.data;
  } catch {
    return { fieldErrors: { options: t('optionsUnreadable') } };
  }

  const base = slugify(parsed.data.name) || 'item';
  let slug = base;
  let suffix = 2;
  while (await itemSlugTaken(business.id, slug, itemId || undefined)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  const input: ItemInput = {
    categoryId: parsed.data.categoryId,
    slug,
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    image: parsed.data.image || '🍽️',
    imageAlt: parsed.data.imageAlt || parsed.data.name,
    tags: parseList(formData.get('tags')),
    allergens: parseList(formData.get('allergens')),
    serves: parsed.data.serves,
    calories: parsed.data.calories,
    available: formData.get('available') === 'on',
  };

  const savedId = itemId || (await createItem(business.id, input));
  if (itemId) await updateItem(itemId, business.id, input);

  await replaceItemOptions(
    savedId,
    business.id,
    groups.map((group) => ({
      name: group.name,
      type: group.type,
      required: group.required,
      max: group.type === 'single' ? null : group.max,
      // Tirar um ingrediente não custa nada, mesmo que o formulário mande preço.
      choices: group.type === 'remove' ? group.choices.map((choice) => ({ ...choice, price: 0 })) : group.choices,
    })),
  );

  // A revalidação do painel já devolve a lista atualizada junto com a resposta.
  revalidateStore(business.slug);
  // Foto trocada: a antiga ficou sem dono.
  if (existing && existing.image !== input.image) cleanupOrphanImagesLater(business.id);
  return { success: itemId ? t('itemSaved') : t('itemAdded') };
}

export async function deleteItemAction(formData: FormData): Promise<void> {
  const { business } = await assertOwnership(String(formData.get('businessId') ?? ''));
  await deleteItem(String(formData.get('itemId') ?? ''), business.id);
  revalidateStore(business.slug);
  cleanupOrphanImagesLater(business.id);
}

export async function toggleItemAvailabilityAction(formData: FormData): Promise<void> {
  const { business } = await assertOwnership(String(formData.get('businessId') ?? ''));
  await setItemAvailability(
    String(formData.get('itemId') ?? ''),
    business.id,
    formData.get('available') === 'true',
  );
  revalidateStore(business.slug);
}
