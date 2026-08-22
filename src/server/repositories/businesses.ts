import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '../db/client';
import { ensureSchema } from '../db/migrate';
import { mapBusiness, mapZone } from './mappers';
import type { Business, DeliveryZone } from '@/lib/types';

/** Rotas da plataforma que não podem virar endereço de restaurante. */
export const RESERVED_SLUGS = new Set([
  'api', 'painel', 'entrar', 'sair', 'criar-conta', 'r', 'admin', 'sitemap',
  'sitemap.xml', 'robots.txt', 'manifest.webmanifest', 'recursos', 'precos',
  'contato', 'sobre', 'blog', 'ajuda', 'termos-de-uso', 'politica-de-privacidade',
  'opengraph-image', 'icon.svg', 'favicon.ico', 'demo', 'app', 'www',
]);

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

async function loadZones(businessId: string): Promise<DeliveryZone[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM delivery_zones WHERE business_id = ? ORDER BY position, rowid',
    args: [businessId],
  });
  return result.rows.map(mapZone);
}

export async function getBusinessById(id: string): Promise<Business | null> {
  await ensureSchema();
  const result = await db.execute({ sql: 'SELECT * FROM businesses WHERE id = ? LIMIT 1', args: [id] });
  const row = result.rows[0];
  return row ? mapBusiness(row, await loadZones(String(row.id))) : null;
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT * FROM businesses WHERE slug = ? LIMIT 1',
    args: [slug.toLowerCase()],
  });
  const row = result.rows[0];
  return row ? mapBusiness(row, await loadZones(String(row.id))) : null;
}

/** O negócio do usuário logado (a plataforma trabalha com um por conta). */
export async function getBusinessByOwner(ownerId: string): Promise<Business | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT * FROM businesses WHERE owner_id = ? ORDER BY created_at LIMIT 1',
    args: [ownerId],
  });
  const row = result.rows[0];
  return row ? mapBusiness(row, await loadZones(String(row.id))) : null;
}

export async function isSlugAvailable(slug: string, exceptBusinessId?: string): Promise<boolean> {
  await ensureSchema();
  if (RESERVED_SLUGS.has(slug)) return false;
  const result = await db.execute({
    sql: 'SELECT id FROM businesses WHERE slug = ? LIMIT 1',
    args: [slug],
  });
  const row = result.rows[0];
  return !row || String(row.id) === exceptBusinessId;
}

export interface BusinessInput {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logo: string;
  brandColor: string;
  whatsapp: string;
  email: string;
  instagram: string;
  address: Business['address'];
  hours: Business['hours'];
  acceptOrdersWhenClosed: boolean;
  delivery: { enabled: boolean; minOrder: number; freeAbove: number };
  pickup: { enabled: boolean; eta: string };
  payments: string[];
  pixKey: string;
}

function inputArgs(input: BusinessInput) {
  return [
    input.name,
    input.slug,
    input.tagline,
    input.description,
    input.logo,
    input.brandColor,
    input.whatsapp,
    input.email,
    input.instagram,
    input.address.street,
    input.address.district,
    input.address.city,
    input.address.state,
    input.address.postalCode,
    JSON.stringify(input.hours),
    input.acceptOrdersWhenClosed ? 1 : 0,
    input.delivery.enabled ? 1 : 0,
    input.delivery.minOrder,
    input.delivery.freeAbove,
    input.pickup.enabled ? 1 : 0,
    input.pickup.eta,
    JSON.stringify(input.payments),
    input.pixKey,
  ];
}

export async function createBusiness(ownerId: string, input: BusinessInput): Promise<Business> {
  await ensureSchema();
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO businesses (
            id, owner_id, name, slug, tagline, description, logo, brand_color, whatsapp, email,
            instagram, street, district, city, state, postal_code, hours, accept_orders_when_closed,
            delivery_enabled, min_order, free_above, pickup_enabled, pickup_eta, payments, pix_key
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, ownerId, ...inputArgs(input)],
  });
  const business = await getBusinessById(id);
  if (!business) throw new Error('Falha ao criar o negócio.');
  return business;
}

export async function updateBusiness(id: string, input: BusinessInput): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: `UPDATE businesses SET
            name = ?, slug = ?, tagline = ?, description = ?, logo = ?, brand_color = ?,
            whatsapp = ?, email = ?, instagram = ?, street = ?, district = ?, city = ?, state = ?,
            postal_code = ?, hours = ?, accept_orders_when_closed = ?, delivery_enabled = ?,
            min_order = ?, free_above = ?, pickup_enabled = ?, pickup_eta = ?, payments = ?,
            pix_key = ?, updated_at = datetime('now')
          WHERE id = ?`,
    args: [...inputArgs(input), id],
  });
}

export async function setPublished(id: string, published: boolean): Promise<void> {
  await ensureSchema();
  await db.execute({
    sql: "UPDATE businesses SET published = ?, updated_at = datetime('now') WHERE id = ?",
    args: [published ? 1 : 0, id],
  });
}

/** Substitui a lista de bairros atendidos, preservando a ordem enviada. */
export async function replaceZones(
  businessId: string,
  zones: { name: string; fee: number; eta: string }[],
): Promise<void> {
  await ensureSchema();
  const statements = [
    { sql: 'DELETE FROM delivery_zones WHERE business_id = ?', args: [businessId] },
    ...zones.map((zone, index) => ({
      sql: 'INSERT INTO delivery_zones (id, business_id, name, fee, eta, position) VALUES (?, ?, ?, ?, ?, ?)',
      args: [randomUUID(), businessId, zone.name, zone.fee, zone.eta, index],
    })),
  ];
  await db.batch(statements, 'write');
}

/** Usado pelo sitemap e pela vitrine de restaurantes. */
export async function listPublishedBusinesses(): Promise<Business[]> {
  await ensureSchema();
  const result = await db.execute(
    'SELECT * FROM businesses WHERE published = 1 ORDER BY updated_at DESC',
  );
  return Promise.all(result.rows.map(async (row) => mapBusiness(row, await loadZones(String(row.id)))));
}
