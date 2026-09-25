'use server';

import { getTranslations } from 'next-intl/server';
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
  duplicateItem,
  getCategoryName,
  getItem,
  itemSlugTaken,
  moveCategory,
  moveItem,
  replaceItemOptions,
  setItemAvailability,
  updateCategory,
  updateItem,
  type ItemInput,
} from '../repositories/menu';
import { checkCategory, checkItem, checkOptions, copyName, type RuleText } from '@/lib/menu-rules';
import type { FormState } from './business';

/* ------------------------------------------------------------------ categorias */

/**
 * Tradutor de `painel.actions` — as mensagens que voltam ao formulário. As
 * regras moram em `lib/menu-rules.ts`, as mesmas da demonstração, e recebem
 * este tradutor: nenhuma resposta sai com a mensagem crua do validador.
 */
async function actionText(): Promise<RuleText> {
  const t = await getTranslations('painel.actions');
  return (key, values) => t(key as never, values as never);
}

/**
 * O endereço da categoria. Editando sem mudar o nome, fica o gravado: o corte
 * de `lib/slug` mudou (no último hífen que cabe, não mais no 40º caractere), e
 * recalcular a cada salvar trocaria o endereço de quem tem nome longo sem o
 * lojista ter mexido nele. Nome novo, endereço novo.
 */
async function categorySlug(businessId: string, categoryId: string, name: string): Promise<string> {
  const existing = categoryId ? await getCategoryName(categoryId, businessId) : null;
  // Sem endereço gravado (cadastro antigo) não há o que manter: gera um.
  if (existing && existing.name === name && existing.slug) return existing.slug;
  const base = slugify(name) || 'categoria';
  let slug = base;
  let suffix = 2;
  while (await categorySlugTaken(businessId, slug, categoryId || undefined)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
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

  const parsed = checkCategory(
    {
      name: String(formData.get('name') ?? ''),
      description: String(formData.get('description') ?? ''),
    },
    t,
  );
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const slug = await categorySlug(business.id, categoryId, parsed.data.name);

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

  const field = (name: string) => String(formData.get(name) ?? '');
  const parsed = checkItem(
    {
      categoryId: field('categoryId'),
      name: field('name'),
      description: field('description'),
      price: field('price'),
      image: field('image'),
      imageAlt: field('imageAlt'),
      serves: field('serves'),
      calories: field('calories'),
    },
    t,
  );

  // Os complementos chegam como JSON montado pelo editor no navegador, com os
  // grupos do jeito que estão na tela: o erro aponta o número do bloco.
  let options: ReturnType<typeof checkOptions>;
  try {
    options = checkOptions(JSON.parse(String(formData.get('options') ?? '[]')) as unknown, t);
  } catch {
    options = { ok: false, error: t('optionsUnreadable') };
  }

  // Campo e complementos voltam juntos: corrigir um não pode revelar o outro só no envio seguinte.
  if (!parsed.ok || !options.ok) {
    return {
      fieldErrors: {
        ...(parsed.ok ? {} : parsed.fieldErrors),
        ...(options.ok ? {} : { options: options.error }),
      },
    };
  }
  const groups = options.groups;

  if (!(await categoryBelongsTo(parsed.data.categoryId, business.id))) {
    return { fieldErrors: { categoryId: t('categoryNotOwned') } };
  }

  // Mesmo nome, mesmo endereço (ver `categorySlug`): trocar o preço de um
  // prato não pode mudar o link /r/<loja>/item/<prato> que já circula.
  let slug = existing && existing.name === parsed.data.name ? existing.slug : '';
  if (!slug) {
    const base = slugify(parsed.data.name) || 'item';
    slug = base;
    let suffix = 2;
    while (await itemSlugTaken(business.id, slug, itemId || undefined)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  const input: ItemInput = {
    categoryId: parsed.data.categoryId,
    slug,
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    image: parsed.data.image,
    imageAlt: parsed.data.imageAlt || parsed.data.name,
    tags: parseList(formData.get('tags')),
    allergens: parseList(formData.get('allergens')),
    serves: parsed.data.serves,
    calories: parsed.data.calories,
    available: formData.get('available') === 'on',
  };

  const savedId = itemId || (await createItem(business.id, input));
  if (itemId) await updateItem(itemId, business.id, input);

  // `checkOptions` já zerou o preço e o "obrigatório" do "retirar ingredientes".
  await replaceItemOptions(savedId, business.id, groups);

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

/**
 * Sobe ou desce o item uma posição dentro da própria categoria. Os argumentos
 * vêm direto do botão (não há formulário): o dono é conferido como sempre.
 */
export async function moveItemAction(businessId: string, itemId: string, direction: 'up' | 'down'): Promise<void> {
  const { business } = await assertOwnership(businessId);
  await moveItem(itemId, business.id, direction === 'up' ? -1 : 1);
  revalidateStore(business.slug);
}

/**
 * Cria "<nome> (cópia)" logo abaixo do original, na mesma categoria, com a
 * mesma foto e os mesmos complementos — quem tem cinco hambúrgueres com o
 * mesmo "Ponto da carne" não redigita o grupo cinco vezes. Devolve o id da
 * cópia para o editor abrir nela.
 *
 * A foto é a MESMA `/img/<id>` do original, não uma cópia dos bytes: a limpeza
 * de órfãs (`deleteOrphanImages`) só apaga imagem que nenhum item usa, então
 * trocar a foto de um dos dois não leva a do outro junto.
 */
export async function duplicateItemAction(
  businessId: string,
  itemId: string,
): Promise<{ id?: string; success?: string; error?: string }> {
  const t = await actionText();

  let business;
  try {
    ({ business } = await assertOwnership(businessId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : t('saveFailed') };
  }

  const original = await getItem(itemId, business.id);
  if (!original) return { error: t('itemMissing') };

  const name = copyName(original.name, t);
  const base = slugify(name) || 'item';
  let slug = base;
  let suffix = 2;
  while (await itemSlugTaken(business.id, slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  const id = await duplicateItem(original, business.id, { name, slug });
  revalidateStore(business.slug);
  return { id, success: t('itemDuplicated') };
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
