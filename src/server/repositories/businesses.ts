import 'server-only';
import { randomUUID } from 'node:crypto';
import { db } from '../db/client';
import { ensureSchema } from '../db/migrate';
import { billingMode } from '../billing/config';
import { businessCascadeStatements } from './cascade';
import { mapBusiness, mapZone } from './mappers';
import { getBillingRowsByOwners } from './subscriptions';
import { summarizeBilling, todaySP } from '@/lib/billing';
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

/**
 * O negócio com a capa: a capa mora em `business_covers` (uma linha, só quando
 * existe) e chega como a coluna `cover` que `mapBusiness` lê.
 */
const SELECT_BUSINESS = `SELECT businesses.*, business_covers.image AS cover
  FROM businesses LEFT JOIN business_covers ON business_covers.business_id = businesses.id`;

async function loadZones(businessId: string): Promise<DeliveryZone[]> {
  const result = await db.execute({
    sql: 'SELECT * FROM delivery_zones WHERE business_id = ? ORDER BY position, rowid',
    args: [businessId],
  });
  return result.rows.map(mapZone);
}

export async function getBusinessById(id: string): Promise<Business | null> {
  await ensureSchema();
  const result = await db.execute({ sql: `${SELECT_BUSINESS} WHERE businesses.id = ? LIMIT 1`, args: [id] });
  const row = result.rows[0];
  return row ? mapBusiness(row, await loadZones(String(row.id))) : null;
}

export async function getBusinessBySlug(slug: string): Promise<Business | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: `${SELECT_BUSINESS} WHERE businesses.slug = ? LIMIT 1`,
    args: [slug.toLowerCase()],
  });
  const row = result.rows[0];
  return row ? mapBusiness(row, await loadZones(String(row.id))) : null;
}

/** O negócio do usuário logado (a plataforma trabalha com um por conta). */
export async function getBusinessByOwner(ownerId: string): Promise<Business | null> {
  await ensureSchema();
  const result = await db.execute({
    sql: `${SELECT_BUSINESS} WHERE businesses.owner_id = ? ORDER BY businesses.created_at LIMIT 1`,
    args: [ownerId],
  });
  const row = result.rows[0];
  return row ? mapBusiness(row, await loadZones(String(row.id))) : null;
}

/** Ids e endereços dos negócios de uma conta — o que a exclusão precisa saber antes de apagar. */
export async function listOwnedBusinesses(ownerId: string): Promise<{ id: string; slug: string }[]> {
  await ensureSchema();
  const result = await db.execute({
    sql: 'SELECT id, slug FROM businesses WHERE owner_id = ? ORDER BY created_at',
    args: [ownerId],
  });
  return result.rows.map((row) => ({ id: String(row.id), slug: String(row.slug) }));
}

/**
 * Apaga o negócio com cardápio, bairros e fotos, numa transação. O dono é
 * conferido aqui porque o id pode vir de fora (seed, scripts).
 */
export async function deleteBusiness(id: string, ownerId: string): Promise<void> {
  await ensureSchema();
  const owned = await db.execute({
    sql: 'SELECT id FROM businesses WHERE id = ? AND owner_id = ? LIMIT 1',
    args: [id, ownerId],
  });
  if (owned.rows.length === 0) return;
  await db.batch(businessCascadeStatements(id), 'write');
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
  /** Caminho `/img/<id>` da capa, ou vazio para a loja usar o papel de parede. */
  cover: string;
  brandColor: string;
  whatsapp: string;
  instagram: string;
  address: Business['address'];
  hours: Business['hours'];
  delivery: {
    enabled: boolean;
    minOrder: number;
    freeAbove: number;
    radiusKm: number;
    pricing: Business['delivery']['pricing'];
    distance: Business['delivery']['distance'];
  };
  pickup: { enabled: boolean; eta: string };
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
    input.instagram,
    input.address.street,
    input.address.district,
    input.address.city,
    input.address.state,
    input.address.postalCode,
    input.address.latitude,
    input.address.longitude,
    JSON.stringify(input.hours),
    input.delivery.enabled ? 1 : 0,
    input.delivery.minOrder,
    input.delivery.freeAbove,
    input.delivery.radiusKm,
    input.delivery.pricing,
    input.delivery.distance.baseFee,
    input.delivery.distance.baseKm,
    input.delivery.distance.perKmFee,
    input.pickup.enabled ? 1 : 0,
    input.pickup.eta,
  ];
}

