'use client';

import { onlyDigits } from '@/lib/format';
import * as store from './store';
import type { AuthFormState } from '@/server/actions/auth';
import type { FormState } from '@/server/actions/business';
import type { Business, MenuCategory, MenuItem, MenuOptionGroup, WeeklyHours } from '@/lib/types';

/**
 * Versões das ações que rodam só no navegador, usadas no modo demonstração.
 * Mantêm a mesma assinatura das Server Actions para os formulários não mudarem.
 */

function go(path: string) {
  window.location.assign(path);
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function money(formData: FormData, key: string): number {
  const parsed = Number(String(formData.get(key) ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/* -------------------------------------------------------------------- conta */

export async function demoSignupAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = text(formData, 'name');
  const email = text(formData, 'email');
  const password = String(formData.get('password') ?? '');

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = 'Informe seu nome.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = 'Informe um e-mail válido.';
  if (password.length < 8) fieldErrors.password = 'A senha precisa de pelo menos 8 caracteres.';
  if (Object.keys(fieldErrors).length) return { fieldErrors, values: { name, email } };

  if (store.findUserByEmail(email)) {
    return {
      fieldErrors: { email: 'Já existe uma conta com este e-mail neste navegador.' },
      values: { name, email },
    };
  }

  await store.createUser({ name, email, password });
  go('/painel/comecar');
  return {};
}

export async function demoLoginAction(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, 'email');
  const password = String(formData.get('password') ?? '');

  const user = store.findUserByEmail(email);
  const genericError = { error: 'E-mail ou senha incorretos.', values: { email } };
  if (!user) return genericError;

  const hash = await store.hashPassword(password, user.id);
  if (hash !== user.passwordHash) return genericError;

  store.startSession(user.id);
  const next = String(formData.get('proximo') ?? '');
  go(next.startsWith('/') && !next.startsWith('//') ? next : '/painel');
  return {};
}

export async function demoLogoutAction(): Promise<void> {
  store.endSession();
  go('/');
}

/* ------------------------------------------------------------------ negócio */

function defaultHours(): WeeklyHours {
  const hours: WeeklyHours = {};
  for (let day = 0; day < 7; day += 1) hours[day] = [{ open: '18:00', close: '23:00' }];
  return hours;
}

function parseHours(formData: FormData): WeeklyHours {
  const hours: WeeklyHours = {};
  for (let day = 0; day < 7; day += 1) {
    const open = text(formData, `hours-${day}-open`);
    const close = text(formData, `hours-${day}-close`);
    hours[day] = open && close ? [{ open, close }] : [];
  }
  return hours;
}

function parseZones(formData: FormData): Business['delivery']['zones'] {
  const names = formData.getAll('zone-name').map(String);
  const fees = formData.getAll('zone-fee').map(String);
  const etas = formData.getAll('zone-eta').map(String);

  return names
    .map((name, index) => ({
      id: store.newId('zone'),
      name: name.trim(),
      fee: Number((fees[index] ?? '').replace(',', '.')) || 0,
      eta: (etas[index] ?? '').trim(),
    }))
    .filter((zone) => zone.name.length > 0);
}

export async function demoCreateBusinessAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  store.ensureLoaded();
  const user = store.currentUser(store.getSnapshot());
  if (!user) return { error: 'Sessão expirada. Entre novamente.' };

  const name = text(formData, 'name');
  const slug = slugify(text(formData, 'slug') || name);
  const whatsapp = onlyDigits(text(formData, 'whatsapp'));

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = 'Informe o nome do restaurante.';
  if (slug.length < 3) fieldErrors.slug = 'O endereço precisa de pelo menos 3 caracteres.';
  else if (store.slugTaken(slug)) fieldErrors.slug = 'Este endereço já está em uso. Escolha outro.';
  if (whatsapp.length < 12) {
    fieldErrors.whatsapp = 'Informe o WhatsApp com código do país e DDD. Ex.: 5511987654321';
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const now = new Date().toISOString();
  store.saveBusiness({
    id: store.newId('biz'),
    ownerId: user.id,
    slug,
    name,
    tagline: '',
    description: '',
    logo: '🍽️',
    brandColor: '#d3410a',
    whatsapp,
    email: '',
    instagram: '',
    address: { street: '', district: '', city: text(formData, 'city'), state: '', postalCode: '' },
    hours: defaultHours(),
    acceptOrdersWhenClosed: false,
    delivery: { enabled: true, minOrder: 0, freeAbove: 0, zones: [] },
    pickup: { enabled: true, eta: '20-30 min' },
    payments: ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito'],
    pixKey: '',
    published: false,
    createdAt: now,
    updatedAt: now,
  });

  go('/painel/cardapio');
  return {};
}

export async function demoUpdateBusinessAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  store.ensureLoaded();
  const current = store.getSnapshot();
  const user = store.currentUser(current);
  const business = store.businessOfUser(current, user?.id ?? null);
  if (!business) return { error: 'Sessão expirada. Entre novamente.' };

  const slug = slugify(text(formData, 'slug'));
  if (slug.length < 3) return { fieldErrors: { slug: 'O endereço precisa de pelo menos 3 caracteres.' } };
  if (store.slugTaken(slug, business.id)) {
    return { fieldErrors: { slug: 'Este endereço já está em uso. Escolha outro.' } };
  }

  const whatsapp = onlyDigits(text(formData, 'whatsapp'));
  if (whatsapp.length < 12) {
    return { fieldErrors: { whatsapp: 'Informe o WhatsApp com código do país e DDD.' } };
  }

  store.saveBusiness({
    ...business,
    name: text(formData, 'name') || business.name,
    slug,
    tagline: text(formData, 'tagline'),
    description: text(formData, 'description'),
    logo: text(formData, 'logo') || '🍽️',
    brandColor: /^#[0-9a-fA-F]{6}$/.test(text(formData, 'brandColor'))
      ? text(formData, 'brandColor')
      : business.brandColor,
    whatsapp,
    email: text(formData, 'email'),
    instagram: text(formData, 'instagram'),
    address: {
      street: text(formData, 'street'),
      district: text(formData, 'district'),
      city: text(formData, 'city'),
      state: text(formData, 'state').toUpperCase(),
      postalCode: text(formData, 'postalCode'),
    },
    hours: parseHours(formData),
    acceptOrdersWhenClosed: formData.get('acceptOrdersWhenClosed') === 'on',
    delivery: {
      enabled: formData.get('deliveryEnabled') === 'on',
      minOrder: money(formData, 'minOrder'),
      freeAbove: money(formData, 'freeAbove'),
      zones: parseZones(formData),
    },
    pickup: { enabled: formData.get('pickupEnabled') === 'on', eta: text(formData, 'pickupEta') },
    payments: formData.getAll('payments').map(String),
    pixKey: text(formData, 'pixKey'),
    updatedAt: new Date().toISOString(),
  });

  return { success: 'Alterações salvas neste navegador.' };
}

export async function demoTogglePublishAction(formData: FormData): Promise<void> {
  store.ensureLoaded();
  const current = store.getSnapshot();
  const business = store.businessOfUser(current, store.currentUser(current)?.id ?? null);
  if (!business) return;
  store.saveBusiness({ ...business, published: formData.get('publish') === 'true' });
}

/* ----------------------------------------------------------------- cardápio */

function ownedMenu(): { businessId: string; menu: MenuCategory[] } | null {
  store.ensureLoaded();
  const current = store.getSnapshot();
  const business = store.businessOfUser(current, store.currentUser(current)?.id ?? null);
  if (!business) return null;
  return { businessId: business.id, menu: store.menuOfBusiness(current, business.id) };
}

export async function demoSaveCategoryAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const owned = ownedMenu();
  if (!owned) return { error: 'Sessão expirada. Entre novamente.' };

  const name = text(formData, 'name');
  if (name.length < 2) return { fieldErrors: { name: 'Informe o nome da categoria.' } };

  const categoryId = text(formData, 'categoryId');
  const patch = {
    name,
    icon: text(formData, 'icon'),
    description: text(formData, 'description'),
    slug: slugify(name) || 'categoria',
  };

  const menu = categoryId
    ? owned.menu.map((category) => (category.id === categoryId ? { ...category, ...patch } : category))
    : [
        ...owned.menu,
        { id: store.newId('cat'), position: owned.menu.length, items: [], ...patch },
      ];

  store.saveMenu(owned.businessId, menu);
  return { success: categoryId ? 'Categoria atualizada.' : 'Categoria criada.' };
}

