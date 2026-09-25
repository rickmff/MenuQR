import {
  BUSINESS_SECTIONS,
  type BusinessSection,
} from "@/components/painel/business-sections";
import { activeZones, chargesByDistance } from "@/lib/delivery";
import { allItems, countItems, hasAddress } from "@/lib/menu-utils";
import type { Business, MenuCategory } from "@/lib/types";

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
 *
 * **Uma regra só de "próximo passo"** (2026-09-25): o passo atual do guia, o
 * destino de "Salvar e ir para…" nas abas do negócio e o aviso depois do
 * primeiro item saem daqui (`setupProgress().next` e `continueAfter`). Antes
 * eram três regras que discordavam — o cadastro caía no cardápio, o guia
 * mandava para a Identidade e o salvar das abas pulava para a Entrega.
 */

/** O `logo` que o banco grava sozinho — ainda não é uma escolha do lojista. */
export const DEFAULT_LOGO = "🍽️";

export type SetupStep = Exclude<BusinessSection, "contato"> | "cardapio";

/**
 * A ordem do guia: primeiro o que impede o cliente de pedir, depois o
 * polimento. O cardápio abre a lista porque é onde o lojista cai depois do
 * cadastro e é o que ele veio fazer; a Identidade fecha porque pode vir depois
 * de estar no ar. O WhatsApp não é passo: vem do cadastro e nunca fica
 * pendente (se faltar, `publishBlocker` segura o publicar).
 */
export const SETUP_ORDER: SetupStep[] = [
  "cardapio",
  "entrega",
  "horarios",
  "identidade",
];

/**
 * Sem estes, publicar entregaria ao cliente uma página onde o pedido não fecha
 * (sem item, sem forma de receber), que não diz onde retirar (sem endereço) ou
 * que diz "Fechado" para sempre (sem horário). Espelha `publishBlocker` em
 * `@/lib/menu-utils`: um passo daqui fica pendente exatamente pelos motivos
 * que seguram o publicar — senão o guia marcava "Obrigatório" ao lado de um
 * Publicar liberado.
 */
const REQUIRED: SetupStep[] = ["cardapio", "entrega", "horarios"];

/**
 * O que ficou gravado, em dados — o texto sai no idioma de quem olha, no
 * `SetupWidget` (`painel.setup.summary.*`). O módulo continua puro: não
 * conhece idioma nem tradutor, e o mesmo resultado serve ao servidor e ao
 * modo demonstração.
 */
export type SetupSummary =
  | { kind: "text"; text: string }
  | { kind: "days"; count: number }
  | { kind: "items"; count: number }
  | {
      kind: "delivery";
      /** Rua e cidade, já juntas; vazio quando não há endereço. */
      address: string;
      /**
       * `null` com a entrega desligada. Bairros ativos, ou o raio quando não há
       * bairro. `toArrange` é a entrega sem bairro, sem raio e sem cobrança por
       * km: a taxa fica a combinar na conversa
       * (`painel.setup.summary.deliveryToArrange`), e "Entrega em 0 km" não
       * diria nada. Vem pronto daqui porque cobrando por km o raio zerado é
       * "sem limite", não "a combinar" — o resumo não tem como saber sozinho.
       */
      delivery: { zones: number; radiusKm: number; toArrange: boolean } | null;
      pickup: boolean;
    };

/**
 * Por que um passo ainda está pendente — o texto é `painel.setup.pending.<motivo>`.
 * Aparece na linha do passo no guia, para o lojista não precisar abrir a aba
 * para descobrir o que falta.
 */
export type SetupPendingReason =
  "noItem" | "noAddress" | "noOrderMode" | "noHours" | "identity";

