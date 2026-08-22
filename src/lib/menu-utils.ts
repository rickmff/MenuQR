import type { MenuCategory, MenuCategoryCard, MenuItem, MenuItemCard } from './types';

export function allItems(menu: MenuCategory[]): MenuItem[] {
  return menu.flatMap((category) => category.items);
}

export function countItems(menu: MenuCategory[]): number {
  return menu.reduce((total, category) => total + category.items.length, 0);
}

export function findItemById(menu: MenuCategory[], itemId: string) {
  for (const category of menu) {
    const item = category.items.find((entry) => entry.id === itemId);
    if (item) return { category, item };
  }
  return undefined;
}

export function findItemBySlug(menu: MenuCategory[], slug: string) {
  for (const category of menu) {
    const item = category.items.find((entry) => entry.slug === slug);
    if (item) return { category, item };
  }
  return undefined;
}

/** Menor preço entre os itens disponíveis — 0 quando o cardápio está vazio. */
export function priceFrom(menu: MenuCategory[]): number {
  const prices = allItems(menu)
    .filter((item) => item.available)
    .map((item) => item.price);
  return prices.length ? Math.min(...prices) : 0;
}

/**
 * Remove os complementos antes de enviar os itens para componentes de cliente:
 * as listagens só precisam saber quantos grupos existem.
 */
export function toCardItem(item: MenuItem): MenuItemCard {
  const { options, ...rest } = item;
  return {
    ...rest,
    optionCount: options.length,
    hasRequiredOptions: options.some((group) => group.required),
  };
}

export function toCardCategory(category: MenuCategory): MenuCategoryCard {
  return { ...category, items: category.items.map(toCardItem) };
}

/** Só as categorias que têm algo para mostrar ao cliente. */
export function visibleMenu(menu: MenuCategory[]): MenuCategory[] {
  return menu.filter((category) => category.items.length > 0);
}
