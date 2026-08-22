'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { assertOwnership, requireUser } from '../auth/guards';
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
import { onlyDigits } from '@/lib/format';
import type { WeeklyHours } from '@/lib/types';

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

const whatsappSchema = z
  .string()
  .transform(onlyDigits)
  .refine((value) => value.length >= 12 && value.length <= 15, {
    message: 'Informe o WhatsApp com código do país e DDD. Ex.: 5511987654321',
  });

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
    email: '',
    instagram: '',
    address: { street: '', district: '', city: parsed.data.city, state: '', postalCode: '' },
    hours: defaultHours(),
    acceptOrdersWhenClosed: false,
    delivery: { enabled: true, minOrder: 0, freeAbove: 0 },
    pickup: { enabled: true, eta: '20-30 min' },
    payments: ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito'],
    pixKey: '',
  };

  await createBusiness(user.id, input);
  revalidatePath('/painel');
  redirect('/painel/cardapio');
}

const settingsSchema = onboardingSchema.omit({ city: true }).extend({
  tagline: z.string().trim().max(120).default(''),
  description: z.string().trim().max(1200).default(''),
  logo: z.string().trim().max(300).default('🍽️'),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Escolha uma cor no formato #rrggbb.')
    .default('#c2410c'),
  email: z.union([z.literal(''), z.string().email('Informe um e-mail válido.')]).default(''),
  instagram: z.string().trim().max(120).default(''),
  street: z.string().trim().max(160).default(''),
  district: z.string().trim().max(80).default(''),
  city: z.string().trim().max(80).default(''),
  state: z.string().trim().max(2).default(''),
  postalCode: z.string().trim().max(12).default(''),
  minOrder: z.number().min(0).max(10000),
  freeAbove: z.number().min(0).max(10000),
  pickupEta: z.string().trim().max(40).default(''),
  pixKey: z.string().trim().max(160).default(''),
});

function parseNumber(value: FormDataEntryValue | null): number {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseHoursForm(formData: FormData): WeeklyHours {
  const hours: WeeklyHours = {};
  for (let day = 0; day < 7; day += 1) {
    const open = String(formData.get(`hours-${day}-open`) ?? '').trim();
    const close = String(formData.get(`hours-${day}-close`) ?? '').trim();
    hours[day] = open && close ? [{ open, close }] : [];
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
    email: String(formData.get('email') ?? ''),
    instagram: String(formData.get('instagram') ?? ''),
    street: String(formData.get('street') ?? ''),
    district: String(formData.get('district') ?? ''),
    city: String(formData.get('city') ?? ''),
    state: String(formData.get('state') ?? '').toUpperCase(),
    postalCode: String(formData.get('postalCode') ?? ''),
    minOrder: parseNumber(formData.get('minOrder')),
    freeAbove: parseNumber(formData.get('freeAbove')),
    pickupEta: String(formData.get('pickupEta') ?? ''),
    pixKey: String(formData.get('pixKey') ?? ''),
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };

  if (!(await isSlugAvailable(parsed.data.slug, business.id))) {
    return { fieldErrors: { slug: 'Este endereço já está em uso. Escolha outro.' } };
  }

  const payments = formData
    .getAll('payments')
    .map(String)
    .map((payment) => payment.trim())
    .filter(Boolean);

  const input: BusinessInput = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    tagline: parsed.data.tagline,
    description: parsed.data.description,
    logo: parsed.data.logo || '🍽️',
    brandColor: parsed.data.brandColor,
    whatsapp: parsed.data.whatsapp,
    email: parsed.data.email,
    instagram: parsed.data.instagram,
    address: {
      street: parsed.data.street,
      district: parsed.data.district,
      city: parsed.data.city,
      state: parsed.data.state,
      postalCode: parsed.data.postalCode,
    },
    hours: parseHoursForm(formData),
    acceptOrdersWhenClosed: formData.get('acceptOrdersWhenClosed') === 'on',
    delivery: {
      enabled: formData.get('deliveryEnabled') === 'on',
      minOrder: parsed.data.minOrder,
      freeAbove: parsed.data.freeAbove,
    },
    pickup: {
      enabled: formData.get('pickupEnabled') === 'on',
      eta: parsed.data.pickupEta,
    },
    payments,
    pixKey: parsed.data.pixKey,
  };

  await updateBusiness(business.id, input);
  await replaceZones(business.id, parseZonesForm(formData));

  revalidatePath('/painel', 'layout');
  revalidatePath(`/r/${business.slug}`, 'layout');
  if (parsed.data.slug !== business.slug) {
    // O endereço mudou: o slug novo pode ter um 404 em cache de antes.
    revalidatePath('/r/[slug]', 'layout');
  }
  revalidatePath('/sitemap.xml');

  return { success: 'Alterações salvas. O cardápio publicado já está atualizado.' };
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  const businessId = String(formData.get('businessId') ?? '');
  const publish = formData.get('publish') === 'true';
  const { business } = await assertOwnership(businessId);

  await setPublished(business.id, publish);

  revalidatePath('/painel', 'layout');
  // Publicar/despublicar troca 404 por 200 (e vice-versa). Invalidar pelo padrão
  // da rota derruba também a resposta "não encontrado" guardada em cache.
  revalidatePath('/r/[slug]', 'layout');
  revalidatePath(`/r/${business.slug}`, 'layout');
  revalidatePath('/sitemap.xml');
}
