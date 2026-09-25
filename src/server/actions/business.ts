'use server';

import { revalidatePath } from 'next/cache';
import { redirect, unstable_rethrow } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { assertOwnership, requireUser } from '../auth/guards';
import { requireSubscription } from '../billing/access';
import { isUniqueViolation } from '../db/client';
import { cleanupOrphanImagesLater } from '../image-cleanup';
import { revalidateStore } from '../revalidate';
import {
  createBusiness,
  getBusinessById,
  getBusinessByOwner,
  isSlugAvailable,
  replaceZones,
  setPublished,
  updateBusiness,
  type BusinessInput,
} from '../repositories/businesses';
import { getMenu } from '../repositories/menu';
import { clampRadius, isCoordinate, MAX_RADIUS_KM } from '@/lib/delivery-area';
import { isLocalPhoto, isValidImageRef, parsePriceInput } from '@/lib/format';
import { isValidWhatsapp, normalizeWhatsapp } from '@/lib/phone';
import { publishBlocker } from '@/lib/menu-utils';
import { slugify } from '@/lib/slug';
import { continueAfter, DEFAULT_LOGO, type SetupTarget } from '@/components/painel/setup-steps';
import { dayName } from '@/lib/hours';
import { HOURS_MESSAGE, hoursErrorKey, readHoursForm } from '@/lib/hours-form';
import { getUiText } from '@/lib/ui-text-server';
import type { BusinessSection } from '@/components/painel/business-sections';
import type { Business, WeeklyHours } from '@/lib/types';

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
  /**
   * Só nas abas do negócio: para onde ir depois deste salvar, calculado com o
   * que ficou gravado (`continueAfter` com `savedIsDone: false`). `null` é
   * ficar na tela. Ausente, o formulário usa a previsão que ele já tinha.
   */
  next?: SetupTarget | null;
}

function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    result[key] ??= issue.message;
  }
  return result;
}

/** Tradutor de `painel.actions` — as mensagens que voltam ao formulário. */
type ActionText = Awaited<ReturnType<typeof actionText>>;

function actionText() {
  return getTranslations('painel.actions');
}

function slugSchema(t: ActionText) {
  return z
    .string()
    .trim()
    .min(3, t('slugMin'))
    .max(40, t('slugMax'))
    .regex(/^[a-z0-9-]+$/, t('slugPattern'));
}

/**
 * O campo manda E.164 ("+5511987654321"), de qualquer país. A validação é a da
 * libphonenumber: comprimento certo para o país do número, não uma faixa fixa.
 */
function whatsappSchema(t: ActionText) {
  return z
    .string()
    .transform(normalizeWhatsapp)
    .refine(isValidWhatsapp, { message: t('whatsappInvalid') });
}

function onboardingSchema(t: ActionText) {
  return z.object({
    name: z.string().trim().min(2, t('businessName')).max(80, t('businessNameMax')),
    slug: slugSchema(t),
    whatsapp: whatsappSchema(t),
    city: z.string().trim().max(80, t('cityMax')).default(''),
  });
}

/**
 * O restaurante nasce sem horário gravado: os sete dias com a lista vazia.
 * Gravar 18h–23h aqui fazia o passo Horários nascer "concluído" e a loja abrir
 * e fechar por um horário que o lojista nunca viu. A sugestão de 18h–23h mora
 * no formulário da aba de horários e só vale quando ele salva.
 */
function emptyHours(): WeeklyHours {
  const hours: WeeklyHours = {};
  for (let day = 0; day < 7; day += 1) hours[day] = [];
  return hours;
}

export async function createBusinessAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  await requireSubscription(user);
  if (await getBusinessByOwner(user.id)) redirect('/painel');
  const t = await actionText();

  const name = String(formData.get('name') ?? '');
  // O mesmo formato do navegador (`lib/slug`): o campo pode chegar com o hífen
  // do fim que a digitação mantém, ou vazio — e vazio quer dizer "o do nome".
  const typedSlug = slugify(String(formData.get('slug') ?? ''));
  const raw = {
    name,
    slug: typedSlug || slugify(name),
    whatsapp: String(formData.get('whatsapp') ?? ''),
    city: String(formData.get('city') ?? ''),
  };

  const parsed = onboardingSchema(t).safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsOf(parsed.error);
    // Link derivado de um nome que já falhou: é a mesma omissão, e um erro só
    // (o do nome) diz o que fazer. O link digitado continua sendo conferido.
    if (fieldErrors.name && !typedSlug) delete fieldErrors.slug;
    return { fieldErrors };
  }

  if (!(await isSlugAvailable(parsed.data.slug))) {
    return { fieldErrors: { slug: t('slugTaken') } };
  }

  const input: BusinessInput = {
    name: parsed.data.name,
    slug: parsed.data.slug,
    tagline: '',
    description: '',
    logo: DEFAULT_LOGO,
    cover: '',
    // O verde do produto: o laranja antigo não aparecia em lugar nenhum.
    brandColor: '#0b8639',
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
    hours: emptyHours(),
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

  const slugTaken: FormState = { fieldErrors: { slug: t('slugTaken') } };
  try {
    await createBusiness(user.id, input);
  } catch (error) {
    if (isUniqueViolation(error)) return slugTaken;
    throw error;
  }
  revalidatePath('/painel');
  redirect('/painel/cardapio');
}

