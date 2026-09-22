'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { ONBOARDING_ORDER } from '@/components/painel/business-sections';
import type { BusinessSection } from '@/server/actions/business';

/**
 * Quais abas de configuração o lojista já conferiu.
 *
 * Fica no navegador de propósito: é um guia de primeira visita, não um dado do
 * restaurante — não vale uma tabela nova nem uma ida ao servidor a cada passo.
 * Em outro aparelho o guia aparece de novo, o que é o comportamento desejado
 * para quem está configurando pela primeira vez ali.
 */
const key = (businessId: string) => `menuqr.onboarding.${businessId}`;

interface Progress {
  done: BusinessSection[];
  dismissed: boolean;
}

const EMPTY: Progress = { done: [], dismissed: false };
const listeners = new Set<() => void>();
/** Cache do valor lido: `useSyncExternalStore` exige a mesma referência entre renders. */
const cache = new Map<string, Progress>();

function read(businessId: string): Progress {
  const cached = cache.get(businessId);
  if (cached) return cached;
  let value = EMPTY;
  try {
    const raw = window.localStorage.getItem(key(businessId));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>;
      value = {
        done: Array.isArray(parsed.done) ? parsed.done.filter((s) => ONBOARDING_ORDER.includes(s)) : [],
        dismissed: Boolean(parsed.dismissed),
      };
    }
  } catch {
    // Navegador sem localStorage ou conteúdo corrompido: o guia recomeça do zero.
  }
  cache.set(businessId, value);
  return value;
}

function write(businessId: string, value: Progress) {
  cache.set(businessId, value);
  try {
    window.localStorage.setItem(key(businessId), JSON.stringify(value));
  } catch {
    // Sem espaço ou em aba anônima: o guia vale só para esta visita.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface Onboarding {
  /** O guia deve aparecer? Falso quando já foi concluído ou dispensado. */
  active: boolean;
  done: BusinessSection[];
  /** Próxima aba a conferir, ou null quando acabou. */
  next: BusinessSection | null;
  total: number;
  complete: (section: BusinessSection) => void;
  dismiss: () => void;
  restart: () => void;
}

export function useOnboarding(businessId: string): Onboarding {
  // No servidor o guia não existe: o HTML sai sem ele e a hidratação bate.
  const progress = useSyncExternalStore(
    subscribe,
    () => read(businessId),
    () => EMPTY,
  );

  const complete = useCallback(
    (section: BusinessSection) => {
      const current = read(businessId);
      if (current.done.includes(section)) return;
      write(businessId, { ...current, done: [...current.done, section] });
    },
    [businessId],
  );

  const dismiss = useCallback(() => {
    write(businessId, { ...read(businessId), dismissed: true });
  }, [businessId]);

  const restart = useCallback(() => {
    write(businessId, { done: [], dismissed: false });
  }, [businessId]);

  const next = ONBOARDING_ORDER.find((section) => !progress.done.includes(section)) ?? null;

  return {
    active: !progress.dismissed && next !== null,
    done: progress.done,
    next,
    total: ONBOARDING_ORDER.length,
    complete,
    dismiss,
    restart,
  };
}
