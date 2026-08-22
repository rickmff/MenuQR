import type {
  Business,
  BusinessWithMenu,
  MenuCategory,
  MenuChoice,
  MenuItem,
  MenuOptionGroup,
  OpeningRange,
  WeeklyHours,
} from './types';

/**
 * Cardápio dentro do próprio link.
 *
 * Sem banco de dados, o servidor não tem onde guardar o cardápio de cada
 * lojista — então quem carrega o cardápio é o link: ele leva o restaurante
 * inteiro comprimido no endereço. Quem abre em outro aparelho recebe o
 * cardápio junto com a página, sem servidor nenhum no meio.
 *
 * O preço disso: o link fica longo, e um cardápio editado depois do
 * compartilhamento exige um link novo (o antigo continua mostrando a versão
 * que estava no ar quando foi compartilhado).
 */

/**
 * O cardápio vai no fragmento do endereço (depois do `#`), não na query.
 * O fragmento nunca é enviado ao servidor: a página continua sendo estática,
 * o pacote não aparece em log nenhum e não esbarra no limite de tamanho que
 * proxies e CDNs impõem à linha de requisição.
 */
export const SHARE_KEY = 'c';

/**
 * Um QR code em modo binário guarda no máximo 2953 bytes. Passando disso o
 * link continua funcionando, mas não cabe mais num QR.
 */
export const QR_CAPACITY = 2900;

/* ------------------------------------------------------------ compactação */

/** Tira o que dá para reconstruir na abertura: ids, posições e campos vazios. */
function slim<T extends object>(value: T, drop: readonly string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (drop.includes(key)) continue;
    if (entry === '' || entry === null || entry === undefined) continue;
    if (Array.isArray(entry) && entry.length === 0) continue;
    result[key] = entry;
  }
  return result;
}

function pack(business: Business, menu: MenuCategory[]): unknown {
  return {
    business: slim(business, ['id', 'createdAt', 'updatedAt']),
    menu: menu.map((category) => ({
      ...slim(category, ['id', 'position', 'items']),
      items: category.items.map((item) => ({
        ...slim(item, ['id', 'categoryId', 'position', 'options', 'available']),
        // `available` só entra quando é falso: o normal é o item estar à venda.
        ...(item.available ? {} : { available: false }),
        options: item.options.map((group) => ({
          ...slim(group, ['id', 'choices']),
          choices: group.choices.map((choice) => slim(choice, ['id'])),
        })),
      })),
    })),
  };
}

/* --------------------------------------------------------- reconstrução */

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const number = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;
const flag = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

function unpackHours(value: unknown): WeeklyHours {
  const source = record(value);
  const hours: WeeklyHours = {};
  for (let day = 0; day <= 6; day += 1) {
    hours[day] = list(source[String(day)]).map((range): OpeningRange => {
      const entry = record(range);
      return { open: text(entry.open), close: text(entry.close) };
    });
  }
  return hours;
}

function unpackChoice(value: unknown, id: string): MenuChoice {
  const entry = record(value);
  return { id, name: text(entry.name), price: number(entry.price) };
}

function unpackGroup(value: unknown, id: string): MenuOptionGroup {
  const entry = record(value);
  return {
    id,
    name: text(entry.name),
    type: entry.type === 'multi' ? 'multi' : 'single',
    required: flag(entry.required, false),
    max: typeof entry.max === 'number' ? entry.max : null,
    choices: list(entry.choices).map((choice, index) => unpackChoice(choice, `${id}-o${index}`)),
  };
}

function unpackItem(value: unknown, categoryId: string, position: number): MenuItem {
  const entry = record(value);
  // Os ids saem do endereço do item: a sacola continua reconhecendo a mesma
  // linha depois de recarregar a página.
  const id = `${categoryId}-i${position}`;
  return {
    id,
    categoryId,
    slug: text(entry.slug, id),
    name: text(entry.name),
    description: text(entry.description),
    price: number(entry.price),
    image: text(entry.image),
    imageAlt: text(entry.imageAlt),
    tags: list(entry.tags).map((tag) => text(tag)),
    allergens: list(entry.allergens).map((allergen) => text(allergen)),
    serves: text(entry.serves),
    calories: typeof entry.calories === 'number' ? entry.calories : null,
    available: flag(entry.available, true),
    position,
    options: list(entry.options).map((group, index) => unpackGroup(group, `${id}-g${index}`)),
  };
}