/**
 * Os limites das abas de "Dados do negócio", cada um com a mensagem dele em
 * português — sem isso o Zod responde "Too big: expected string to have <=120
 * characters" e o lojista não sabe o que corrigir. Os campos do formulário
 * levam o mesmo `maxLength`, então a mensagem só aparece para quem chega por
 * outro caminho (colar num campo sem limite, um formulário antigo aberto).
 */
function settingsSchema(t: ActionText) {
  // A mensagem diz quanto passou: `count` é o tamanho digitado, já sem os
  // espaços das pontas (o `.trim()` roda antes do `.max()`).
  const tooLong = (max: number) => ({
    error: (issue: { input?: unknown }) => t('tooLong', { max, count: String(issue.input ?? '').length }),
  });
  const text = (max: number) => z.string().trim().max(max, tooLong(max)).default('');
  return onboardingSchema(t).omit({ city: true }).extend({
    // O cadastro tem o mesmo limite; aqui ele ganha a mensagem própria.
    name: z.string().trim().min(2, t('businessName')).max(80, tooLong(80)),
    tagline: text(120),
    description: text(1200),
    // Logo e capa chegam do envio de foto, nunca digitadas: passar do limite é
    // referência quebrada, e a mensagem é a de enviar a imagem de novo.
    logo: z
      .string()
      .trim()
      .max(300, t('logoInvalid'))
      .refine(isValidImageRef, t('logoInvalid'))
      .default(DEFAULT_LOGO),
    // Só foto enviada pelo painel (ou a do restaurante de exemplo, que o dono
    // do exemplo reenvia ao salvar a aba): vazio deixa o papel de parede.
    cover: z
      .string()
      .trim()
      .max(300, t('coverInvalid'))
      .refine((value) => value === '' || isLocalPhoto(value), t('coverInvalid'))
      .default(''),
    brandColor: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, t('colorInvalid'))
      // O verde do produto. A cor só vai para o ícone do app instalado e a
      // imagem de compartilhamento; o laranja antigo não aparecia em lugar nenhum.
      .default('#0b8639'),
    instagram: text(120),
    street: text(160),
    district: text(80),
    city: text(80),
    state: text(2),
    postalCode: text(12),
    pickupEta: text(40),
  });
}

/**
 * Número digitado pelo lojista: dinheiro ("6,90", "R$ 1.234,50") ou km ("1,5").
 * Vazio vale 0 — nos campos da entrega, 0 desliga a regra. Texto que não é
 * número devolve `null`: antes ele virava 0 calado e a aba respondia
 * "Alterações salvas." com a taxa zerada.
 */
/**
 * O que um campo numérico da entrega aceita: dígitos com ponto e vírgula, com
 * "R$" na frente ou "km" atrás. `parsePriceInput` joga fora o resto, e sem
 * este filtro "-5" virava 5 e "6 reais" virava 6, gravados sem erro.
 */
const NUMBER_TEXT = /^(?:R\$\s*)?[\d.,\s]+(?:km)?$/i;

function parseNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  if (raw === '') return 0;
  if (!NUMBER_TEXT.test(raw)) return null;
  const parsed = parsePriceInput(raw);
  return parsed === null ? null : Math.round(parsed * 100) / 100;
}

/** O teto e as mensagens de um campo numérico da aba de entrega. */
interface NumberRule {
  max: number;
  invalid: string;
  tooBig: string;
}

/** Maior valor em reais que a entrega aceita — taxa, mínimo ou entrega grátis. */
const MAX_AMOUNT = 10000;

function amountRule(t: ActionText): NumberRule {
  return { max: MAX_AMOUNT, invalid: t('amountInvalid'), tooBig: t('amountMax') };
}

