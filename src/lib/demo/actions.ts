'use client';

import { createTranslator } from 'next-intl';
import enDemo from '../../../messages/en/demo.json';
import ptDemo from '../../../messages/pt-BR/demo.json';
import { clampRadius, isCoordinate } from '@/lib/delivery-area';
import { isValidImageRef, parsePriceInput } from '@/lib/format';
import { isValidWhatsapp, normalizeWhatsapp } from '@/lib/phone';
import { publishBlocker } from '@/lib/menu-utils';
import * as store from './store';
import type { FormState } from '@/server/actions/business';
import type {
  Business,
  MenuCategory,
  MenuItem,
  MenuOptionGroup,
  OptionType,
  WeeklyHours,
} from '@/lib/types';

/**
 * Versões das ações que rodam só no navegador, usadas no modo demonstração.
 * Mantêm a mesma assinatura das Server Actions para os formulários não mudarem.
 */

/**
 * Estado do formulário de entrar/criar conta. Só existe no modo demonstração:
 * com banco, quem cuida do login é o Clerk, com as telas dele.
 */
export interface AuthFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: { name?: string; email?: string };
}

function go(path: string) {
  window.location.assign(path);
}

/**
 * Estas ações rodam no navegador fora de qualquer componente, então não há
 * `useTranslations`: o idioma é o do `<html lang>` que o layout escreveu, e as
 * mensagens são as do namespace `demo` (pequeno, entra no pacote da demo).
 */
