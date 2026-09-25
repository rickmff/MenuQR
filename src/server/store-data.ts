import 'server-only';
import { cache } from 'react';
import { billingMode } from './billing/config';
import { getBusinessBySlug } from './repositories/businesses';
import { getMenu } from './repositories/menu';
import { getBillingRowsForBusiness } from './repositories/subscriptions';
import { summarizeBilling, todaySP } from '@/lib/billing';
import { demoMode } from '@/lib/demo/config';
import { sampleStore } from '@/lib/demo/sample-data';
import type { Business, MenuCategory } from '@/lib/types';

export interface StoreData {
  business: Business;
  menu: MenuCategory[];
}

export type StoreLookup =
  | { status: 'ok'; data: StoreData }
  /** Publicada pelo lojista, mas a assinatura venceu além da carência. */
  | { status: 'unavailable'; business: Business }
  /**
   * Existe, mas o lojista despublicou (ou ainda não publicou). Não é 404: o QR
   * impresso continua apontando para cá, e o cliente precisa saber que é o
   * restaurante que está fora do ar — não o endereço que está errado.
   */
  | { status: 'unpublished'; business: Business }
  | { status: 'missing' };

/**
 * Procura o cardápio de um restaurante e diz em que pé ele está. `cache`
 * evita repetir as consultas quando layout, página e metadados pedem os
 * mesmos dados.
 *
 * A assinatura é conferida aqui, na leitura, a cada render: a loja sai do ar
 * sozinha quando a carência acaba, sem cron, e volta assim que o pagamento
 * cai (o webhook derruba o cache).
 */
export const lookupStore = cache(async (slug: string): Promise<StoreLookup> => {
  // Sem banco, o servidor ainda conhece o restaurante de exemplo — assim
  // título, descrição e imagem de compartilhamento saem iguais nos dois modos.
  if (demoMode) {
    const sample = sampleStore(slug);
    return sample ? { status: 'ok', data: sample } : { status: 'missing' };
  }

  const business = await getBusinessBySlug(slug);
  if (!business) return { status: 'missing' };
  if (!business.published) return { status: 'unpublished', business };

  if (billingMode() === 'asaas') {
    const billing = await getBillingRowsForBusiness(business.id);
    if (!billing || !summarizeBilling(billing.rows, todaySP(), billing.exempt).allowed) {
      return { status: 'unavailable', business };
    }
  }

  return { status: 'ok', data: { business, menu: await getMenu(business.id) } };
});

/** O cardápio no ar, ou nada — para quem não distingue "indisponível" de "não existe" (OG, manifest). */
export const loadPublishedStore = cache(async (slug: string): Promise<StoreData | null> => {
  const lookup = await lookupStore(slug);
  return lookup.status === 'ok' ? lookup.data : null;
});

/** Versão sem exigir publicação nem assinatura — usada na prévia dentro do painel. */
export const loadStoreForPreview = cache(async (slug: string): Promise<StoreData | null> => {
  if (demoMode) return sampleStore(slug);

  const business = await getBusinessBySlug(slug);
  if (!business) return null;
  return { business, menu: await getMenu(business.id) };
});
