import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '../db/client';
import { ensureSchema } from '../db/migrate';
import { mapCategory, mapChoice, mapItem, mapOptionGroup } from './mappers';
import type { MenuCategory, MenuItem, MenuOptionGroup } from '@/lib/types';

/**
 * Carrega o cardápio inteiro de um negócio em quatro consultas e monta a
 * árvore em memória — evita o N+1 de buscar complementos item a item.
 */
export async function getMenu(businessId: string): Promise<MenuCategory[]> {
  await ensureSchema();

  const [categories, items, groups, choices] = await Promise.all([
    db.execute({
      sql: 'SELECT * FROM categories WHERE business_id = ? ORDER BY position, rowid',
      args: [businessId],
    }),
    db.execute({
      sql: 'SELECT * FROM items WHERE business_id = ? ORDER BY position, rowid',
      args: [businessId],
    }),
    db.execute({
      sql: `SELECT option_groups.* FROM option_groups
            JOIN items ON items.id = option_groups.item_id
            WHERE items.business_id = ?
            ORDER BY option_groups.position, option_groups.rowid`,
      args: [businessId],
    }),
    db.execute({
      sql: `SELECT option_choices.*, option_groups.item_id FROM option_choices
            JOIN option_groups ON option_groups.id = option_choices.group_id
            JOIN items ON items.id = option_groups.item_id
            WHERE items.business_id = ?
            ORDER BY option_choices.position, option_choices.rowid`,
      args: [businessId],
    }),
  ]);

  const choicesByGroup = new Map<string, MenuOptionGroup['choices']>();
  for (const row of choices.rows) {
    const groupId = String(row.group_id);
    const list = choicesByGroup.get(groupId) ?? [];
    list.push(mapChoice(row));
    choicesByGroup.set(groupId, list);
  }

  const groupsByItem = new Map<string, MenuOptionGroup[]>();
  for (const row of groups.rows) {
    const itemId = String(row.item_id);
    const list = groupsByItem.get(itemId) ?? [];
    list.push(mapOptionGroup(row, choicesByGroup.get(String(row.id)) ?? []));
    groupsByItem.set(itemId, list);
  }

  const itemsByCategory = new Map<string, MenuItem[]>();
  for (const row of items.rows) {
    const categoryId = String(row.category_id);
    const list = itemsByCategory.get(categoryId) ?? [];
    list.push(mapItem(row, groupsByItem.get(String(row.id)) ?? []));
    itemsByCategory.set(categoryId, list);
  }

  return categories.rows.map((row) => mapCategory(row, itemsByCategory.get(String(row.id)) ?? []));
}

/* ------------------------------------------------------------------ categorias */

export async function createCategory(
  businessId: string,
  input: { name: string; slug: string; icon: string; description: string },
): Promise<string> {
  await ensureSchema();
  const id = randomUUID();
  const position = await nextPosition('categories', 'business_id', businessId);
  await db.execute({
    sql: `INSERT INTO categories (id, business_id, slug, name, icon, description, position)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, businessId, input.slug, input.name, input.icon, input.description, position],
  });
  return id;
}

export async function updateCategory(
  id: string,
  businessId: string,
  input: { name: string; slug: string; icon: string; description: string },
): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: `UPDATE categories SET name = ?, slug = ?, icon = ?, description = ?
          WHERE id = ? AND business_id = ?`,
    args: [input.name, input.slug, input.icon, input.description, id, businessId],
  });
}

export async function deleteCategory(id: string, businessId: string): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: 'DELETE FROM categories WHERE id = ? AND business_id = ?',
    args: [id, businessId],
  });
}

/** Move a categoria uma posição para cima ou para baixo. */
export async function moveCategory(id: string, businessId: string, direction: -1 | 1): Promise<void> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT id, position FROM categories WHERE business_id = ? ORDER BY position, rowid',
    args: [businessId],
  });
  const order = result.rows.map((row) => String(row.id));
  const index = order.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return;
  [order[index], order[target]] = [order[target]!, order[index]!];

  await db.batch(
    order.map((categoryId, position) => ({
      sql: 'UPDATE categories SET position = ? WHERE id = ? AND business_id = ?',
      args: [position, categoryId, businessId],
    })),
    'write',
  );
}

export async function categorySlugTaken(
  businessId: string,
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT id FROM categories WHERE business_id = ? AND slug = ? LIMIT 1',
    args: [businessId, slug],
  });
  const row = result.rows[0];
  return Boolean(row) && String(row?.id) !== exceptId;
}

/* ----------------------------------------------------------------------- itens */

export interface ItemInput {
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  image: string;
  imageAlt: string;
  tags: string[];
  allergens: string[];
  serves: string;
  calories: number | null;
  available: boolean;
}

export async function createItem(businessId: string, input: ItemInput): Promise<string> {
  await ensureSchema();
  const id = randomUUID();
  const position = await nextPosition('items', 'category_id', input.categoryId);
  await db.execute({
    sql: `INSERT INTO items (
            id, business_id, category_id, slug, name, description, price, image, image_alt,
            tags, allergens, serves, calories, available, position
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      businessId,
      input.categoryId,
      input.slug,
      input.name,
      input.description,
      input.price,
      input.image,
      input.imageAlt,
      JSON.stringify(input.tags),
      JSON.stringify(input.allergens),
      input.serves,
      input.calories,
      input.available ? 1 : 0,
      position,
    ],
  });
  return id;
}

