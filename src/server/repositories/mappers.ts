import 'server-only';
import type { Row } from '@libsql/client';
import type { BillingPayment, SubscriptionRecord } from '@/lib/billing';
import type {
  Business,
  MenuCategory,
  MenuItem,
  MenuOptionGroup,
  OptionType,
  User,
  WeeklyHours,
} from '@/lib/types';

const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const number = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (value: unknown): boolean => number(value) === 1;

/** Coordenada guardada no banco. NULL (ponto nunca marcado) vira `null` aqui. */
const coordinate = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function json<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Normaliza o JSON de horários vindo do banco em uma semana completa. */
export function parseHours(value: unknown): WeeklyHours {
  const raw = json<Record<string, { open?: unknown; close?: unknown }[]>>(value, {});
  const hours: WeeklyHours = {};
  for (let day = 0; day < 7; day += 1) {
    const ranges = Array.isArray(raw[String(day)]) ? raw[String(day)] : [];
    hours[day] = (ranges ?? [])
      .map((range) => ({ open: text(range?.open), close: text(range?.close) }))
      .filter((range) => range.open && range.close);
  }
  return hours;
}

export function mapUser(row: Row): User {
  return {
    id: text(row.id),
    name: text(row.name),
    email: text(row.email),
    billingExempt: bool(row.billing_exempt),
    createdAt: text(row.created_at),
  };
}

/** Texto que pode ser NULL no banco: vira `null`, nunca ''. */
const nullable = (value: unknown): string | null => (value == null || value === '' ? null : String(value));

export function mapSubscription(row: Row): SubscriptionRecord {
  const status = text(row.status, 'pending');
  return {
    id: text(row.id),
    userId: text(row.user_id),
    status: status === 'active' || status === 'cancelled' ? status : 'pending',
    paidUntil: nullable(row.paid_until),
    asaasCustomerId: text(row.asaas_customer_id),
    asaasSubscriptionId: nullable(row.asaas_subscription_id),
    cycle: text(row.cycle) === 'MONTHLY' ? 'MONTHLY' : 'YEARLY',
    amountCents: number(row.amount_cents),
    cancelledAt: nullable(row.cancelled_at),
    syncedAt: nullable(row.synced_at),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapPayment(row: Row): BillingPayment {
  return {
    id: text(row.id),
    subscriptionId: text(row.subscription_id),
    status: text(row.status),
    valueCents: number(row.value_cents),
    dueDate: text(row.due_date),
    paidAt: nullable(row.paid_at),
    invoiceUrl: nullable(row.invoice_url),
    qrPayload: nullable(row.qr_payload),
    qrExpiresAt: nullable(row.qr_expires_at),
    createdAt: text(row.created_at),
  };
}

export function mapBusiness(row: Row, zones: Business['delivery']['zones'] = []): Business {
  return {
    id: text(row.id),
    slug: text(row.slug),
    name: text(row.name),
    tagline: text(row.tagline),
    description: text(row.description),
    logo: text(row.logo, '🍽️'),
    brandColor: text(row.brand_color, '#c2410c'),
    whatsapp: text(row.whatsapp),
    instagram: text(row.instagram),
    address: {
      street: text(row.street),
      district: text(row.district),
      city: text(row.city),
      state: text(row.state),
      postalCode: text(row.postal_code),
      latitude: coordinate(row.latitude),
      longitude: coordinate(row.longitude),
    },
    hours: parseHours(row.hours),
    delivery: {
      enabled: bool(row.delivery_enabled),
      minOrder: number(row.min_order),
      freeAbove: number(row.free_above),
      radiusKm: number(row.delivery_radius_km),
      zones,
      pricing: text(row.delivery_pricing) === 'distance' ? 'distance' : 'zones',
      distance: {
        baseFee: number(row.delivery_base_fee),
        baseKm: number(row.delivery_base_km),
        perKmFee: number(row.delivery_per_km_fee),
      },
    },
    pickup: { enabled: bool(row.pickup_enabled), eta: text(row.pickup_eta) },
    published: bool(row.published),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

export function mapZone(row: Row) {
  return {
    id: text(row.id),
    name: text(row.name),
    fee: number(row.fee),
    eta: text(row.eta),
  };
}

export function mapCategory(row: Row, items: MenuItem[] = []): MenuCategory {
  return {
    id: text(row.id),
    slug: text(row.slug),
    name: text(row.name),
    description: text(row.description),
    position: number(row.position),
    items,
  };
}

export function mapItem(row: Row, options: MenuOptionGroup[] = []): MenuItem {
  const calories = row.calories == null ? null : number(row.calories);
  return {
    id: text(row.id),
    categoryId: text(row.category_id),
    slug: text(row.slug),
    name: text(row.name),
    description: text(row.description),
    price: number(row.price),
    image: text(row.image, '🍽️'),
    imageAlt: text(row.image_alt),
    tags: json<string[]>(row.tags, []),
    allergens: json<string[]>(row.allergens, []),
    serves: text(row.serves),
    calories: calories && calories > 0 ? calories : null,
    available: bool(row.available),
    position: number(row.position),
    options,
  };
}

/** A coluna é texto livre; qualquer valor desconhecido cai em escolha única. */
function optionType(value: unknown): OptionType {
  const type = text(value, 'single');
  return type === 'multi' || type === 'remove' ? type : 'single';
}

export function mapOptionGroup(row: Row, choices: MenuOptionGroup['choices'] = []): MenuOptionGroup {
  const max = row.max_choices == null ? null : number(row.max_choices);
  return {
    id: text(row.id),
    name: text(row.name),
    type: optionType(row.type),
    required: bool(row.required),
    max: max && max > 0 ? max : null,
    choices,
  };
}

export function mapChoice(row: Row) {
  return { id: text(row.id), name: text(row.name), price: number(row.price) };
}