function unpackCategory(value: unknown, position: number): MenuCategory {
  const entry = record(value);
  const id = `c${position}`;
  return {
    id,
    slug: text(entry.slug, id),
    name: text(entry.name),
    icon: text(entry.icon),
    description: text(entry.description),
    position,
    items: list(entry.items).map((item, index) => unpackItem(item, id, index)),
  };
}

function unpackBusiness(value: unknown): Business {
  const entry = record(value);
  const address = record(entry.address);
  const delivery = record(entry.delivery);
  const pickup = record(entry.pickup);
  const slug = text(entry.slug);
  const now = new Date(0).toISOString();

  return {
    id: `link-${slug}`,
    slug,
    name: text(entry.name),
    tagline: text(entry.tagline),
    description: text(entry.description),
    logo: text(entry.logo),
    brandColor: text(entry.brandColor, '#d3410a'),
    whatsapp: text(entry.whatsapp),
    email: text(entry.email),
    instagram: text(entry.instagram),
    address: {
      street: text(address.street),
      district: text(address.district),
      city: text(address.city),
      state: text(address.state),
      postalCode: text(address.postalCode),
    },
    hours: unpackHours(entry.hours),
    acceptOrdersWhenClosed: flag(entry.acceptOrdersWhenClosed, false),
    delivery: {
      enabled: flag(delivery.enabled, true),
      minOrder: number(delivery.minOrder),
      freeAbove: number(delivery.freeAbove),
      zones: list(delivery.zones).map((zone, index) => {
        const entryZone = record(zone);
        return {
          id: text(entryZone.id, `z${index}`),
          name: text(entryZone.name),
          fee: number(entryZone.fee),
          eta: text(entryZone.eta),
        };
      }),
    },
    pickup: { enabled: flag(pickup.enabled, false), eta: text(pickup.eta) },
    payments: list(entry.payments).map((payment) => text(payment)),
    pixKey: text(entry.pixKey),
    published: true,
    createdAt: now,
    updatedAt: now,
  };
}

/* ------------------------------------------------- compressão e endereço */

const bytesToBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const base64UrlToBytes = (value: string): Uint8Array => {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

/** Streams de compressão existem no navegador e no Node — mesmo código nos dois. */
async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const source = new Blob([data as BlobPart]).stream();
  const response = new Response(source.pipeThrough(stream as unknown as ReadableWritablePair));
  return new Uint8Array(await response.arrayBuffer());
}

/** Cardápio inteiro em um texto curto o suficiente para caber num link. */
export async function encodeStore(business: Business, menu: MenuCategory[]): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(pack(business, menu)));
  return bytesToBase64Url(await pipe(json, new CompressionStream('deflate-raw')));
}

/** Lê o cardápio que veio no link. Devolve null se o texto não fizer sentido. */
export async function decodeStore(payload: string): Promise<BusinessWithMenu | null> {
  try {
    const json = await pipe(base64UrlToBytes(payload), new DecompressionStream('deflate-raw'));
    const parsed = record(JSON.parse(new TextDecoder().decode(json)));
    const business = unpackBusiness(parsed.business);
    if (!business.slug || !business.name) return null;
    return { business, menu: list(parsed.menu).map(unpackCategory) };
  } catch {
    return null;
  }
}

/** Endereço público do cardápio, com o cardápio dentro. */
export async function buildShareUrl(
  origin: string,
  business: Business,
  menu: MenuCategory[],
): Promise<string> {
  const payload = await encodeStore(business, menu);
  return `${origin}/r/${business.slug}#${SHARE_KEY}=${payload}`;
}

/** Lê o pacote no fragmento do endereço atual. */
export function payloadFromHash(hash: string): string | null {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!value.startsWith(`${SHARE_KEY}=`)) return null;
  return value.slice(SHARE_KEY.length + 1) || null;
}
