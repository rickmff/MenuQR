/** Tipos do domínio: restaurante, cardápio e pedido. */

export type OptionType = 'single' | 'multi';

export interface MenuChoice {
  id: string;
  name: string;
  /** Acréscimo em reais. 0 quando não altera o preço. */
  price: number;
}

export interface MenuOptionGroup {
  id: string;
  name: string;
  type: OptionType;
  required?: boolean;
  /** Máximo de escolhas em grupos do tipo `multi`. */
  max?: number;
  choices: MenuChoice[];
}

export interface MenuItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Preço base em reais. */
  price: number;
  /** Emoji ou caminho de imagem em /public. */
  image: string;
  /** Texto alternativo da imagem (acessibilidade e SEO de imagens). */
  imageAlt?: string;
  tags?: string[];
  available: boolean;
  /** Usado no schema.org/MenuItem e nas informações nutricionais da página. */
  serves?: string;
  calories?: number;
  allergens?: string[];
  suitableForDiet?: ('VegetarianDiet' | 'VeganDiet' | 'GlutenFreeDiet' | 'LowLactoseDiet')[];
  options?: MenuOptionGroup[];
}

/** Versão enxuta do item, usada nas listagens do cardápio. */
export type MenuItemCard = Omit<MenuItem, 'options'> & { optionCount: number };

export interface MenuCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  items: MenuItem[];
}

export type MenuCategoryCard = Omit<MenuCategory, 'items'> & { items: MenuItemCard[] };

export interface OpeningRange {
  open: string;
  close: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  eta: string;
}

export interface Restaurant {
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  shortDescription: string;
  logo: string;
  founded: string;
  cuisine: string[];
  priceRange: string;
  /** Somente dígitos, com código do país. Ex.: 5511987654321 */
  whatsapp: string;
  phoneDisplay: string;
  email: string;
  address: {
    street: string;
    district: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    /** Coordenadas usadas no schema.org e no link do mapa. */
    latitude: number;
    longitude: number;
    mapsUrl: string;
  };
  social: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  /** 0 = domingo … 6 = sábado. Lista vazia significa fechado. */
  hours: Record<number, OpeningRange[]>;
  acceptOrdersWhenClosed: boolean;
  delivery: {
    enabled: boolean;
    minOrder: number;
    /** Frete grátis a partir deste valor. 0 desativa. */
    freeAbove: number;
    radiusKm: number;
    zones: DeliveryZone[];
  };
  pickup: { enabled: boolean; eta: string };
  payments: string[];
  pixKey: string;
}

export type OrderMode = 'delivery' | 'pickup';

export interface CartLineSelections {
  [groupId: string]: string | string[];
}

export interface CartLine {
  uid: string;
  /** Assinatura usada para agrupar linhas idênticas. */
  signature: string;
  itemId: string;
  name: string;
  slug: string;
  quantity: number;
  unitPrice: number;
  selections: CartLineSelections;
  notes: string;
}

export interface CustomerData {
  name: string;
  phone: string;
  mode: OrderMode;
  zoneId: string;
  street: string;
  number: string;
  complement: string;
  reference: string;
  payment: string;
  changeFor: string;
  notes: string;
}