export async function demoDeleteCategoryAction(formData: FormData): Promise<void> {
  const owned = ownedMenu();
  if (!owned) return;
  const categoryId = text(formData, 'categoryId');
  store.saveMenu(
    owned.businessId,
    owned.menu.filter((category) => category.id !== categoryId),
  );
}

export async function demoMoveCategoryAction(formData: FormData): Promise<void> {
  const owned = ownedMenu();
  if (!owned) return;

  const categoryId = text(formData, 'categoryId');
  const offset = formData.get('direction') === 'up' ? -1 : 1;
  const order = [...owned.menu];
  const index = order.findIndex((category) => category.id === categoryId);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= order.length) return;

  [order[index], order[target]] = [order[target]!, order[index]!];
  store.saveMenu(
    owned.businessId,
    order.map((category, position) => ({ ...category, position })),
  );
}

function parseOptions(formData: FormData): MenuOptionGroup[] {
  try {
    const raw = JSON.parse(String(formData.get('options') ?? '[]')) as {
      name: string;
      type: 'single' | 'multi';
      required: boolean;
      max: number | null;
      choices: { name: string; price: number }[];
    }[];

    return raw.map((group) => ({
      id: store.newId('grp'),
      name: group.name,
      type: group.type,
      required: Boolean(group.required),
      max: group.type === 'multi' && group.max ? group.max : null,
      choices: group.choices.map((choice) => ({
        id: store.newId('opt'),
        name: choice.name,
        price: Number(choice.price) || 0,
      })),
    }));
  } catch {
    return [];
  }
}