export async function createBusiness(ownerId: string, input: BusinessInput): Promise<Business> {
  await ensureSchema();
  const id = randomUUID();
  await db.execute({
    sql: `INSERT INTO businesses (
            id, owner_id, name, slug, tagline, description, logo, brand_color, whatsapp,
            instagram, street, district, city, state, postal_code, latitude, longitude, hours,
            delivery_enabled, min_order, free_above, delivery_radius_km,
            delivery_pricing, delivery_base_fee, delivery_base_km, delivery_per_km_fee,
            pickup_enabled, pickup_eta
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, ownerId, ...inputArgs(input)],
  });
  if (input.cover) await db.execute(coverStatement(id, input.cover));
  const business = await getBusinessById(id);
  if (!business) throw new Error('Falha ao criar o negócio.');
  return business;
}

/** Grava ou tira a capa do negócio — a linha só existe quando há capa. */
function coverStatement(businessId: string, cover: string) {
  return cover
    ? {
        sql: `INSERT INTO business_covers (business_id, image, updated_at) VALUES (?, ?, datetime('now'))
              ON CONFLICT(business_id) DO UPDATE SET image = excluded.image, updated_at = excluded.updated_at`,
        args: [businessId, cover],
      }
    : { sql: 'DELETE FROM business_covers WHERE business_id = ?', args: [businessId] };
}

export async function updateBusiness(id: string, input: BusinessInput): Promise<void> {
  await ensureSchema();
  // Uma transação: o cadastro e a capa mudam juntos ou nenhum dos dois.
  await db.batch([
    {
    sql: `UPDATE businesses SET
            name = ?, slug = ?, tagline = ?, description = ?, logo = ?, brand_color = ?,
            whatsapp = ?, instagram = ?, street = ?, district = ?, city = ?, state = ?,
            postal_code = ?, latitude = ?, longitude = ?, hours = ?,
            delivery_enabled = ?, min_order = ?, free_above = ?, delivery_radius_km = ?,
            delivery_pricing = ?, delivery_base_fee = ?, delivery_base_km = ?,
            delivery_per_km_fee = ?, pickup_enabled = ?, pickup_eta = ?,
            updated_at = datetime('now')
          WHERE id = ?`,
    args: [...inputArgs(input), id],
    },
    coverStatement(id, input.cover),
  ], 'write');
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
  // Bairro que continua na lista mantém o id: é ele que o navegador do cliente
  // lembra entre um pedido e outro.
  const spare = await loadZones(businessId);
  const statements = [
    { sql: 'DELETE FROM delivery_zones WHERE business_id = ?', args: [businessId] },
    ...zones.map((zone, index) => {
      const keptIndex = spare.findIndex((entry) => entry.name === zone.name);
      const kept = keptIndex >= 0 ? spare.splice(keptIndex, 1)[0] : undefined;
      return {
        sql: 'INSERT INTO delivery_zones (id, business_id, name, fee, eta, position) VALUES (?, ?, ?, ?, ?, ?)',
        args: [kept?.id ?? randomUUID(), businessId, zone.name, zone.fee, zone.eta, index],
      };
    }),
  ];
  await db.batch(statements, 'write');
}

/**
 * Usado pelo sitemap e pela pré-renderização: só os cardápios que estão NO AR
 * — publicados pelo lojista e com a assinatura em dia (ou na carência). A
 * regra é a mesma da loja (`summarizeBilling`), aplicada em JS para não existir
 * uma segunda versão dela em SQL.
 */
export async function listPublishedBusinesses(): Promise<Business[]> {
  await ensureSchema();
  const result = await db.execute(
    `${SELECT_BUSINESS} WHERE businesses.published = 1 ORDER BY businesses.updated_at DESC`,
  );
  let rows = result.rows;
  if (billingMode() === 'asaas') {
    const billing = await getBillingRowsByOwners([...new Set(rows.map((row) => String(row.owner_id)))]);
    const today = todaySP();
    rows = rows.filter((row) => {
      const owner = billing.get(String(row.owner_id));
      return owner ? summarizeBilling(owner.rows, today, owner.exempt).allowed : false;
    });
  }
  return Promise.all(rows.map(async (row) => mapBusiness(row, await loadZones(String(row.id)))));
}
