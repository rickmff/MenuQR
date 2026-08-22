'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { assertOwnership } from '../auth/guards';
import { slugify } from '../repositories/businesses';
import {
  categorySlugTaken,
  createCategory,
  createItem,
  deleteCategory,
  deleteItem,
  itemSlugTaken,
  moveCategory,
  replaceItemOptions,
  setItemAvailability,
  updateCategory,
  updateItem,
  type ItemInput,
} from '../repositories/menu';
import type { FormState } from './business';

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}

/** Revalida o painel e o cardápio público do negócio alterado. */
function revalidateBusiness(slug: string) {
  revalidatePath('/painel', 'layout');
  revalidatePath(`/r/${slug}`, 'layout');
  revalidatePath('/sitemap.xml');
}

/* ------------------------------------------------------------------ categorias */

const categorySchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome da categoria.').max(60),
  icon: z.string().trim().max(8).default(''),
  description: z.string().trim().max(300).default(''),
});

export async function saveCategoryAction(_state: FormState, formData: FormData): Promise<FormState> {
  const businessId = String(formData.get('businessId') ?? '');
  const categoryId = String(formData.get('categoryId') ?? '');

  let business;
  try {
    ({ business } = await assertOwnership(businessId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Não foi possível salvar.' };
  }

  const parsed = categorySchema.safeParse({
    name: String(formData.get('name') ?? ''),
    icon: String(formData.get('icon') ?? ''),
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

  revalidateBusiness(business.slug);
  return { success: categoryId ? 'Categoria atualizada.' : 'Categoria criada.' };
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const { business } = await assertOwnership(String(formData.get('businessId') ?? ''));
  await deleteCategory(String(formData.get('categoryId') ?? ''), business.id);
  revalidateBusiness(business.slug);
}

export async function moveCategoryAction(formData: FormData): Promise<void> {
  const { business } = await assertOwnership(String(formData.get('businessId') ?? ''));
  const direction = formData.get('direction') === 'up' ? -1 : 1;
  await moveCategory(String(formData.get('categoryId') ?? ''), business.id, direction);
  revalidateBusiness(business.slug);
}

/* ----------------------------------------------------------------------- itens */

const choiceSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().min(0).max(10000),
});

const groupSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao grupo de complementos.').max(80),
  type: z.enum(['single', 'multi']),
  required: z.boolean(),
  max: z.number().int().min(1).max(20).nullable(),
  choices: z.array(choiceSchema).min(1, 'Cada grupo precisa de pelo menos uma opção.').max(30),
});

const itemSchema = z.object({
  categoryId: z.string().min(1, 'Escolha a categoria do item.'),
  name: z.string().trim().min(2, 'Informe o nome do item.').max(80),
  description: z.string().trim().max(600).default(''),
  price: z.number().min(0, 'Informe um preço válido.').max(100000),
  image: z.string().trim().max(300).default('🍽️'),
  imageAlt: z.string().trim().max(160).default(''),
  serves: z.string().trim().max(60).default(''),
  calories: z.number().int().min(0).max(20000).nullable(),
});

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

  let business;
  try {
    ({ business } = await assertOwnership(businessId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Não foi possível salvar.' };
  }

  const priceRaw = Number(String(formData.get('price') ?? '').replace(',', '.'));
  const caloriesRaw = String(formData.get('calories') ?? '').trim();

  const parsed = itemSchema.safeParse({
    categoryId: String(formData.get('categoryId') ?? ''),
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
    price: Number.isFinite(priceRaw) ? priceRaw : -1,
    image: String(formData.get('image') ?? '🍽️'),
    imageAlt: String(formData.get('imageAlt') ?? ''),
    serves: String(formData.get('serves') ?? ''),
    calories: caloriesRaw ? Number(caloriesRaw) : null,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  // Os complementos chegam como JSON montado pelo editor no navegador.
  let groups: z.infer<typeof groupSchema>[] = [];
  try {
    const rawOptions = JSON.parse(String(formData.get('options') ?? '[]')) as unknown;
    const result = z.array(groupSchema).max(10).safeParse(rawOptions);
    if (!result.success) {
      return { fieldErrors: { options: result.error.issues[0]?.message ?? 'Complementos inválidos.' } };
    }
    groups = result.data;
  } catch {
    return { fieldErrors: { options: 'Não foi possível ler os complementos.' } };
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
    groups.map((group) => ({
      name: group.name,
      type: group.type,
      required: group.required,
      max: group.type === 'multi' ? group.max : null,
      choices: group.choices,
    })),
  );

  revalidateBusiness(business.slug);
  redirect('/painel/cardapio?salvo=1');
}

export async function deleteItemAction(formData: FormData): Promise<void> {
  const { business } = await assertOwnership(String(formData.get('businessId') ?? ''));
  await deleteItem(String(formData.get('itemId') ?? ''), business.id);
  revalidateBusiness(business.slug);
}

export async function toggleItemAvailabilityAction(formData: FormData): Promise<void> {
  const { business } = await assertOwnership(String(formData.get('businessId') ?? ''));
  await setItemAvailability(
    String(formData.get('itemId') ?? ''),
    business.id,
    formData.get('available') === 'true',
  );
  revalidateBusiness(business.slug);
}
