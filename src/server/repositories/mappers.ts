import 'server-only';
import type { Row } from '@libsql/client';
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
    email: text(row.email),
    instagram: text(row.instagram),
    address: {
      street: text(row.street),
      district: text(row.district),
      city: text(row.city),
      state: text(row.state),
      postalCode: text(row.postal_code),
    },
    hours: parseHours(row.hours),
    acceptOrdersWhenClosed: bool(row.accept_orders_when_closed),
    delivery: {
      enabled: bool(row.delivery_enabled),
      minOrder: number(row.min_order),
      freeAbove: number(row.free_above),
      zones,
    },
    pickup: { enabled: bool(row.pickup_enabled), eta: text(row.pickup_eta) },
    payments: json<string[]>(row.payments, []),
    pixKey: text(row.pix_key),
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
    icon: text(row.icon),
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

export function mapOptionGroup(row: Row, choices: MenuOptionGroup['choices'] = []): MenuOptionGroup {
  const max = row.max_choices == null ? null : number(row.max_choices);
  return {
    id: text(row.id),
    name: text(row.name),
    type: (text(row.type, 'single') === 'multi' ? 'multi' : 'single') as OptionType,
    required: bool(row.required),
    max: max && max > 0 ? max : null,
    choices,
  };
}

export function mapChoice(row: Row) {
  return { id: text(row.id), name: text(row.name), price: number(row.price) };
}
