import 'server-only';
import { cache } from 'react';
import { getBusinessBySlug } from './repositories/businesses';
import { getMenu } from './repositories/menu';
import { demoMode } from '@/lib/demo/config';
import { sampleStore } from '@/lib/demo/sample-data';
import type { Business, MenuCategory } from '@/lib/types';

export interface StoreData {
  business: Business;
  menu: MenuCategory[];
}

/**
 * Carrega o cardápio publicado de um restaurante. `cache` evita repetir as
 * consultas quando layout, página e metadados pedem os mesmos dados.
 */
export const loadPublishedStore = cache(async (slug: string): Promise<StoreData | null> => {
  // Sem banco, o servidor ainda conhece o restaurante de exemplo — assim
  // título, descrição e imagem de compartilhamento saem iguais nos dois modos.
  if (demoMode) return sampleStore(slug);

  const business = await getBusinessBySlug(slug);
  if (!business || !business.published) return null;
  return { business, menu: await getMenu(business.id) };
});

/** Versão sem exigir publicação — usada na prévia dentro do painel. */
export const loadStoreForPreview = cache(async (slug: string): Promise<StoreData | null> => {
  if (demoMode) return sampleStore(slug);

  const business = await getBusinessBySlug(slug);
  if (!business) return null;
  return { business, menu: await getMenu(business.id) };
});
