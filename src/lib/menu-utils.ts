import { isSearchableAddress } from './delivery-area';
import type { UiText } from './i18n';
import type { Business, MenuCategory, MenuCategoryCard, MenuItem, MenuItemCard, MenuOptionGroup } from './types';

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

/**
 * "Retirar ingredientes" nunca é obrigatório: o salvar já grava assim, mas um
 * grupo gravado antes com a caixa marcada (no banco, no navegador da
 * demonstração ou dentro de um link) travaria o "Adicionar" na loja até o
 * lojista salvar o item de novo. Por isso a leitura também corrige.
 */
export function normalizeGroup(group: MenuOptionGroup): MenuOptionGroup {
  return group.type === 'remove' && group.required ? { ...group, required: false } : group;
}

/** O cardápio com `normalizeGroup` aplicado — o mesmo objeto quando nada muda. */
export function normalizeMenu(menu: MenuCategory[]): MenuCategory[] {
  const needs = allItems(menu).some((item) => item.options.some((group) => normalizeGroup(group) !== group));
  if (!needs) return menu;
  return menu.map((category) => ({
    ...category,
    items: category.items.map((item) => ({ ...item, options: item.options.map(normalizeGroup) })),
  }));
}

/** Só as categorias que têm algo para mostrar ao cliente. */
export function visibleMenu(menu: MenuCategory[]): MenuCategory[] {
  return menu.filter((category) => category.items.length > 0);
}

/** Motivo que impede publicar: o texto sai de `describePublishBlocker`. */
export type PublishBlocker = 'noWhatsapp' | 'noAvailableItem' | 'noOrderMode' | 'noAddress' | 'noHours';

/**
 * Rua e cidade do restaurante. Sem elas a retirada diz "Retirada no local" sem
 * dizer onde, e o mapa da entrega não tem de onde medir.
 */
export function hasAddress(business: Pick<Business, 'address'>): boolean {
  // O mesmo mínimo com que o mapa procura o endereço: publicar e mapa não divergem.
  return isSearchableAddress(business.address);
}

/**
 * Por que este cardápio ainda não pode ir ao ar — `null` quando pode.
 * Publicar sem WhatsApp, sem nenhum item à venda ou sem entrega nem retirada
 * entrega ao cliente uma página onde o pedido não fecha; sem endereço, o
 * cliente não sabe onde retirar; sem nenhum dia aberto, a loja diz "Fechado"
 * para sempre. Espelha os passos obrigatórios do guia (`REQUIRED` em
 * `components/painel/setup-steps.ts`): cada motivo daqui, menos o WhatsApp
 * (que vem do cadastro), deixa um desses passos pendente, e vice-versa.
 * Entrega ligada sem bairro nem raio não bloqueia: é "taxa a combinar" na
 * conversa, um jeito válido de trabalhar.
 */
export function publishBlocker(
  business: Pick<Business, 'whatsapp' | 'address' | 'delivery' | 'pickup' | 'hours'>,
  menu: MenuCategory[],
): PublishBlocker | null {
  if (!business.whatsapp) return 'noWhatsapp';
  if (!allItems(menu).some((item) => item.available)) return 'noAvailableItem';
  if (!business.delivery.enabled && !business.pickup.enabled) return 'noOrderMode';
  if (!hasAddress(business)) return 'noAddress';
  if (!Object.values(business.hours).some((ranges) => ranges.length > 0)) return 'noHours';
  return null;
}

/** "Cadastre o WhatsApp que recebe os pedidos antes de publicar." — `null` passa direto. */
export function describePublishBlocker(blocker: PublishBlocker | null, { t }: Pick<UiText, 't'>): string | null {
  return blocker ? t(`publishBlocker.${blocker}`) : null;
}
