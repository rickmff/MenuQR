'use client';

import { useSyncExternalStore } from 'react';
import { sampleBusiness, sampleMenu, SAMPLE_BUSINESS_ID } from './sample-data';
import type { Business, MenuCategory, MenuItem, MenuOptionGroup } from '@/lib/types';

/**
 * Estado do modo demonstração: contas, negócios e cardápios vivem no
 * localStorage do navegador. É proposital que não haja servidor aqui — serve
 * para testar o produto inteiro sem infraestrutura.
 *
 * Limites conhecidos (e aceitos enquanto é demonstração):
 * - qualquer pessoa com acesso ao navegador enxerga e altera os dados;
 * - o cardápio publicado só existe no aparelho de quem o criou;
 * - a senha é guardada como hash, mas a verificação acontece no cliente.
 */

const STORAGE_KEY = 'menuqr.demo.v1';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

/** O negócio guarda o dono, já que aqui não há tabela de relacionamento. */
export type DemoBusiness = Business & { ownerId: string };

export interface DemoState {
  /** false até o localStorage ser lido: evita decidir com estado vazio. */
  ready: boolean;
  users: DemoUser[];
  sessionUserId: string | null;
  businesses: DemoBusiness[];
  menus: Record<string, MenuCategory[]>;
}

const EMPTY_STATE: DemoState = Object.freeze({
  ready: false,
  users: [],
  sessionUserId: null,
  businesses: [],
  menus: {},
});

let state: DemoState = EMPTY_STATE;
let loaded = false;
const listeners = new Set<() => void>();

function read(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ready: true, users: [], sessionUserId: null, businesses: [], menus: {} };
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      ready: true,
      users: parsed.users ?? [],
      sessionUserId: parsed.sessionUserId ?? null,
      businesses: parsed.businesses ?? [],
      menus: parsed.menus ?? {},
    };
  } catch {
    return { ready: true, users: [], sessionUserId: null, businesses: [], menus: {} };
  }
}

function emit() {
  for (const listener of listeners) listener();
}

/** Garante que o estado em memória reflete o storage antes de ler ou gravar. */
export function ensureLoaded() {
  if (!loaded) {
    state = read();
    loaded = true;
  }
}

function commit(next: DemoState) {
  state = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* navegação privada: segue só em memória */
  }
  emit();
}

export function subscribe(listener: () => void): () => void {
  if (!loaded) {
    state = read();
    loaded = true;
  }
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      state = read();
      emit();
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export const getSnapshot = (): DemoState => state;

export const getServerSnapshot = (): DemoState => EMPTY_STATE;

/** Estado da demonstração, já sincronizado com o localStorage. */
export function useDemoState(): DemoState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ------------------------------------------------------------------ leitura */

export function currentUser(current: DemoState = state): DemoUser | null {
  return current.users.find((user) => user.id === current.sessionUserId) ?? null;
}

export function businessOfUser(current: DemoState, userId: string | null): DemoBusiness | null {
  if (!userId) return null;
  return current.businesses.find((business) => business.ownerId === userId) ?? null;
}

export function menuOfBusiness(current: DemoState, businessId: string): MenuCategory[] {
  return [...(current.menus[businessId] ?? [])].sort((a, b) => a.position - b.position);
}

/** Cardápio público: o do próprio navegador ou o restaurante de exemplo. */
export function findPublishedStore(
  current: DemoState,
  slug: string,
): { business: Business; menu: MenuCategory[] } | null {
  const business = current.businesses.find((entry) => entry.slug === slug);
  if (business?.published) {
    return { business, menu: menuOfBusiness(current, business.id) };
  }
  if (slug === sampleBusiness.slug) return { business: sampleBusiness, menu: sampleMenu };
  return null;
}

export function findStoreForPreview(
  current: DemoState,
  slug: string,
): { business: Business; menu: MenuCategory[] } | null {
  const business = current.businesses.find((entry) => entry.slug === slug);
  if (business) return { business, menu: menuOfBusiness(current, business.id) };
  if (slug === sampleBusiness.slug) return { business: sampleBusiness, menu: sampleMenu };
  return null;
}

/* ------------------------------------------------------------------ escrita */

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}): Promise<DemoUser> {
  ensureLoaded();
  const id = newId('user');
  const user: DemoUser = {
    id,
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash: await hashPassword(input.password, id),
  };
  commit({ ...state, users: [...state.users, user], sessionUserId: id });
  return user;
}

export function findUserByEmail(email: string): DemoUser | null {
  ensureLoaded();
  const normalized = email.trim().toLowerCase();
  return state.users.find((user) => user.email === normalized) ?? null;
}

export function startSession(userId: string) {
  ensureLoaded();
  commit({ ...state, sessionUserId: userId });
}

export function endSession() {
  commit({ ...state, sessionUserId: null });
}

export function saveBusiness(business: DemoBusiness) {
  ensureLoaded();
  const exists = state.businesses.some((entry) => entry.id === business.id);
  commit({
    ...state,
    businesses: exists
      ? state.businesses.map((entry) => (entry.id === business.id ? business : entry))
      : [...state.businesses, business],
  });
}

export function saveMenu(businessId: string, menu: MenuCategory[]) {
  ensureLoaded();
  commit({ ...state, menus: { ...state.menus, [businessId]: menu } });
}

export function slugTaken(slug: string, exceptId?: string): boolean {
  ensureLoaded();
  if (slug === sampleBusiness.slug) return true;
  return state.businesses.some((entry) => entry.slug === slug && entry.id !== exceptId);
}

/** Carrega o cardápio de exemplo na conta atual, para começar com conteúdo. */
export function copySampleMenuInto(businessId: string) {
  const copy: MenuCategory[] = sampleMenu.map((category) => {
    const categoryId = newId('cat');
    return {
      ...category,
      id: categoryId,
      items: category.items.map((item) => cloneItem(item, categoryId)),
    };
  });
  saveMenu(businessId, copy);
}

function cloneItem(item: MenuItem, categoryId: string): MenuItem {
  return {
    ...item,
    id: newId('item'),
    categoryId,
    options: item.options.map(cloneGroup),
  };
}

function cloneGroup(group: MenuOptionGroup): MenuOptionGroup {
  return {
    ...group,
    id: newId('grp'),
    choices: group.choices.map((choice) => ({ ...choice, id: newId('opt') })),
  };
}

export function resetDemo() {
  commit({ ready: true, users: [], sessionUserId: null, businesses: [], menus: {} });
}

export { SAMPLE_BUSINESS_ID, sampleBusiness, sampleMenu };