function parseList(formData: FormData, key: string): string[] {
  return text(formData, key)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function demoSaveItemAction(_state: FormState, formData: FormData): Promise<FormState> {
  const owned = ownedMenu();
  if (!owned) return { error: 'Sessão expirada. Entre novamente.' };

  const name = text(formData, 'name');
  const categoryId = text(formData, 'categoryId');
  const price = Number(text(formData, 'price').replace(',', '.'));

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = 'Informe o nome do item.';
  if (!categoryId) fieldErrors.categoryId = 'Escolha a categoria do item.';
  if (!Number.isFinite(price) || price < 0) fieldErrors.price = 'Informe um preço válido.';
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const itemId = text(formData, 'itemId');
  const caloriesRaw = text(formData, 'calories');

  const data: Omit<MenuItem, 'id' | 'position'> = {
    categoryId,
    slug: slugify(name) || 'item',
    name,
    description: text(formData, 'description'),
    price,
    image: text(formData, 'image') || '🍽️',
    imageAlt: text(formData, 'imageAlt') || name,
    tags: parseList(formData, 'tags'),
    allergens: parseList(formData, 'allergens'),
    serves: text(formData, 'serves'),
    calories: caloriesRaw ? Number(caloriesRaw) : null,
    available: formData.get('available') === 'on',
    options: parseOptions(formData),
  };

  const menu = owned.menu.map((category) => ({
    ...category,
    items: category.items.filter((item) => item.id !== itemId),
  }));

  const target = menu.find((category) => category.id === categoryId);
  if (!target) return { fieldErrors: { categoryId: 'Categoria não encontrada.' } };

  target.items = [
    ...target.items,
    { ...data, id: itemId || store.newId('item'), position: target.items.length },
  ];

  store.saveMenu(owned.businessId, menu);
  go('/painel/cardapio?salvo=1');
  return {};
}

export async function demoDeleteItemAction(formData: FormData): Promise<void> {
  const owned = ownedMenu();
  if (!owned) return;
  const itemId = text(formData, 'itemId');
  store.saveMenu(
    owned.businessId,
    owned.menu.map((category) => ({
      ...category,
      items: category.items.filter((item) => item.id !== itemId),
    })),
  );
}

export async function demoToggleItemAvailabilityAction(formData: FormData): Promise<void> {
  const owned = ownedMenu();
  if (!owned) return;
  const itemId = text(formData, 'itemId');
  const available = formData.get('available') === 'true';
  store.saveMenu(
    owned.businessId,
    owned.menu.map((category) => ({
      ...category,
      items: category.items.map((item) => (item.id === itemId ? { ...item, available } : item)),
    })),
  );
}
