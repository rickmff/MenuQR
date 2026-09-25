'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  parseSetupPreference,
  SETUP_PREFERENCE_STORED,
  setupPreferenceKey,
  type SetupPreference,
} from '@/components/painel/setup-preference';

/**
 * O lojista escolheu ver o guia de configuração aberto ou recolhido?
 *
 * Fica no navegador de propósito: é preferência de quem olha a tela, não dado
 * do restaurante — não vale uma coluna no banco nem uma ida ao servidor a cada
 * clique. O progresso em si vem dos dados gravados (`setup-steps.ts`); aqui só
 * mora o "não quero ver isto agora".
 *
 * Gravada no localStorage e repetida num cookie (`path=/painel`) que o layout
 * do painel lê (`parseSetupPreference`): sem o cookie o servidor não conhecia a
 * escolha, o HTML saía com a regra da largura e, a cada F5, o guia de quem
 * tinha mudado o padrão abria e fechava — e a coluna alargava e encolhia junto.
 *
 * Três valores, e não dois (2026-09-25): sem escolha gravada, quem decide é a
 * largura da janela — o guia nasce aberto só a partir de `xl`, onde a coluna
 * do conteúdo cede o espaço dele sem apertar; abaixo disso nasce em pílula
 * (ver `SetupWidget`). Uma escolha feita no desktop vale dali em diante. No
 * celular o guia abre como folha por cima da tela e fecha sozinho; abrir ali
 * não é escolha que se grave.
 *
 * Módulo separado do componente para o formulário de negócio poder consultá-lo
 * sem importar o card.
 */
export type { SetupPreference };

/** Um ano: é escolha de quem usa o painel, não de uma visita. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const listeners = new Set<() => void>();
/** `useSyncExternalStore` exige a mesma referência entre renders. */
const cache = new Map<string, SetupPreference>();

function read(businessId: string): SetupPreference {
  const cached = cache.get(businessId);
  if (cached !== undefined) return cached;
  let value: SetupPreference = null;
  try {
    value = parseSetupPreference(window.localStorage.getItem(setupPreferenceKey(businessId)));
  } catch {
    // Navegador sem localStorage: vale a regra da largura.
  }
  const cookie = parseSetupPreference(readCookie(businessId));
  if (value === null) {
    // Sem localStorage (aba anônima, dados do site apagados em parte): o cookie
    // é o que o servidor usou, e seguir com ele mantém a hidratação igual.
    value = cookie;
  } else if (cookie !== value) {
    // Escolha gravada antes de existir o cookie: repete-a para o servidor,
    // senão todo F5 continuaria abrindo e fechando o guia.
    writeCookie(businessId, value);
  }
  cache.set(businessId, value);
  return value;
}

function write(businessId: string, value: Exclude<SetupPreference, null>) {
  cache.set(businessId, value);
  try {
    window.localStorage.setItem(setupPreferenceKey(businessId), SETUP_PREFERENCE_STORED[value]);
  } catch {
    // Sem espaço ou em aba anônima: o cookie ainda guarda a escolha.
  }
  writeCookie(businessId, value);
  for (const listener of listeners) listener();
}

function readCookie(businessId: string): string | undefined {
  const name = `${setupPreferenceKey(businessId)}=`;
  return document.cookie
    .split('; ')
    .find((part) => part.startsWith(name))
    ?.slice(name.length);
}

function writeCookie(businessId: string, value: Exclude<SetupPreference, null>) {
  document.cookie = `${setupPreferenceKey(businessId)}=${SETUP_PREFERENCE_STORED[value]}; path=/painel; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * A escolha gravada, ou `null` quando o lojista nunca escolheu. No servidor e
 * na hidratação vale `initial` (o cookie, lido pelo layout): é o mesmo valor
 * do localStorage, então a hidratação bate e nada muda depois dela.
 */
export function useSetupPreference(
  businessId: string,
  initial: SetupPreference = null,
): [SetupPreference, (value: Exclude<SetupPreference, null>) => void] {
  const preference = useSyncExternalStore(
    subscribe,
    () => read(businessId),
    () => initial,
  );

  const set = useCallback(
    (value: Exclude<SetupPreference, null>) => write(businessId, value),
    [businessId],
  );

  return [preference, set];
}

/**
 * O lojista recolheu o guia de propósito? Mantida para quem só quer saber
 * isso (o formulário do negócio); o próprio guia usa `useSetupPreference`.
 */
export function useSetupCollapsed(businessId: string): [boolean, (value: boolean) => void] {
  const [preference, setPreference] = useSetupPreference(businessId);
  const set = useCallback(
    (value: boolean) => setPreference(value ? 'collapsed' : 'open'),
    [setPreference],
  );
  return [preference === 'collapsed', set];
}
