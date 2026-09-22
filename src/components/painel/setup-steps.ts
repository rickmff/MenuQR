import { BUSINESS_SECTIONS, ONBOARDING_ORDER, type BusinessSection } from '@/components/painel/business-sections';
import { formatRadius } from '@/lib/delivery-area';
import { displayWhatsapp } from '@/lib/phone';
import { allItems, countItems } from '@/lib/menu-utils';
import type { Business, MenuCategory } from '@/lib/types';

/**
 * O que ainda falta para o restaurante ir ao ar.
 *
 * O progresso é **derivado do que está gravado**, nunca de "o lojista visitou
 * esta aba": um passo fica concluído porque a informação existe, e volta a
 * ficar pendente se ela for apagada. É a diferença entre um checklist que diz
 * a verdade e um que só conta cliques — quem preencheu tudo antes de o guia
 * existir abre o painel com a lista já fechada.
 *
 * Módulo puro de propósito: roda no servidor (painel com banco) e no navegador
 * (modo demonstração), e não importa nem `server-only` nem `'use client'`.
 */

/** O `logo` que o banco grava sozinho — ainda não é uma escolha do lojista. */
const DEFAULT_LOGO = '🍽️';

export type SetupStep = BusinessSection | 'cardapio';

/** A ordem do checklist: os dados do negócio e, por último, o cardápio. */
export const SETUP_ORDER: SetupStep[] = [...ONBOARDING_ORDER, 'cardapio'];

export interface SetupStepState {
  step: SetupStep;
  /** Rótulo do passo — diz o que falta fazer, não só o nome da aba. */
  label: string;
  /** Para onde o lojista vai resolver isto. */
  href: string;
  done: boolean;
  /**
   * Sem o passo, publicar entregaria ao cliente uma página onde não dá para
   * pedir nada. Espelha `publishBlocker`.
   */
  required: boolean;
  /** O que ficou gravado, em uma linha curta. Só aparece quando `done`. */
  summary: string;
}

export interface SetupProgress {
  steps: SetupStepState[];
  done: number;
  total: number;
  /** O primeiro passo pendente — para onde "Continuar" leva. */
  next: SetupStepState | null;
  /** Nada mais a fazer: o checklist some sozinho. */
  complete: boolean;
}

const LABELS: Record<SetupStep, string> = {
  identidade: 'Identidade do restaurante',
  contato: 'WhatsApp que recebe os pedidos',
  endereco: 'Endereço do restaurante',
  horarios: 'Horário de funcionamento',
  entrega: 'Entrega e retirada',
  cardapio: 'Primeiro item no cardápio',
};

const REQUIRED: SetupStep[] = ['contato', 'cardapio'];

/** Quantos dias da semana têm ao menos uma faixa de horário. */
function openDays(business: Business): number {
  return Object.values(business.hours).filter((ranges) => ranges.length > 0).length;
}

function identityDone(business: Business): boolean {
  // O nome vem do cadastro, então sozinho não prova nada: o que falta depois
  // dele é a cara do restaurante no topo do cardápio.
  return business.logo !== DEFAULT_LOGO || business.tagline.trim() !== '';
}

function addressDone(business: Business): boolean {
  return business.address.street.trim() !== '' && business.address.city.trim() !== '';
}

function deliveryDone(business: Business): boolean {
  const { delivery, pickup } = business;
  if (!delivery.enabled && !pickup.enabled) return false;
  // Entrega ligada sem área definida deixa o cliente sem saber se é atendido.
  if (delivery.enabled && delivery.zones.length === 0 && delivery.radiusKm <= 0) return false;
  return true;
}

function deliverySummary(business: Business): string {
  const { delivery, pickup } = business;
  const parts: string[] = [];
  if (delivery.enabled) {
    const area =
      delivery.zones.length > 0
        ? `${delivery.zones.length} ${delivery.zones.length === 1 ? 'bairro' : 'bairros'}`
        : formatRadius(delivery.radiusKm);
    parts.push(`Entrega em ${area}`);
  }
  if (pickup.enabled) parts.push('Retirada no local');
  return parts.join(' • ');
}

function addressSummary(business: Business): string {
  const { street, city } = business.address;
  return [street, city].filter(Boolean).join(' • ');
}

function menuSummary(menu: MenuCategory[]): string {
  const total = countItems(menu);
  return `${total} ${total === 1 ? 'item' : 'itens'}`;
}

/** Como cada passo sabe que foi concluído, e o que mostra quando está. */
const CHECKS: Record<SetupStep, (business: Business, menu: MenuCategory[]) => [boolean, string]> = {
  identidade: (business) => [identityDone(business), business.tagline.trim() || business.name],
  contato: (business) => [
    business.whatsapp !== '',
    business.whatsapp ? displayWhatsapp(business.whatsapp) : '',
  ],
  endereco: (business) => [addressDone(business), addressSummary(business)],
  horarios: (business) => {
    const days = openDays(business);
    return [days > 0, `${days} ${days === 1 ? 'dia' : 'dias'} por semana`];
  },
  entrega: (business) => [deliveryDone(business), deliverySummary(business)],
  cardapio: (_business, menu) => [
    allItems(menu).some((item) => item.available),
    menuSummary(menu),
  ],
};

function hrefOf(step: SetupStep): string {
  return step === 'cardapio' ? '/painel/cardapio' : BUSINESS_SECTIONS[step].href;
}

/** O estado do checklist para este restaurante, agora. */
export function setupProgress(business: Business, menu: MenuCategory[]): SetupProgress {
  const steps = SETUP_ORDER.map<SetupStepState>((step) => {
    const [done, summary] = CHECKS[step](business, menu);
    return {
      step,
      label: LABELS[step],
      href: hrefOf(step),
      done,
      required: REQUIRED.includes(step),
      summary: done ? summary : '',
    };
  });

  const done = steps.filter((entry) => entry.done).length;

  return {
    steps,
    done,
    total: steps.length,
    next: steps.find((entry) => !entry.done) ?? null,
    complete: done === steps.length,
  };
}

/**
 * A próxima aba de "Dados do negócio" que ainda falta preencher, ignorando a
 * que o lojista acabou de salvar — é assim que o formulário encadeia as abas
 * enquanto a configuração não terminou. O cardápio fica de fora: ele não é uma
 * aba de formulário, e mandar alguém para lá no meio da configuração do
 * negócio seria trocar de assunto.
 */
export function nextPendingSection(
  business: Business,
  saved: BusinessSection,
): BusinessSection | null {
  return (
    ONBOARDING_ORDER.find(
      (section) => section !== saved && !CHECKS[section](business, [])[0],
    ) ?? null
  );
}
