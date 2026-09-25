'use client';

import { createTranslator } from 'next-intl';
import enDemo from '../../../messages/en/demo.json';
import ptDemo from '../../../messages/pt-BR/demo.json';
import { clampRadius, isCoordinate, MAX_RADIUS_KM } from '@/lib/delivery-area';
import { parsePriceInput } from '@/lib/format';
import { isValidWhatsapp, normalizeWhatsapp } from '@/lib/phone';
import { checkCategory, checkItem, checkOptions, copyName, type OptionGroupInput, type RuleText } from '@/lib/menu-rules';
import { publishBlocker } from '@/lib/menu-utils';
import { slugify } from '@/lib/slug';
import { continueAfter, DEFAULT_LOGO } from '@/components/painel/setup-steps';
import * as store from './store';
import { WEEKDAYS } from '@/lib/hours';
import { HOURS_MESSAGE, hoursErrorKey, readHoursForm } from '@/lib/hours-form';
import type { BusinessSection } from '@/components/painel/business-sections';
import type { FormState, PublishResult } from '@/server/actions/business';
import type {
  Business,
  MenuCategory,
  MenuItem,
  MenuOptionGroup,
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
function tr(key: string, values?: Record<string, string | number>): string {
  const locale = document.documentElement.lang === 'en' ? 'en' : 'pt-BR';
  const messages = locale === 'en' ? enDemo : ptDemo;
  return createTranslator({ locale, messages: { demo: messages }, namespace: 'demo.actions' })(
    key as never,
    values as never,
  );
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

/** Sem horário gravado, como no cadastro com banco (`emptyHours` lá). */
function emptyHours(): WeeklyHours {
  const hours: WeeklyHours = {};
  for (let day = 0; day < 7; day += 1) hours[day] = [];
  return hours;
}

/** Teto e mensagens (já no idioma da tela) de um número da aba de entrega — `NumberRule` no servidor. */
interface DemoNumberRule {
  max: number;
  invalid: string;
  tooBig: string;
}

/** As regras de `amountRule` e `kmRule` no servidor, com as mesmas frases de `painel.actions`. */
function numberRules(t: RuleText): { amount: DemoNumberRule; km: DemoNumberRule } {
  return {
    amount: { max: 10000, invalid: t('amountInvalid'), tooBig: t('amountMax') },
    km: { max: MAX_RADIUS_KM, invalid: t('kmInvalid'), tooBig: t('kmMax', { max: MAX_RADIUS_KM }) },
  };
}

/** O filtro de `parseNumber` no servidor: dígitos, com "R$" na frente ou "km" atrás. */
const NUMBER_TEXT = /^(?:R\$\s*)?[\d.,\s]+(?:km)?$/i;

/**
 * Mesma leitura de `readNumber` no servidor: vazio vale 0, texto que não é
 * número é erro no campo que está à vista e fica com o valor gravado no que
 * está escondido.
 */
function readNumber(
  value: FormDataEntryValue | null,
  rule: DemoNumberRule,
  visible: boolean,
  previous: number,
): { value: number; error?: string } {
  const raw = String(value ?? '').trim();
  const parsed = raw === '' ? 0 : NUMBER_TEXT.test(raw) ? parsePriceInput(raw) : null;
  const rounded = parsed === null ? null : Math.round(parsed * 100) / 100;
  if (rounded !== null && rounded <= rule.max) return { value: rounded };
  if (!visible) return { value: previous };
  return { value: previous, error: rounded === null ? rule.invalid : rule.tooBig };
}

/** O prazo do bairro, como `zoneEta` no servidor: "30-45" vira "30-45 min". */
function zoneEta(value: string): string {
  const eta = value.trim().slice(0, 40);
  return /^\d+(\s*(-|–|a|to)\s*\d+)?$/.test(eta) ? `${eta} min` : eta;
}

/** Bairros da aba de entrega, com o erro da taxa apontando a linha (`zone-fee-2`). */
function parseZonesChecked(
  formData: FormData,
  rule: DemoNumberRule,
  visible: boolean,
  previous: Business['delivery']['zones'],
): { zones: Business['delivery']['zones']; errors: Record<string, string> } {
  const names = formData.getAll('zone-name').map(String);
  const fees = formData.getAll('zone-fee');
  const etas = formData.getAll('zone-eta').map(String);
  const errors: Record<string, string> = {};
  const zones: Business['delivery']['zones'] = [];
  names.forEach((raw, index) => {
    const name = raw.trim().slice(0, 60);
    if (!name) return;
    const kept = previous.find((zone) => zone.name === name);
    const fee = readNumber(fees[index] ?? null, rule, visible, kept?.fee ?? 0);
    if (fee.error) errors[`zone-fee-${index}`] = fee.error;
    zones.push({ id: kept?.id ?? store.newId('zone'), name, fee: fee.value, eta: zoneEta(etas[index] ?? '') });
  });
  return { zones: zones.slice(0, 40), errors };
}

export async function demoCreateBusinessAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  store.ensureLoaded();
  const user = store.currentUser(store.getSnapshot());
  if (!user) return { error: tr('sessionExpired') };

  const name = text(formData, 'name');
  // Mesma leitura do servidor: link vazio é o do nome, e o formato é o de `lib/slug`.
  const typedSlug = slugify(text(formData, 'slug'));
  const slug = typedSlug || slugify(name);
  const whatsapp = normalizeWhatsapp(text(formData, 'whatsapp'));

  const fieldErrors: Record<string, string> = {};
  if (name.length < 2) fieldErrors.name = tr('businessNameRequired');
  // Link derivado de um nome que já falhou não ganha um segundo erro.
  if (slug.length < 3) {
    if (typedSlug || !fieldErrors.name) fieldErrors.slug = tr('slugShort');
  } else if (store.slugTaken(slug)) fieldErrors.slug = tr('slugTaken');
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
    // O mesmo logo provisório do servidor: é por ele que o guia sabe que a
    // identidade ainda não foi feita.
    logo: DEFAULT_LOGO,
    brandColor: '#0b8639',
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
    hours: emptyHours(),
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

/**
 * Os campos de texto que passam do limite, com a frase do servidor ("Use no
 * máximo 120 caracteres (agora são 131).") — o tamanho contado como lá, depois
 * de tirar os espaços das pontas.
 */
function tooLongErrors(
  formData: FormData,
  limits: Record<string, number>,
  t: RuleText,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const [key, max] of Object.entries(limits)) {
    const count = text(formData, key).length;
    if (count > max) errors[key] = t('tooLong', { max, count });
  }
  return errors;
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
  // As frases de limite (tamanho, km) são as de `painel.actions`, as mesmas do servidor.
  const t = await menuText();
  let patch: Partial<typeof business> = {};

  if (section === 'identidade') {
    /*
     * Os limites de `settingsSchema`, com as mesmas mensagens e todos os erros
     * juntos, como o Zod devolve no servidor: nome e link voltam no mesmo
     * envio. "Já em uso" só é conferido quando o resto da aba passou — lá o
     * banco só é consultado depois de o formulário inteiro passar.
     */
    const name = text(formData, 'name');
    // O mesmo formato do servidor (`lib/slug`): o campo pode chegar com o hífen do fim.
    const slug = slugify(text(formData, 'slug'));
    const fieldErrors = tooLongErrors(formData, { name: 80, tagline: 120, description: 1200 }, t);
    if (name.length < 2) fieldErrors.name = tr('businessNameRequired');
    if (slug.length < 3) fieldErrors.slug = tr('slugShort');
    else if (Object.keys(fieldErrors).length === 0 && store.slugTaken(slug, business.id)) {
      fieldErrors.slug = tr('slugTaken');
    }
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
    patch = {
      name,
      slug,
      tagline: text(formData, 'tagline'),
      description: text(formData, 'description'),
      logo: text(formData, 'logo') || DEFAULT_LOGO,
      cover: text(formData, 'cover') || undefined,
      brandColor: /^#[0-9a-fA-F]{6}$/.test(text(formData, 'brandColor'))
        ? text(formData, 'brandColor')
        : business.brandColor,
    };
  } else if (section === 'contato') {
    const whatsapp = normalizeWhatsapp(text(formData, 'whatsapp'));
    // A mesma validação do servidor: comprimento certo para o país do número.
    // A mesma frase do servidor e do cadastro — o campo tem seletor de país, e
    // um exemplo só do Brasil não serve a quem não é daqui.
    const fieldErrors = tooLongErrors(formData, { instagram: 120 }, t);
    if (!isValidWhatsapp(whatsapp)) fieldErrors.whatsapp = tr('whatsappInvalid');
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors };
    patch = {
      whatsapp,
      instagram: text(formData, 'instagram'),
    };
  } else if (section === 'horarios') {
    // A mesma leitura do servidor (`lib/hours-form`): erro por dia, na linha dele.
    const { hours, problems } = readHoursForm(formData);
    const days = Object.entries(problems);
    if (days.length > 0) {
      const fieldErrors: Record<string, string> = {};
      for (const [day, problem] of days) {
        if (!problem) continue;
        const values = { day: tr('weekday', { day: WEEKDAYS[Number(day)] ?? '' }) };
        fieldErrors[hoursErrorKey(Number(day))] = tr(HOURS_MESSAGE[problem], values);
      }
      return { fieldErrors };
    }
    patch = { hours };
  } else if (section === 'entrega') {
    // As mesmas regras de `updateBusinessSectionAction`, na mesma ordem: todos
    // os erros da aba voltam juntos, e número em bloco escondido fica com o gravado.
    const deliveryEnabled = formData.get('deliveryEnabled') === 'on';
    const pickupEnabled = formData.get('pickupEnabled') === 'on';
    const wantsDistance = text(formData, 'deliveryPricing') === 'distance';
    const marked = point(formData);
    const stored = business.delivery;
    // Os limites de texto de `deliverySchema`, com a frase do servidor: sem
    // eles a demonstração gravava um endereço que o painel com banco recusa.
    const fieldErrors = tooLongErrors(
      formData,
      { street: 160, district: 80, city: 80, state: 2, postalCode: 12, pickupEta: 40 },
      t,
    );
    const read = (key: string, rule: DemoNumberRule, visible: boolean, previous: number) => {
      const result = readNumber(formData.get(key), rule, visible, previous);
      if (result.error) fieldErrors[key] = result.error;
      return result.value;
    };
    const byDistance = deliveryEnabled && wantsDistance;
    const rules = numberRules(t);
    const minOrder = read('minOrder', rules.amount, deliveryEnabled, stored.minOrder);
    const freeAbove = read('freeAbove', rules.amount, deliveryEnabled, stored.freeAbove);
    const distance = {
      baseFee: read('distanceBaseFee', rules.amount, byDistance, stored.distance.baseFee),
      baseKm: read('distanceBaseKm', rules.km, byDistance, stored.distance.baseKm),
      perKmFee: read('distancePerKmFee', rules.amount, byDistance, stored.distance.perKmFee),
    };
    const zones = parseZonesChecked(formData, rules.amount, deliveryEnabled && !wantsDistance, stored.zones);
    Object.assign(fieldErrors, zones.errors);
    if (!deliveryEnabled && !pickupEnabled) fieldErrors.orderModes = tr('orderModesRequired');
    // Sem ponto no mapa não há de onde medir: com a entrega ligada, não salva.
    if (byDistance && marked.latitude === null) fieldErrors.deliveryPricing = tr('needPoint');
    if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

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
        minOrder,
        freeAbove,
        radiusKm:
          marked.latitude === null ? 0 : clampRadius(parsePriceInput(text(formData, 'deliveryRadiusKm')) ?? 0),
        zones: zones.zones,
        // Com a entrega desligada a escolha fica guardada como está (ver `parseDistancePricing`).
        pricing: wantsDistance ? 'distance' : 'zones',
        distance,
      },
      pickup: { enabled: pickupEnabled, eta: text(formData, 'pickupEta') },
    };
  } else {
    return { error: tr('unknownSection') };
  }

  const saved = { ...business, ...patch, updatedAt: new Date().toISOString() };
  store.saveBusiness(saved);
  // O próximo passo pelo que ficou gravado, como no servidor (ver `FormState.next`).
  const next = continueAfter(saved, store.menuOfBusiness(store.getSnapshot(), business.id), section as BusinessSection, {
    savedIsDone: false,
  });
  return { success: tr('savedInBrowser'), next };
}