function kmRule(t: ActionText): NumberRule {
  return { max: MAX_RADIUS_KM, invalid: t('kmInvalid'), tooBig: t('kmMax', { max: MAX_RADIUS_KM }) };
}

/**
 * Lê um campo numérico. `visible` diz se o lojista está vendo o campo: um
 * campo escondido (entrega desligada, a outra forma de cobrar) não tem onde
 * mostrar o erro, e recusar a aba por ele seria um beco — ali o que não é
 * número fica com o valor que já estava gravado.
 */
function readNumber(
  value: FormDataEntryValue | null,
  rule: NumberRule,
  visible: boolean,
  previous: number,
): { value: number; error?: string } {
  const parsed = parseNumber(value);
  if (parsed !== null && parsed <= rule.max) return { value: parsed };
  if (!visible) return { value: previous };
  return { value: previous, error: parsed === null ? rule.invalid : rule.tooBig };
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

/** Sem ponto marcado não existe área: o raio vai junto. O controle só manda valores válidos. */
function parseRadius(formData: FormData, point: { latitude: number | null }): number {
  if (point.latitude === null) return 0;
  return clampRadius(parseNumber(formData.get('deliveryRadiusKm')) ?? 0);
}

/** O que cabe numa linha do checkout. Os campos do painel têm o mesmo `maxLength`. */
const ZONE_NAME_MAX = 60;
const ZONE_ETA_MAX = 40;

/**
 * O prazo do bairro. O campo mostra "min" do lado de dentro, então o lojista
 * digita só "30-45"; o cliente lê "30-45 min". Texto que não é só número
 * ("1 hora") vai como veio.
 */
function zoneEta(value: string): string {
  const eta = value.trim().slice(0, ZONE_ETA_MAX);
  return /^\d+(\s*(-|–|a|to)\s*\d+)?$/.test(eta) ? `${eta} min` : eta;
}

/**
 * A lista de bairros. O erro da taxa aponta a linha pela posição no envio
 * (`zone-fee-2`), que é a mesma da lista na tela. Linha sem nome é linha em
 * branco e não entra.
 */
function parseZonesForm(
  formData: FormData,
  rule: NumberRule,
  visible: boolean,
  previous: { name: string; fee: number }[],
) {
  const names = formData.getAll('zone-name').map(String);
  const fees = formData.getAll('zone-fee');
  const etas = formData.getAll('zone-eta').map(String);

  const errors: Record<string, string> = {};
  const zones: { name: string; fee: number; eta: string }[] = [];
  names.forEach((raw, index) => {
    const name = raw.trim().slice(0, ZONE_NAME_MAX);
    if (!name) return;
    const kept = previous.find((zone) => zone.name === name)?.fee ?? 0;
    const fee = readNumber(fees[index] ?? null, rule, visible, kept);
    if (fee.error) errors[`zone-fee-${index}`] = fee.error;
    zones.push({ name, fee: fee.value, eta: zoneEta(etas[index] ?? '') });
  });
  return { zones: zones.slice(0, 40), errors };
}

/** O cadastro atual no formato que `updateBusiness` espera (sem bairros, que têm tabela própria). */
function toInput(business: Business): BusinessInput {
  return {
    name: business.name,
    slug: business.slug,
    tagline: business.tagline,
    description: business.description,
    logo: business.logo,
    cover: business.cover ?? '',
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

function identitySchema(t: ActionText) {
  return settingsSchema(t).pick({
    name: true,
    slug: true,
    tagline: true,
    description: true,
    logo: true,
    cover: true,
    brandColor: true,
  });
}
function contactSchema(t: ActionText) {
  return settingsSchema(t).pick({ whatsapp: true, instagram: true });
}
/* O endereço entra aqui: ele e o mapa que o usa dividem a mesma aba. Os
   números da entrega são lidos à parte (`readNumber`), com o erro na linha. */
function deliverySchema(t: ActionText) {
  return settingsSchema(t).pick({
    street: true,
    district: true,
    city: true,
    state: true,
    postalCode: true,
    pickupEta: true,
  });
}

/**
 * Os campos da cobrança por distância. Sem o ponto no mapa não há de onde
 * medir: com a entrega ligada a aba não salva (`deliveryPricing`, no chamador)
 * — antes ela gravava "por bairro" calada, e os bairros antigos voltavam ao
 * checkout. Com a entrega desligada a escolha é guardada como está, para
 * voltar igual; enquanto faltar o ponto, `chargesByDistance` não a aplica.
 */
function parseDistancePricing(
  formData: FormData,
  t: ActionText,
  visible: boolean,
  previous: Business['delivery']['distance'],
): Pick<Business['delivery'], 'pricing' | 'distance'> & { errors: Record<string, string> } {
  const wantsDistance = String(formData.get('deliveryPricing') ?? '') === 'distance';
  const money = amountRule(t);
  const baseFee = readNumber(formData.get('distanceBaseFee'), money, visible, previous.baseFee);
  const baseKm = readNumber(formData.get('distanceBaseKm'), kmRule(t), visible, previous.baseKm);
  const perKmFee = readNumber(formData.get('distancePerKmFee'), money, visible, previous.perKmFee);
  const errors: Record<string, string> = {};
  if (baseFee.error) errors.distanceBaseFee = baseFee.error;
  if (baseKm.error) errors.distanceBaseKm = baseKm.error;
  if (perKmFee.error) errors.distancePerKmFee = perKmFee.error;
  return {
    pricing: wantsDistance ? 'distance' : 'zones',
    distance: { baseFee: baseFee.value, baseKm: baseKm.value, perKmFee: perKmFee.value },
    errors,
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
  const t = await actionText();

  let business;
  try {
    ({ business } = await assertOwnership(businessId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : t('saveFailed') };
  }

  const current = toInput(business);
  let input: BusinessInput = current;
  let zones: { name: string; fee: number; eta: string }[] | null = null;

  switch (section) {
    case 'identidade': {
      const parsed = identitySchema(t).safeParse({
        name: String(formData.get('name') ?? ''),
        // O campo formata enquanto o lojista digita, mas pode chegar com o
        // hífen do fim (enviar com Enter não passa pelo "sair do campo").
        slug: slugify(String(formData.get('slug') ?? '')),
        tagline: String(formData.get('tagline') ?? ''),
        description: String(formData.get('description') ?? ''),
        // Vazio é "sem logo": o quadro mostra o padrão como vazio (ver o formulário).
        logo: String(formData.get('logo') ?? ''),
        cover: String(formData.get('cover') ?? ''),
        brandColor: String(formData.get('brandColor') ?? '#0b8639'),
      });
      if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
      if (!(await isSlugAvailable(parsed.data.slug, business.id))) {
        return { fieldErrors: { slug: t('slugTaken') } };
      }
      input = { ...current, ...parsed.data, logo: parsed.data.logo || DEFAULT_LOGO };
      break;
    }
    case 'contato': {
      const parsed = contactSchema(t).safeParse({
        whatsapp: String(formData.get('whatsapp') ?? ''),
        instagram: String(formData.get('instagram') ?? ''),
      });
      if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error) };
      input = { ...current, ...parsed.data };
      break;
    }
    case 'horarios': {
      /*
       * O erro é do dia (`hours-2`) e diz qual é: ele aparece na linha daquele
       * dia, e a tela rola até o campo que falta. Antes era uma frase só,
       * depois dos sete dias, sem dizer onde.
       */
      const { hours, problems } = readHoursForm(formData);
      const days = Object.entries(problems);
      if (days.length > 0) {
        const uiText = await getUiText();
        const fieldErrors: Record<string, string> = {};
        for (const [day, problem] of days) {
          if (!problem) continue;
          const values = { day: dayName(Number(day), uiText) };
          fieldErrors[hoursErrorKey(Number(day))] = t(HOURS_MESSAGE[problem], values);
        }
        return { fieldErrors };
      }
      input = { ...current, hours };
      break;
    }
    case 'entrega': {
      const point = parsePoint(formData);
      const deliveryEnabled = formData.get('deliveryEnabled') === 'on';
      const pickupEnabled = formData.get('pickupEnabled') === 'on';
      const wantsDistance = String(formData.get('deliveryPricing') ?? '') === 'distance';
      const stored = business.delivery;

      const parsed = deliverySchema(t).safeParse({
        street: String(formData.get('street') ?? ''),
        district: String(formData.get('district') ?? ''),
        city: String(formData.get('city') ?? ''),
        state: String(formData.get('state') ?? '').toUpperCase(),
        postalCode: String(formData.get('postalCode') ?? ''),
        pickupEta: String(formData.get('pickupEta') ?? ''),
      });
      /*
       * Todos os erros da aba voltam juntos — campo por campo, a mesma aba
       * recusava três vezes seguidas. Os números só contam como "visíveis"
       * quando o bloco deles está aberto na tela (ver `readNumber`).
       */
      const fieldErrors: Record<string, string> = parsed.success ? {} : fieldErrorsOf(parsed.error);
      const money = amountRule(t);
      const minOrder = readNumber(formData.get('minOrder'), money, deliveryEnabled, stored.minOrder);
      const freeAbove = readNumber(formData.get('freeAbove'), money, deliveryEnabled, stored.freeAbove);
      if (minOrder.error) fieldErrors.minOrder = minOrder.error;
      if (freeAbove.error) fieldErrors.freeAbove = freeAbove.error;

      const pricing = parseDistancePricing(formData, t, deliveryEnabled && wantsDistance, stored.distance);
      Object.assign(fieldErrors, pricing.errors);
      const zoneList = parseZonesForm(formData, money, deliveryEnabled && !wantsDistance, stored.zones);
      Object.assign(fieldErrors, zoneList.errors);

      // Regras do pedido inteiro: sem nenhuma forma ligada ninguém fecha o
      // pedido, e "por distância" sem o ponto não tem de onde medir.
      if (!deliveryEnabled && !pickupEnabled) fieldErrors.orderModes = t('noOrderMode');
      if (deliveryEnabled && wantsDistance && point.latitude === null) {
        fieldErrors.deliveryPricing = t('needPoint');
      }
      if (!parsed.success || Object.keys(fieldErrors).length > 0) return { fieldErrors };

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
          minOrder: minOrder.value,
          freeAbove: freeAbove.value,
          radiusKm: parseRadius(formData, point),
          pricing: pricing.pricing,
          distance: pricing.distance,
        },
        pickup: { enabled: pickupEnabled, eta: parsed.data.pickupEta },
      };
      zones = zoneList.zones;
      break;
    }
    default:
      return { error: t('unknownSection') };
  }

  try {
    await updateBusiness(business.id, input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { fieldErrors: { slug: t('slugTaken') } };
    }
    throw error;
  }
  if (zones) await replaceZones(business.id, zones);

  revalidateStore(business.slug);
  // O endereço pode ter mudado: o antigo também sai do cache.
  if (input.slug !== business.slug) revalidateStore(input.slug);
  // Logo ou capa trocada: a antiga ficou sem dono.
  if (input.logo !== business.logo || input.cover !== (business.cover ?? '')) {
    cleanupOrphanImagesLater(business.id);
  }

  /*
   * O próximo passo sai do que ficou gravado, e não da previsão do botão: a
   * semana salva toda fechada continua pendente, e o lojista fica na aba em
   * vez de cair num Publicar bloqueado por "falta o horário".
   */
  const saved = (await getBusinessById(business.id)) ?? business;
  const next = continueAfter(saved, await getMenu(business.id), section, { savedIsDone: false });
  return { success: t('saved'), next };
}

/**
 * Resposta de publicar/despublicar. Sem texto: quem mostra o toast é o botão,
 * que sabe a direção e fala o idioma da tela — assim o painel com banco e o
 * modo demonstração (que não carrega as mensagens do painel nas ações) dão o
 * mesmo retorno. O erro é o motivo do bloqueio (`publishBlocker`) ou `session`.
 */
export type PublishResult =
  | { success: 'published' | 'unpublished' }
  | { error: NonNullable<ReturnType<typeof publishBlocker>> | 'session' };

export async function togglePublishAction(formData: FormData): Promise<PublishResult> {
  const businessId = String(formData.get('businessId') ?? '');
  const publish = formData.get('publish') === 'true';

  // Sessão vencida ou negócio de outro dono vira o toast de falha do botão,
  // como no modo demonstração — sem o catch, a promessa rejeitava e caía na
  // tela de erro. Os redirects do Next (assinatura) seguem adiante.
  let business;
  try {
    ({ business } = await assertOwnership(businessId));
  } catch (error) {
    unstable_rethrow(error);
    return { error: 'session' };
  }

  // O painel já desabilita o botão e explica o motivo; aqui é a garantia de que
  // um cardápio vazio ou sem WhatsApp não vai ao ar por outro caminho.
  if (publish) {
    const blocker = publishBlocker(business, await getMenu(business.id));
    if (blocker) return { error: blocker };
  }

  await setPublished(business.id, publish);

  // Publicar/despublicar troca o cardápio pelo aviso "fora do ar" (e vice-versa)
  // — o padrão da rota derruba também a resposta guardada em cache.
  revalidateStore(business.slug);
  return { success: publish ? 'published' : 'unpublished' };
}
