import sample from './sample-menu.json';
import type { Business, MenuCategory } from '@/lib/types';

/**
 * Restaurante de exemplo — FONTE ÚNICA.
 *
 * O mesmo arquivo `sample-menu.json` alimenta o modo demonstração (aqui, pelo
 * bundle) e o seed do banco (scripts/seed.mjs). Antes eram duas cópias escritas
 * à mão e elas divergiram: um item perdeu os complementos numa delas.
 * Qualquer mudança no exemplo acontece no JSON e vale para os dois.
 */
export const sampleBusiness: Business = sample.business as Business;
export const sampleMenu: MenuCategory[] = sample.menu as MenuCategory[];
export const SAMPLE_BUSINESS_ID = sampleBusiness.id;

/**
 * No modo demonstração o servidor não tem banco: o único cardápio que ele
 * conhece é o de exemplo (os criados pelos lojistas vivem no navegador).
 * É o que permite gerar título, descrição, imagem de compartilhamento e
 * manifesto do exemplo com o MESMO código do cardápio servido pelo banco.
 */
export function sampleStore(slug: string): { business: Business; menu: MenuCategory[] } | null {
  return slug === sampleBusiness.slug ? { business: sampleBusiness, menu: sampleMenu } : null;
}