/** Espelho de `togglePublishAction`: mesma regra, mesma resposta. */
export async function demoTogglePublishAction(formData: FormData): Promise<PublishResult> {
  store.ensureLoaded();
  const current = store.getSnapshot();
  const business = store.businessOfUser(current, store.currentUser(current)?.id ?? null);
  if (!business) return { error: 'session' };
  const publish = formData.get('publish') === 'true';
  if (publish) {
    const blocker = publishBlocker(business, store.menuOfBusiness(current, business.id));
    if (blocker) return { error: blocker };
  }
  store.saveBusiness({ ...business, published: publish });
  return { success: publish ? 'published' : 'unpublished' };
}

/* ----------------------------------------------------------------- cardápio */

function ownedMenu(): { businessId: string; menu: MenuCategory[] } | null {
  store.ensureLoaded();
  const current = store.getSnapshot();
  const business = store.businessOfUser(current, store.currentUser(current)?.id ?? null);
  if (!business) return null;
  return { businessId: business.id, menu: store.menuOfBusiness(current, business.id) };
}

/**
 * Mensagens das regras do cardápio e dos limites das abas do negócio: as
 * mesmas `painel.actions` das server actions, para a demonstração responder
 * com o mesmo texto e as mesmas regras (`lib/menu-rules.ts`). O painel.json
 * vem por import dinâmico: só baixa quando uma ação do painel da demonstração
 * roda, e fora dela nunca.
 */
