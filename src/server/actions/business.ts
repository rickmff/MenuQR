'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { assertOwnership, requireUser } from '../auth/guards';
import { requireSubscription } from '../billing/access';
import { isUniqueViolation } from '../db/client';
import { cleanupOrphanImagesLater } from '../image-cleanup';
import { revalidateStore } from '../revalidate';
import {
  createBusiness,
  getBusinessByOwner,
  isSlugAvailable,
  replaceZones,
  setPublished,
  slugify,
  updateBusiness,
  type BusinessInput,
} from '../repositories/businesses';
import { getMenu } from '../repositories/menu';
import { clampRadius, isCoordinate, MAX_RADIUS_KM } from '@/lib/delivery-area';
import { isValidImageRef } from '@/lib/format';
import { isValidWhatsapp, normalizeWhatsapp } from '@/lib/phone';
import { publishBlocker } from '@/lib/menu-utils';
import type { BusinessSection } from '@/components/painel/business-sections';
import type { Business, WeeklyHours } from '@/lib/types';

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}

const slugSchema = z
  .string()
  .trim()
  .min(3, 'O endereço precisa de pelo menos 3 caracteres.')
  .max(40, 'O endereço pode ter no máximo 40 caracteres.')
  .regex(/^[a-z0-9-]+$/, 'Use apenas letras minúsculas, números e hífens.');

/**
 * O campo manda E.164 ("+5511987654321"), de qualquer país. A validação é a da
 * libphonenumber: comprimento certo para o país do número, não uma faixa fixa.
 */
const whatsappSchema = z
  .string()
  .transform(normalizeWhatsapp)
  .refine(isValidWhatsapp, { message: 'Informe um WhatsApp válido, com o código de área.' });

const onboardingSchema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do restaurante.').max(80),
  slug: slugSchema,
  whatsapp: whatsappSchema,
  city: z.string().trim().max(80).default(''),
});

/** Horário padrão sugerido no cadastro: todos os dias das 18h às 23h. */
function defaultHours(): WeeklyHours {
  const hours: WeeklyHours = {};
  for (let day = 0; day < 7; day += 1) hours[day] = [{ open: '18:00', close: '23:00' }];
  return hours;
}

export async function createBusinessAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  await requireSubscription(user);
  if (await getBusinessByOwner(user.id)) redirect('/painel');

  const raw = {
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? '') || slugify(String(formData.get('name') ?? '')),
    whatsapp: String(formData.get('whatsapp') ?? ''),
    city: String(formData.get('city') ?? ''),
  };

  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  if (!(await isSlugAvailable(parsed.data.slug))) {
    return { fieldErrors: { slug: 'Este endereço já está em uso. Escolha outro.' } };
  }

  const input: BusinessInput = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    tagline: '',
    description: '',
    logo: '🍽️',
    brandColor: '#c2410c',
    whatsapp: parsed.data.whatsapp,
    instagram: '',
    address: {
      street: '',
      district: '',
      city: parsed.data.city,
      state: '',
      postalCode: '',
      latitude: null,
      longitude: null,
    },
    hours: defaultHours(),
    // Entrega e retirada nascem desligadas: é o lojista quem diz o que faz, na
    // aba de entrega. Enquanto as duas estiverem desligadas, o guia de
    // configuração mantém o passo pendente (`deliveryDone`).
    delivery: {
      enabled: false,
      minOrder: 0,
      freeAbove: 0,
      radiusKm: 0,
      pricing: 'zones',
      distance: { baseFee: 0, baseKm: 0, perKmFee: 0 },
    },
    pickup: { enabled: false, eta: '20-30 min' },
  };

  const slugTaken: FormState = { fieldErrors: { slug: 'Este endereço já está em uso. Escolha outro.' } };
  try {
    await createBusiness(user.id, input);
  } catch (error) {
    if (isUniqueViolation(error)) return slugTaken;
    throw error;
  }
  revalidatePath('/painel');
  redirect('/painel/cardapio');
}

const settingsSchema = onboardingSchema.omit({ city: true }).extend({
  tagline: z.string().trim().max(120).default(''),
  description: z.string().trim().max(1200).default(''),
  logo: z
    .string()
    .trim()
    .max(300)
    .refine(isValidImageRef, 'Envie uma imagem para a logo.')
    .default('🍽️'),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Escolha uma cor no formato #rrggbb.')
    .default('#c2410c'),
  instagram: z.string().trim().max(120).default(''),
  street: z.string().trim().max(160).default(''),
  district: z.string().trim().max(80).default(''),
  city: z.string().trim().max(80).default(''),
  state: z.string().trim().max(2).default(''),
  postalCode: z.string().trim().max(12).default(''),
  minOrder: z.number().min(0).max(10000),
  freeAbove: z.number().min(0).max(10000),
  deliveryRadiusKm: z.number().min(0).max(MAX_RADIUS_KM),
  pickupEta: z.string().trim().max(40).default(''),
});