export interface SetupStepState {
  /** O rótulo do passo é `painel.setup.steps.<step>` — diz o que falta fazer, não só o nome da aba. */
  step: SetupStep;
  /** Para onde o lojista vai resolver isto. */
  href: string;
  done: boolean;
  /**
   * Sem o passo, publicar entregaria ao cliente uma página onde não dá para
   * pedir (ou que nunca abre). Espelha `publishBlocker`.
   */
  required: boolean;
  /** O que ficou gravado, em uma linha curta. Só existe quando `done`. */
  summary: SetupSummary | null;
  /** O que falta. Só existe quando não está `done`. */
  pending: SetupPendingReason | null;
}

export interface SetupProgress {
  steps: SetupStepState[];
  done: number;
  total: number;
  /**
   * O primeiro passo pendente — para onde "Continuar configuração" leva. Os
   * obrigatórios vêm antes dos opcionais, mesmo que a ordem da lista seja outra.
   */
  next: SetupStepState | null;
  /** Nada mais a configurar. */
  complete: boolean;
  /**
   * Tudo configurado e o cardápio ainda em rascunho: o guia troca a lista pelo
   * "Tudo pronto — Publicar cardápio" até o lojista publicar.
   */
  publishReady: boolean;
}

/** Quantos dias da semana têm ao menos uma faixa de horário. */
function openDays(business: Business): number {
  return Object.values(business.hours).filter((ranges) => ranges.length > 0)
    .length;
}

/**
 * A cara do restaurante no topo do cardápio. O nome vem do cadastro, então
 * sozinho não prova nada; qualquer uma das outras escolhas conta.
 */
function identityDone(business: Business): boolean {
  const logo = business.logo.trim();
  return (
    (logo !== "" && logo !== DEFAULT_LOGO) ||
    business.tagline.trim() !== "" ||
    business.description.trim() !== "" ||
    Boolean(business.cover?.trim())
  );
}

/**
 * O que ainda falta na aba de endereço e entrega, na ordem em que a tela pede.
 * São os mesmos dois motivos de `publishBlocker` (`noAddress`, `noOrderMode`):
 * entrega ligada sem bairro nem raio não é pendência — é "taxa a combinar" na
 * conversa, um jeito válido de trabalhar, e o resumo do passo diz isso.
 */
function deliveryPending(business: Business): SetupPendingReason | null {
  const { delivery, pickup } = business;
  // O endereço abre a aba e é de onde o mapa mede: sem ele a tela está pela metade.
  if (!hasAddress(business)) return "noAddress";
  if (!delivery.enabled && !pickup.enabled) return "noOrderMode";
  return null;
}

function deliverySummary(business: Business): SetupSummary {
  const { delivery, pickup } = business;
  const zones = activeZones(business).length;
  return {
    kind: "delivery",
    // A rua abre o resumo: é o que o lojista confere de relance para saber que
    // a aba tem o endereço certo, e não só as taxas.
    address: addressSummary(business),
    delivery: delivery.enabled
      ? {
          zones,
          radiusKm: delivery.radiusKm,
          toArrange:
            zones === 0 && delivery.radiusKm <= 0 && !chargesByDistance(business),
        }
      : null,
    pickup: pickup.enabled,
  };
}

function addressSummary(business: Business): string {
  const { street, city } = business.address;
  return [street, city].filter(Boolean).join(" • ");
}

/** Como cada passo sabe que foi concluído, o que mostra quando está e o que falta quando não está. */
const CHECKS: Record<
  SetupStep,
  (
    business: Business,
    menu: MenuCategory[],
  ) => { pending: SetupPendingReason | null; summary: SetupSummary }
> = {
  cardapio: (_business, menu) => ({
    pending: allItems(menu).some((item) => item.available) ? null : "noItem",
    summary: { kind: "items", count: countItems(menu) },
  }),
  entrega: (business) => ({
    pending: deliveryPending(business),
    summary: deliverySummary(business),
  }),
  horarios: (business) => {
    const days = openDays(business);
    return {
      pending: days > 0 ? null : "noHours",
      summary: { kind: "days", count: days },
    };
  },
  identidade: (business) => ({
    pending: identityDone(business) ? null : "identity",
    summary: { kind: "text", text: business.tagline.trim() || business.name },
  }),
};