async function menuText(): Promise<RuleText> {
  const locale = document.documentElement.lang === 'en' ? 'en' : 'pt-BR';
  const painel =
    locale === 'en'
      ? (await import('../../../messages/en/painel.json')).default
      : (await import('../../../messages/pt-BR/painel.json')).default;
  const t = createTranslator({ locale, messages: { painel }, namespace: 'painel.actions' });
  return (key, values) => t(key as never, values as never);
}

/** O primeiro endereço livre a partir de `base` — o mesmo sufixo "-2", "-3" do servidor. */
function freeSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export async function demoSaveCategoryAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const owned = ownedMenu();
  if (!owned) return { error: tr('sessionExpired') };
  const t = await menuText();

  const parsed = checkCategory(
    { name: String(formData.get('name') ?? ''), description: String(formData.get('description') ?? '') },
    t,
  );
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };

  const categoryId = text(formData, 'categoryId');
  const previous = categoryId ? owned.menu.find((category) => category.id === categoryId) : undefined;
  const patch = {
    ...parsed.data,
    // Mesmo nome, mesmo endereço — como `categorySlug` no servidor.
    slug:
      previous && previous.name === parsed.data.name && previous.slug
        ? previous.slug
        : freeSlug(
            slugify(parsed.data.name) || 'categoria',
            owned.menu.filter((category) => category.id !== categoryId).map((category) => category.slug),
          ),
  };

  const menu = categoryId
    ? owned.menu.map((category) => (category.id === categoryId ? { ...category, ...patch } : category))
    : [
        ...owned.menu,
        { id: store.newId('cat'), position: owned.menu.length, items: [], ...patch },
      ];

  store.saveMenu(owned.businessId, menu);
  return { success: categoryId ? t('categoryUpdated') : t('categoryCreated') };
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
function withIds(groups: OptionGroupInput[], previous: MenuOptionGroup[] = []): MenuOptionGroup[] {
  const spareGroups = [...previous];
  return groups.map((group) => {
    const index = spareGroups.findIndex((entry) => entry.name === group.name);
    const kept = index >= 0 ? spareGroups.splice(index, 1)[0] : undefined;
    const spareChoices = [...(kept?.choices ?? [])];
    return {
      ...group,
      id: kept?.id ?? store.newId('grp'),
      choices: group.choices.map((choice) => {
        const choiceIndex = spareChoices.findIndex((entry) => entry.name === choice.name);
        const keptChoice = choiceIndex >= 0 ? spareChoices.splice(choiceIndex, 1)[0] : undefined;
        return { ...choice, id: keptChoice?.id ?? store.newId('opt') };
      }),
    };
  });
}

