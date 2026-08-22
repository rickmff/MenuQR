/** Tipos do domínio: negócios (tenants), cardápio e pedido. */

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
  required: boolean;
  /** Máximo de escolhas em grupos do tipo `multi`. */
  max: number | null;
  choices: MenuChoice[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  description: string;
  /** Preço base em reais. */
  price: number;
  /** Emoji ou URL de imagem. */
  image: string;
  imageAlt: string;
  tags: string[];
  allergens: string[];
  serves: string;
  calories: number | null;
  available: boolean;
  position: number;
  options: MenuOptionGroup[];
}

export interface MenuCategory {
  id: string;
  slug: string;
  name: string;
  icon: string;
  description: string;
  position: number;
  items: MenuItem[];
}

/** Versão enxuta do item, usada nas listagens (menos payload no navegador). */
export type MenuItemCard = Omit<MenuItem, 'options'> & {
  optionCount: number;
  /** Se houver grupo obrigatório, o item abre a página em vez de ir direto à sacola. */
  hasRequiredOptions: boolean;
};
export type MenuCategoryCard = Omit<MenuCategory, 'items'> & { items: MenuItemCard[] };

export interface OpeningRange {
  open: string;
  close: string;
}

/** 0 = domingo … 6 = sábado. Lista vazia significa fechado. */
export type WeeklyHours = Record<number, OpeningRange[]>;

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  eta: string;
}

export interface BusinessAddress {
  street: string;
  district: string;
  city: string;
  state: string;
  postalCode: string;
}

/** Um restaurante cadastrado na plataforma. */
export interface Business {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Emoji ou URL da logo. */
  logo: string;
  /** Cor da marca em hexadecimal — personaliza o cardápio publicado. */
  brandColor: string;
  /** Somente dígitos, com código do país. Ex.: 5511987654321 */
  whatsapp: string;
  email: string;
  instagram: string;
  address: BusinessAddress;
  hours: WeeklyHours;
  acceptOrdersWhenClosed: boolean;
  delivery: {
    enabled: boolean;
    minOrder: number;
    /** Frete grátis a partir deste valor. 0 desativa. */
    freeAbove: number;
    zones: DeliveryZone[];
  };
  pickup: { enabled: boolean; eta: string };
  payments: string[];
  pixKey: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessWithMenu {
  business: Business;
  menu: MenuCategory[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export type OrderMode = 'delivery' | 'pickup';

export interface CartLineSelections {
  [groupId: string]: string | string[];
}

export interface CartLine {
  uid: string;
  /** Assinatura usada para juntar linhas idênticas. */
  signature: string;
  itemId: string;
  name: string;
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