function tr(key: string): string {
  const locale = document.documentElement.lang === 'en' ? 'en' : 'pt-BR';
  const messages = locale === 'en' ? enDemo : ptDemo;
  return createTranslator({ locale, messages: { demo: messages }, namespace: 'demo.actions' })(key as never);
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

/** Mesma leitura do mapa que a server action faz — ver `parsePoint` lá. */
function point(formData: FormData): { latitude: number | null; longitude: number | null } {
  const latitude = Number(text(formData, 'latitude').replace(',', '.'));
  const longitude = Number(text(formData, 'longitude').replace(',', '.'));
  if (!isCoordinate(latitude, longitude)) return { latitude: null, longitude: null };
  return { latitude, longitude };
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
  if (name.length < 2) fieldErrors.name = tr('nameRequired');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fieldErrors.email = tr('emailInvalid');
  if (password.length < 8) fieldErrors.password = tr('passwordShort');
  if (Object.keys(fieldErrors).length) return { fieldErrors, values: { name, email } };

  if (store.findUserByEmail(email)) {
    return {
      fieldErrors: { email: tr('emailTaken') },
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
  const genericError = { error: tr('wrongCredentials'), values: { email } };
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
  if (!user) return { error: tr('sessionExpired') };

  const name = text(formData, 'name');
  const slug = slugify(text(formData, 'slug') || name);
  const whatsapp = normalizeWhatsapp(text(formData, 'whatsapp'));

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = tr('businessNameRequired');
  if (slug.length < 3) fieldErrors.slug = tr('slugShort');
  else if (store.slugTaken(slug)) fieldErrors.slug = tr('slugTaken');
  if (!isValidWhatsapp(whatsapp)) {
    fieldErrors.whatsapp = tr('whatsappInvalid');
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
    instagram: '',
    address: {
      street: '',
      district: '',
      city: text(formData, 'city'),
      state: '',
      postalCode: '',
      latitude: null,
      longitude: null,
    },
    hours: defaultHours(),
    // Desligadas, como no cadastro com banco: quem diz o que o restaurante faz
    // é a aba de entrega.
    delivery: {
      enabled: false,
      minOrder: 0,
      freeAbove: 0,
      radiusKm: 0,
      zones: [],
      pricing: 'zones',
      distance: { baseFee: 0, baseKm: 0, perKmFee: 0 },
    },
    pickup: { enabled: false, eta: '20-30 min' },
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
  if (!business) return { error: tr('sessionExpired') };

  const slug = slugify(text(formData, 'slug'));
  if (slug.length < 3) return { fieldErrors: { slug: tr('slugShort') } };
  if (store.slugTaken(slug, business.id)) {
    return { fieldErrors: { slug: tr('slugTaken') } };
  }

  const whatsapp = normalizeWhatsapp(text(formData, 'whatsapp'));
  if (!isValidWhatsapp(whatsapp)) {
    return { fieldErrors: { whatsapp: tr('whatsappInvalid') } };
  }

  const deliveryEnabled = formData.get('deliveryEnabled') === 'on';
  const pickupEnabled = formData.get('pickupEnabled') === 'on';
  if (!deliveryEnabled && !pickupEnabled) {
    return {
      fieldErrors: { orderModes: tr('orderModesRequired') },
    };
  }

  store.saveBusiness({
    ...business,
    name: text(formData, 'name') || business.name,
    slug,
    tagline: text(formData, 'tagline'),
    description: text(formData, 'description'),
    logo: text(formData, 'logo') || '🍽️',
    // A demonstração não envia fotos: a capa só sai, nunca entra por aqui.
    cover: formData.has('cover') ? text(formData, 'cover') || undefined : business.cover,
    brandColor: /^#[0-9a-fA-F]{6}$/.test(text(formData, 'brandColor'))
      ? text(formData, 'brandColor')
      : business.brandColor,
    whatsapp,
    instagram: text(formData, 'instagram'),
    address: {
      street: text(formData, 'street'),
      district: text(formData, 'district'),
      city: text(formData, 'city'),
      state: text(formData, 'state').toUpperCase(),
      postalCode: text(formData, 'postalCode'),
      ...point(formData),
    },
    hours: parseHours(formData),
    delivery: {
      enabled: deliveryEnabled,
      minOrder: money(formData, 'minOrder'),
      freeAbove: money(formData, 'freeAbove'),
      radiusKm:
        point(formData).latitude === null ? 0 : clampRadius(money(formData, 'deliveryRadiusKm')),
      zones: parseZones(formData),
      pricing:
        text(formData, 'deliveryPricing') === 'distance' && point(formData).latitude !== null
          ? 'distance'
          : 'zones',
      distance: {
        baseFee: money(formData, 'distanceBaseFee'),
        baseKm: money(formData, 'distanceBaseKm'),
        perKmFee: money(formData, 'distancePerKmFee'),
      },
    },
    pickup: { enabled: pickupEnabled, eta: text(formData, 'pickupEta') },
    updatedAt: new Date().toISOString(),
  });

  return { success: tr('savedInBrowser') };
}

/**
 * Versão da gravação por aba para o modo demonstração. Mesma regra do servidor:
 * a base é o que já está salvo e só os campos da aba mudam.
 */
export async function demoUpdateBusinessSectionAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  store.ensureLoaded();
  const current = store.getSnapshot();
  const user = store.currentUser(current);
  const business = store.businessOfUser(current, user?.id ?? null);
  if (!business) return { error: tr('sessionExpired') };

  const section = text(formData, 'section');
  let patch: Partial<typeof business> = {};

  if (section === 'identidade') {
    const slug = slugify(text(formData, 'slug'));
    if (slug.length < 3) return { fieldErrors: { slug: tr('slugShort') } };
    if (store.slugTaken(slug, business.id)) {
      return { fieldErrors: { slug: tr('slugTaken') } };
    }
    patch = {
      name: text(formData, 'name') || business.name,
      slug,
      tagline: text(formData, 'tagline'),
      description: text(formData, 'description'),
      logo: text(formData, 'logo') || '🍽️',
      cover: text(formData, 'cover') || undefined,
      brandColor: /^#[0-9a-fA-F]{6}$/.test(text(formData, 'brandColor'))
        ? text(formData, 'brandColor')
        : business.brandColor,
    };
  } else if (section === 'contato') {
    const whatsapp = normalizeWhatsapp(text(formData, 'whatsapp'));
    if (whatsapp.length < 12) {
      return { fieldErrors: { whatsapp: tr('whatsappWithDdd') } };
    }
    patch = {
      whatsapp,
      instagram: text(formData, 'instagram'),
    };
  } else if (section === 'horarios') {
    patch = { hours: parseHours(formData) };
  } else if (section === 'entrega') {
    const deliveryEnabled = formData.get('deliveryEnabled') === 'on';
    const pickupEnabled = formData.get('pickupEnabled') === 'on';
    if (!deliveryEnabled && !pickupEnabled) {
      return {
        fieldErrors: { orderModes: tr('orderModesRequired') },
      };
    }
    const marked = point(formData);
    patch = {
      // Endereço e ponto do mapa vêm do mesmo envio: dividem a aba, como no servidor.
      address: {
        street: text(formData, 'street'),
        district: text(formData, 'district'),
        city: text(formData, 'city'),
        state: text(formData, 'state').toUpperCase(),
        postalCode: text(formData, 'postalCode'),
        ...marked,
      },
      delivery: {
        enabled: deliveryEnabled,
        minOrder: money(formData, 'minOrder'),
        freeAbove: money(formData, 'freeAbove'),
        radiusKm: marked.latitude === null ? 0 : clampRadius(money(formData, 'deliveryRadiusKm')),
        zones: parseZones(formData),
        // Sem ponto no mapa não há de onde medir: a cobrança volta por bairro.
        pricing:
          text(formData, 'deliveryPricing') === 'distance' && marked.latitude !== null
            ? 'distance'
            : 'zones',
        distance: {
          baseFee: money(formData, 'distanceBaseFee'),
          baseKm: money(formData, 'distanceBaseKm'),
          perKmFee: money(formData, 'distancePerKmFee'),
        },
      },
      pickup: { enabled: pickupEnabled, eta: text(formData, 'pickupEta') },
    };
  } else {
    return { error: tr('unknownSection') };
  }

  store.saveBusiness({ ...business, ...patch, updatedAt: new Date().toISOString() });
  return { success: tr('savedInBrowser') };
}

export async function demoTogglePublishAction(formData: FormData): Promise<void> {
  store.ensureLoaded();
  const current = store.getSnapshot();
  const business = store.businessOfUser(current, store.currentUser(current)?.id ?? null);
  if (!business) return;
  const publish = formData.get('publish') === 'true';
  if (publish && publishBlocker(business, store.menuOfBusiness(current, business.id))) return;
  store.saveBusiness({ ...business, published: publish });
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
  if (!owned) return { error: tr('sessionExpired') };

  const name = text(formData, 'name');
  if (name.length < 2) return { fieldErrors: { name: tr('categoryNameRequired') } };

  const categoryId = text(formData, 'categoryId');
  const patch = {
    name,
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
  return { success: categoryId ? tr('categoryUpdated') : tr('categoryCreated') };
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

/** Grupos e opções com o mesmo nome mantêm o id: a sacola do cliente depende deles. */
function parseOptions(formData: FormData, previous: MenuOptionGroup[] = []): MenuOptionGroup[] {
  const spareGroups = [...previous];
  try {
    const raw = JSON.parse(String(formData.get('options') ?? '[]')) as {
      name: string;
      type: OptionType;
      required: boolean;
      max: number | null;
      choices: { name: string; price: number }[];
    }[];

    return raw.map((group) => {
      const index = spareGroups.findIndex((entry) => entry.name === group.name);
      const kept = index >= 0 ? spareGroups.splice(index, 1)[0] : undefined;
      const spareChoices = [...(kept?.choices ?? [])];
      return {
        id: kept?.id ?? store.newId('grp'),
        name: group.name,
        type: group.type,
        required: Boolean(group.required),
        max: group.type !== 'single' && group.max ? group.max : null,
        choices: group.choices.map((choice) => {
          const choiceIndex = spareChoices.findIndex((entry) => entry.name === choice.name);
          const keptChoice = choiceIndex >= 0 ? spareChoices.splice(choiceIndex, 1)[0] : undefined;
          return {
            id: keptChoice?.id ?? store.newId('opt'),
            name: choice.name,
            // Tirar um ingrediente não custa nada, como na server action.
            price: group.type === 'remove' ? 0 : Number(choice.price) || 0,
          };
        }),
      };
    });
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
  if (!owned) return { error: tr('sessionExpired') };

  const name = text(formData, 'name');
  const categoryId = text(formData, 'categoryId');
  const price = parsePriceInput(text(formData, 'price'));

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = tr('itemNameRequired');
  if (!categoryId) fieldErrors.categoryId = tr('itemCategoryRequired');
  if (price === null) fieldErrors.price = tr('itemPriceRequired');
  if (!isValidImageRef(text(formData, 'image'))) {
    fieldErrors.image = tr('itemImageInvalid');
  }
  if (price === null || Object.keys(fieldErrors).length) return { fieldErrors };

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
    options: parseOptions(
      formData,
      owned.menu.flatMap((category) => category.items).find((item) => item.id === itemId)?.options,
    ),
  };

  const menu = owned.menu.map((category) => ({
    ...category,
    items: category.items.filter((item) => item.id !== itemId),
  }));

  const target = menu.find((category) => category.id === categoryId);
  if (!target) return { fieldErrors: { categoryId: tr('categoryNotFound') } };

  target.items = [
    ...target.items,
    { ...data, id: itemId || store.newId('item'), position: target.items.length },
  ];

  store.saveMenu(owned.businessId, menu);
  return { success: itemId ? tr('itemSaved') : tr('itemAdded') };
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