function parseNumber(value: FormDataEntryValue | null): number {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

/**
 * O ponto do restaurante, como o mapa do painel mandou. Campo vazio, texto
 * estranho ou coordenada impossível viram `null` — o cardápio prefere não
 * mostrar área de entrega a mostrar um círculo no lugar errado.
 */
function parsePoint(formData: FormData): { latitude: number | null; longitude: number | null } {
  const latitude = Number(String(formData.get('latitude') ?? '').replace(',', '.'));
  const longitude = Number(String(formData.get('longitude') ?? '').replace(',', '.'));
  if (!isCoordinate(latitude, longitude)) return { latitude: null, longitude: null };
  return { latitude, longitude };
}

/** Sem ponto marcado não existe área: o raio vai junto. */
function parseRadius(formData: FormData, point: { latitude: number | null }): number {
  if (point.latitude === null) return 0;
  return clampRadius(parseNumber(formData.get('deliveryRadiusKm')));
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Devolve `null` quando algum dia veio pela metade ou fora do formato HH:MM. */
function parseHoursForm(formData: FormData): WeeklyHours | null {
  const hours: WeeklyHours = {};
  for (let day = 0; day < 7; day += 1) {
    const open = String(formData.get(`hours-${day}-open`) ?? '').trim();
    const close = String(formData.get(`hours-${day}-close`) ?? '').trim();
    if (!open && !close) {
      hours[day] = [];
      continue;
    }
    if (!TIME_PATTERN.test(open) || !TIME_PATTERN.test(close)) return null;
    hours[day] = [{ open, close }];
  }
  return hours;
}

function parseZonesForm(formData: FormData) {
  const names = formData.getAll('zone-name').map(String);
  const fees = formData.getAll('zone-fee');
  const etas = formData.getAll('zone-eta').map(String);

  return names
    .map((name, index) => ({
      name: name.trim(),
      fee: parseNumber(fees[index] ?? null),
      eta: (etas[index] ?? '').trim(),
    }))
    .filter((zone) => zone.name.length > 0)
    .slice(0, 40);
}

export async function updateBusinessAction(_state: FormState, formData: FormData): Promise<FormState> {
  const businessId = String(formData.get('businessId') ?? '');

  let business;
  try {
    ({ business } = await assertOwnership(businessId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Não foi possível salvar.' };
  }

  const parsed = settingsSchema.safeParse({
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    whatsapp: String(formData.get('whatsapp') ?? ''),
    tagline: String(formData.get('tagline') ?? ''),
    description: String(formData.get('description') ?? ''),
    logo: String(formData.get('logo') ?? '🍽️'),
    brandColor: String(formData.get('brandColor') ?? '#c2410c'),
    instagram: String(formData.get('instagram') ?? ''),
    street: String(formData.get('street') ?? ''),
    district: String(formData.get('district') ?? ''),
    city: String(formData.get('city') ?? ''),
    state: String(formData.get('state') ?? '').toUpperCase(),
    postalCode: String(formData.get('postalCode') ?? ''),
    minOrder: parseNumber(formData.get('minOrder')),
    freeAbove: parseNumber(formData.get('freeAbove')),
    deliveryRadiusKm: parseRadius(formData, parsePoint(formData)),
    pickupEta: String(formData.get('pickupEta') ?? ''),
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  const point = parsePoint(formData);

  if (!(await isSlugAvailable(parsed.data.slug, business.id))) {
    return { fieldErrors: { slug: 'Este endereço já está em uso. Escolha outro.' } };
  }

  const hours = parseHoursForm(formData);
  const deliveryEnabled = formData.get('deliveryEnabled') === 'on';
  const pickupEnabled = formData.get('pickupEnabled') === 'on';

  // Regras que, se passarem, deixam o cliente sem ter como concluir o pedido.
  const ruleErrors: Record<string, string> = {};
  if (!hours) ruleErrors.hours = 'Preencha abertura e fechamento do dia, ou deixe os dois em branco.';
  if (!deliveryEnabled && !pickupEnabled) {
    ruleErrors.orderModes = 'Ative entrega, retirada ou as duas — sem isso ninguém consegue pedir.';
  }
  if (!hours || Object.keys(ruleErrors).length > 0) return { fieldErrors: ruleErrors };

  const input: BusinessInput = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    tagline: parsed.data.tagline,
    description: parsed.data.description,
    logo: parsed.data.logo || '🍽️',
    brandColor: parsed.data.brandColor,
    whatsapp: parsed.data.whatsapp,
    instagram: parsed.data.instagram,
    address: {
      street: parsed.data.street,
      district: parsed.data.district,
      city: parsed.data.city,
      state: parsed.data.state,
      postalCode: parsed.data.postalCode,
      latitude: point.latitude,
      longitude: point.longitude,
    },
    hours,
    delivery: {
      enabled: deliveryEnabled,
      minOrder: parsed.data.minOrder,
      freeAbove: parsed.data.freeAbove,
      radiusKm: parsed.data.deliveryRadiusKm,
      ...parseDistancePricing(formData, point),
    },
    pickup: {
      enabled: pickupEnabled,
      eta: parsed.data.pickupEta,
    },
  };

  try {
    await updateBusiness(business.id, input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { fieldErrors: { slug: 'Este endereço já está em uso. Escolha outro.' } };
    }
    throw error;
  }
  await replaceZones(business.id, parseZonesForm(formData));

  revalidateStore(business.slug);
  // O endereço pode ter mudado: o antigo também sai do cache.
  if (parsed.data.slug !== business.slug) revalidateStore(parsed.data.slug);
  // Logo trocada: a antiga ficou sem dono.
  if (input.logo !== business.logo) cleanupOrphanImagesLater(business.id);

  return { success: 'Alterações salvas. O cardápio publicado já está atualizado.' };
}

/** O cadastro atual no formato que `updateBusiness` espera (sem bairros, que têm tabela própria). */
function toInput(business: Business): BusinessInput {
  return {
    name: business.name,
    slug: business.slug,
    tagline: business.tagline,
    description: business.description,
    logo: business.logo,
    brandColor: business.brandColor,
    whatsapp: business.whatsapp,
    instagram: business.instagram,
    address: business.address,
    hours: business.hours,
    delivery: {
      enabled: business.delivery.enabled,
      minOrder: business.delivery.minOrder,
      freeAbove: business.delivery.freeAbove,
      radiusKm: business.delivery.radiusKm,
      pricing: business.delivery.pricing,
      distance: business.delivery.distance,
    },
    pickup: business.pickup,
  };
}

const identitySchema = settingsSchema.pick({
  name: true,
  slug: true,
  tagline: true,
  description: true,
  logo: true,
  brandColor: true,
});
const contactSchema = settingsSchema.pick({ whatsapp: true, instagram: true });
/* O endereço entra aqui: ele e o mapa que o usa dividem a mesma aba. */
const deliverySchema = settingsSchema.pick({
  street: true,
  district: true,
  city: true,
  state: true,
  postalCode: true,
  minOrder: true,
  freeAbove: true,
  deliveryRadiusKm: true,
  pickupEta: true,
});

/**
 * Os campos da cobrança por distância. Sem o ponto no mapa não há de onde medir,
 * então a cobrança volta para a lista de bairros em vez de gravar um preço por
 * km que nunca fecharia conta no checkout.
 */
function parseDistancePricing(
  formData: FormData,
  point: { latitude: number | null },
): Pick<Business['delivery'], 'pricing' | 'distance'> {
  const wantsDistance = String(formData.get('deliveryPricing') ?? '') === 'distance';
  return {
    pricing: wantsDistance && point.latitude !== null ? 'distance' : 'zones',
    distance: {
      baseFee: parseNumber(formData.get('distanceBaseFee')),
      baseKm: parseNumber(formData.get('distanceBaseKm')),
      perKmFee: parseNumber(formData.get('distancePerKmFee')),
    },
  };
}

/**
 * Salva uma aba de "Dados do negócio" sem tocar nas outras.
 *
 * O formulário mostra só uma seção por vez, então ele não tem como reenviar o
 * resto: a base é sempre o cadastro que está gravado, e só os campos daquela
 * aba são sobrescritos. Cada aba carrega as próprias regras — as que valem para
 * o pedido inteiro (ter um meio de entrega, por exemplo) ficam na aba onde o
 * lojista consegue resolvê-las.
 */
export async function updateBusinessSectionAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const businessId = String(formData.get('businessId') ?? '');
  const section = String(formData.get('section') ?? '') as BusinessSection;

  let business;
  try {
    ({ business } = await assertOwnership(businessId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Não foi possível salvar.' };
  }

  const current = toInput(business);
  let input: BusinessInput = current;
  let zones: ReturnType<typeof parseZonesForm> | null = null;

  switch (section) {
    case 'identidade': {
      const parsed = identitySchema.safeParse({
        name: String(formData.get('name') ?? ''),
        slug: String(formData.get('slug') ?? ''),
        tagline: String(formData.get('tagline') ?? ''),
        description: String(formData.get('description') ?? ''),
        logo: String(formData.get('logo') ?? '🍽️'),
        brandColor: String(formData.get('brandColor') ?? '#0b8639'),
      });
      if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
      if (!(await isSlugAvailable(parsed.data.slug, business.id))) {
        return { fieldErrors: { slug: 'Este endereço já está em uso. Escolha outro.' } };
      }
      input = { ...current, ...parsed.data, logo: parsed.data.logo || '🍽️' };
      break;
    }
    case 'contato': {
      const parsed = contactSchema.safeParse({
        whatsapp: String(formData.get('whatsapp') ?? ''),
        instagram: String(formData.get('instagram') ?? ''),
      });
      if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
      input = { ...current, ...parsed.data };
      break;
    }
    case 'horarios': {
      const hours = parseHoursForm(formData);
      if (!hours) {
        return {
          fieldErrors: { hours: 'Preencha abertura e fechamento do dia, ou deixe os dois em branco.' },
        };
      }
      input = { ...current, hours };
      break;
    }
    case 'entrega': {
      const point = parsePoint(formData);
      const parsed = deliverySchema.safeParse({
        street: String(formData.get('street') ?? ''),
        district: String(formData.get('district') ?? ''),
        city: String(formData.get('city') ?? ''),
        state: String(formData.get('state') ?? '').toUpperCase(),
        postalCode: String(formData.get('postalCode') ?? ''),
        minOrder: parseNumber(formData.get('minOrder')),
        freeAbove: parseNumber(formData.get('freeAbove')),
        deliveryRadiusKm: parseRadius(formData, point),
        pickupEta: String(formData.get('pickupEta') ?? ''),
      });
      if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

      const deliveryEnabled = formData.get('deliveryEnabled') === 'on';
      const pickupEnabled = formData.get('pickupEnabled') === 'on';
      if (!deliveryEnabled && !pickupEnabled) {
        return {
          fieldErrors: {
            orderModes: 'Ative entrega, retirada ou as duas — sem isso ninguém consegue pedir.',
          },
        };
      }
      input = {
        /*
         * Endereço e ponto do mapa são gravados no mesmo envio, porque estão
         * na mesma tela: não há como o pino ficar apontando para a rua antiga,
         * e por isso o endereço não precisa mais soltar as coordenadas ao
         * mudar — o que vem daqui é o que o lojista estava vendo.
         */
        ...current,
        address: {
          street: parsed.data.street,
          district: parsed.data.district,
          city: parsed.data.city,
          state: parsed.data.state,
          postalCode: parsed.data.postalCode,
          latitude: point.latitude,
          longitude: point.longitude,
        },
        delivery: {
          enabled: deliveryEnabled,
          minOrder: parsed.data.minOrder,
          freeAbove: parsed.data.freeAbove,
          radiusKm: parsed.data.deliveryRadiusKm,
          ...parseDistancePricing(formData, point),
        },
        pickup: { enabled: pickupEnabled, eta: parsed.data.pickupEta },
      };
      zones = parseZonesForm(formData);
      break;
    }
    default:
      return { error: 'Seção desconhecida.' };
  }

  try {
    await updateBusiness(business.id, input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { fieldErrors: { slug: 'Este endereço já está em uso. Escolha outro.' } };
    }
    throw error;
  }
  if (zones) await replaceZones(business.id, zones);

  revalidateStore(business.slug);
  // O endereço pode ter mudado: o antigo também sai do cache.
  if (input.slug !== business.slug) revalidateStore(input.slug);
  // Logo trocada: a antiga ficou sem dono.
  if (input.logo !== business.logo) cleanupOrphanImagesLater(business.id);

  return { success: 'Alterações salvas.' };
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get('businessId') ?? '');
  const publish = formData.get('publish') === 'true';
  const { business } = await assertOwnership(businessId);

  // O painel já desabilita o botão e explica o motivo; aqui é a garantia de que
  // um cardápio vazio ou sem WhatsApp não vai ao ar por outro caminho.
  if (publish && publishBlocker(business, await getMenu(business.id))) return;

  await setPublished(business.id, publish);

  // Publicar/despublicar troca 404 por 200 (e vice-versa) — o padrão da rota
  // derruba também a resposta "não encontrado" guardada em cache.
  revalidateStore(business.slug);
}