export async function updateItem(id: string, businessId: string, input: ItemInput): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: `UPDATE items SET
            category_id = ?, slug = ?, name = ?, description = ?, price = ?, image = ?,
            image_alt = ?, tags = ?, allergens = ?, serves = ?, calories = ?, available = ?
          WHERE id = ? AND business_id = ?`,
    args: [
      input.categoryId,
      input.slug,
      input.name,
      input.description,
      input.price,
      input.image,
      input.imageAlt,
      JSON.stringify(input.tags),
      JSON.stringify(input.allergens),
      input.serves,
      input.calories,
      input.available ? 1 : 0,
      id,
      businessId,
    ],
  });
}

export async function deleteItem(id: string, businessId: string): Promise<void> {
  await ensureSchema();
  await db.execute({ sql: 'DELETE FROM items WHERE id = ? AND business_id = ?', args: [id, businessId] });
}

export async function setItemAvailability(
  id: string,
  businessId: string,
  available: boolean,
): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: 'UPDATE items SET available = ? WHERE id = ? AND business_id = ?',
    args: [available ? 1 : 0, id, businessId],
  });
}

export async function getItem(id: string, businessId: string): Promise<MenuItem | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT * FROM items WHERE id = ? AND business_id = ? LIMIT 1',
    args: [id, businessId],
  });
  const row = result.rows[0];
  if (!row) return null;

  const groups = await db.execute({
    sql: 'SELECT * FROM option_groups WHERE item_id = ? ORDER BY position, rowid',
    args: [id],
  });
  const choices = await db.execute({
    sql: `SELECT option_choices.* FROM option_choices
          JOIN option_groups ON option_groups.id = option_choices.group_id
          WHERE option_groups.item_id = ?
          ORDER BY option_choices.position, option_choices.rowid`,
    args: [id],
  });

  const byGroup = new Map<string, MenuOptionGroup['choices']>();
  for (const choice of choices.rows) {
    const groupId = String(choice.group_id);
    const list = byGroup.get(groupId) ?? [];
    list.push(mapChoice(choice));
    byGroup.set(groupId, list);
  }

  return mapItem(
    row,
    groups.rows.map((group) => mapOptionGroup(group, byGroup.get(String(group.id)) ?? [])),
  );
}

export async function itemSlugTaken(
  businessId: string,
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT id FROM items WHERE business_id = ? AND slug = ? LIMIT 1',
    args: [businessId, slug],
  });
  const row = result.rows[0];
  return Boolean(row) && String(row?.id) !== exceptId;
}

/** Regrava os complementos do item de uma vez só. */
export async function replaceItemOptions(
  itemId: string,
  groups: {
    name: string;
    type: 'single' | 'multi';
    required: boolean;
    max: number | null;
    choices: { name: string; price: number }[];
  }[],
): Promise<void> {
  await ensureSchema();
  const statements: { sql: string; args: (string | number | null)[] }[] = [
    { sql: 'DELETE FROM option_groups WHERE item_id = ?', args: [itemId] },
  ];

  groups.forEach((group, groupIndex) => {
    const groupId = randomUUID();
    statements.push({
      sql: `INSERT INTO option_groups (id, item_id, name, type, required, max_choices, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [groupId, itemId, group.name, group.type, group.required ? 1 : 0, group.max, groupIndex],
    });
    group.choices.forEach((choice, choiceIndex) => {
      statements.push({
        sql: 'INSERT INTO option_choices (id, group_id, name, price, position) VALUES (?, ?, ?, ?, ?)',
        args: [randomUUID(), groupId, choice.name, choice.price, choiceIndex],
      });
    });
  });

  await db.batch(statements, 'write');
}

async function nextPosition(table: 'categories' | 'items', column: string, value: string): Promise<number> {
  const result = await db.execute({
    sql: `SELECT COALESCE(MAX(position), -1) + 1 AS next FROM ${table} WHERE ${column} = ?`,
    args: [value],
  });
  return Number(result.rows[0]?.next ?? 0);
}