function parseList(formData: FormData, key: string): string[] {
  return text(formData, key)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function demoSaveItemAction(_state: FormState, formData: FormData): Promise<FormState> {
  const owned = ownedMenu();
  if (!owned) return { error: tr('sessionExpired') };
  const t = await menuText();

  const field = (key: string) => String(formData.get(key) ?? '');
  const parsed = checkItem(
    {
      categoryId: field('categoryId'),
      name: field('name'),
      description: field('description'),
      price: field('price'),
      image: field('image'),
      imageAlt: field('imageAlt'),
      serves: field('serves'),
      calories: field('calories'),
    },
    t,
  );
  let options: ReturnType<typeof checkOptions>;
  try {
    options = checkOptions(JSON.parse(field('options') || '[]') as unknown, t);
  } catch {
    options = { ok: false, error: t('optionsUnreadable') };
  }
  if (!parsed.ok || !options.ok) {
    return {
      fieldErrors: {
        ...(parsed.ok ? {} : parsed.fieldErrors),
        ...(options.ok ? {} : { options: options.error }),
      },
    };
  }

  const itemId = text(formData, 'itemId');
  const allItems = owned.menu.flatMap((category) => category.items);
  const previous = itemId ? allItems.find((item) => item.id === itemId) : undefined;
  if (itemId && !previous) return { error: t('itemMissing') };

  const { categoryId } = parsed.data;
  if (!owned.menu.some((category) => category.id === categoryId)) {
    return { fieldErrors: { categoryId: t('categoryNotOwned') } };
  }

  const data: Omit<MenuItem, 'id' | 'position'> = {
    ...parsed.data,
    // Mesmo nome, mesmo endereço: o link do prato que já circula continua abrindo.
    slug:
      previous && previous.name === parsed.data.name && previous.slug
        ? previous.slug
        : freeSlug(
            slugify(parsed.data.name) || 'item',
            allItems.filter((item) => item.id !== itemId).map((item) => item.slug),
          ),
    imageAlt: parsed.data.imageAlt || parsed.data.name,
    tags: parseList(formData, 'tags'),
    allergens: parseList(formData, 'allergens'),
    available: formData.get('available') === 'on',
    options: withIds(options.groups, previous?.options),
  };

  // Na mesma categoria o item fica onde estava; trocando de categoria, vai
  // para o fim da nova — como `updateItem` faz no banco.
  const stays = previous?.categoryId === categoryId;
  const menu = owned.menu.map((category) => {
    if (stays) {
      return category.id === categoryId
        ? { ...category, items: category.items.map((item) => (item.id === itemId ? { ...item, ...data } : item)) }
        : category;
    }
    const items = category.items.filter((item) => item.id !== itemId);
    if (category.id !== categoryId) return items.length === category.items.length ? category : { ...category, items };
    return {
      ...category,
      items: [...items, { ...data, id: itemId || store.newId('item'), position: items.length }],
    };
  });

  store.saveMenu(owned.businessId, menu);
  return { success: itemId ? t('itemSaved') : t('itemAdded') };
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

/** Espelho de `moveItemAction`: troca com o vizinho dentro da categoria. */
export async function demoMoveItemAction(
  _businessId: string,
  itemId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const owned = ownedMenu();
  if (!owned) return;
  store.saveMenu(
    owned.businessId,
    owned.menu.map((category) => {
      const index = category.items.findIndex((item) => item.id === itemId);
      const target = index + (direction === 'up' ? -1 : 1);
      if (index < 0 || target < 0 || target >= category.items.length) return category;
      const items = [...category.items];
      [items[index], items[target]] = [items[target]!, items[index]!];
      return { ...category, items: items.map((item, position) => ({ ...item, position })) };
    }),
  );
}

/** Espelho de `duplicateItemAction`: "<nome> (cópia)" logo abaixo, com foto e complementos. */
export async function demoDuplicateItemAction(
  _businessId: string,
  itemId: string,
): Promise<{ id?: string; success?: string; error?: string }> {
  const owned = ownedMenu();
  if (!owned) return { error: tr('sessionExpired') };
  const t = await menuText();

  const category = owned.menu.find((entry) => entry.items.some((item) => item.id === itemId));
  const index = category?.items.findIndex((item) => item.id === itemId) ?? -1;
  const original = category?.items[index];
  if (!category || !original) return { error: t('itemMissing') };

  const name = copyName(original.name, t);
  const copy: MenuItem = {
    ...original,
    id: store.newId('item'),
    name,
    slug: freeSlug(
      slugify(name) || 'item',
      owned.menu.flatMap((entry) => entry.items).map((item) => item.slug),
    ),
    // O texto alternativo padrão é o nome do prato; escrito à mão, fica.
    imageAlt: original.imageAlt === original.name ? name : original.imageAlt,
    options: original.options.map(store.cloneGroup),
  };
  const items = [...category.items];
  items.splice(index + 1, 0, copy);

  store.saveMenu(
    owned.businessId,
    owned.menu.map((entry) =>
      entry.id === category.id ? { ...entry, items: items.map((item, position) => ({ ...item, position })) } : entry,
    ),
  );
  return { id: copy.id, success: t('itemDuplicated') };
}