function hrefOf(step: SetupStep): string {
  return step === "cardapio"
    ? "/painel/cardapio"
    : BUSINESS_SECTIONS[step].href;
}

/** Os pendentes na ordem em que devem ser resolvidos: obrigatórios primeiro, depois a ordem da lista. */
function byPriority(steps: SetupStepState[]): SetupStepState[] {
  return [
    ...steps.filter((entry) => entry.required),
    ...steps.filter((entry) => !entry.required),
  ];
}

/** O estado do checklist para este restaurante, agora. */
export function setupProgress(
  business: Business,
  menu: MenuCategory[],
): SetupProgress {
  const steps = SETUP_ORDER.map<SetupStepState>((step) => {
    const { pending, summary } = CHECKS[step](business, menu);
    const done = pending === null;
    return {
      step,
      href: hrefOf(step),
      done,
      required: REQUIRED.includes(step),
      summary: done ? summary : null,
      pending,
    };
  });

  const done = steps.filter((entry) => entry.done).length;
  const complete = done === steps.length;

  return {
    steps,
    done,
    total: steps.length,
    next: byPriority(steps).find((entry) => !entry.done) ?? null,
    complete,
    publishReady: complete && !business.published,
  };
}

/** Para onde o lojista vai depois de salvar uma etapa da configuração. */
export type SetupTarget =
  | { kind: "step"; step: SetupStep; href: string }
  /** Tudo configurado e ainda em rascunho: a tela de compartilhar, onde mora "Publicar cardápio". */
  | { kind: "publish"; href: "/painel" };

/**
 * O próximo destino depois de salvar `saved` — o encadeamento de "Salvar e ir
 * para…" nas abas do negócio e o aviso depois do primeiro item.
 *
 * Duas leituras, pela opção `savedIsDone`:
 *
 * - **Previsão** (`true`, o padrão): `business` e `menu` são o que estava
 *   gravado ANTES deste salvar, e o passo salvo conta como feito (o lojista
 *   está mexendo nele). É o rótulo do botão, antes de saber o que vai ser
 *   gravado.
 * - **Resposta** (`false`): `business` já é o que ficou gravado, e o passo
 *   salvo conta pelo que está lá. É o que o servidor e a demonstração devolvem
 *   em `FormState.next`: a semana salva toda fechada continua pendente, e
 *   mandar para "Publicar" levaria a um botão bloqueado por "falta o horário"
 *   logo depois de o lojista salvar o horário. Se o salvo segue pendente e é o
 *   único, devolve `null` — fica na tela, onde dá para resolver.
 *
 * Os outros pendentes vêm na mesma prioridade do guia. Em rascunho, leva a
 * publicar só com todos os passos feitos. Publicado, só os obrigatórios puxam
 * o lojista: quem já está no ar e pulou a Identidade (opcional) não troca de
 * tela a cada ajuste de taxa ou horário — aí salvar é só salvar.
 *
 * O encadeamento vale com o guia aberto ou recolhido: recolher a lista é "não
 * quero ver isto agora", não "não quero terminar".
 */
export function continueAfter(
  business: Business,
  menu: MenuCategory[],
  saved: SetupStep | BusinessSection,
  { savedIsDone = true }: { savedIsDone?: boolean } = {},
): SetupTarget | null {
  const pending = byPriority(setupProgress(business, menu).steps).filter(
    (entry) => !entry.done && (!business.published || entry.required),
  );
  const next = pending.find((entry) => entry.step !== saved);
  if (next) return { kind: "step", step: next.step, href: next.href };
  if (!savedIsDone && pending.some((entry) => entry.step === saved)) return null;
  if (!business.published) return { kind: "publish", href: "/painel" };
  return null;
}
