import type { Restaurant } from './types';

/**
 * Dados da empresa. É a única fonte de verdade para o site inteiro:
 * cabeçalho, rodapé, páginas, sitemap, dados estruturados (schema.org)
 * e a mensagem enviada ao WhatsApp.
 */
export const restaurant: Restaurant = {
  name: 'Sabor & Brasa',
  legalName: 'Sabor & Brasa Restaurante Ltda.',
  tagline: 'Hamburgueria artesanal e petiscos',
  shortDescription:
    'Hamburgueria artesanal em São Paulo com blend próprio, pão brioche feito na casa e entrega em até 45 minutos.',
  description:
    'O Sabor & Brasa é uma hamburgueria artesanal fundada em 2015, no centro de São Paulo. ' +
    'Trabalhamos com blend bovino moído no dia, pães assados na casa e ingredientes de produtores locais. ' +
    'Peça pelo cardápio digital e finalize em segundos pelo WhatsApp, com entrega em toda a região central.',
  logo: '🔥',
  founded: '2015',
  cuisine: ['Hamburgueria', 'Comida artesanal', 'Petiscos'],
  priceRange: '$$',

  // Número que RECEBE os pedidos. Somente dígitos: 55 + DDD + número.
  whatsapp: '5511987654321',
  phoneDisplay: '(11) 98765-4321',
  email: 'contato@saborebrasa.com.br',

  address: {
    street: 'Rua das Palmeiras, 120',
    district: 'Centro',
    city: 'São Paulo',
    state: 'SP',
    postalCode: '01013-000',
    country: 'BR',
    latitude: -23.5442,
    longitude: -46.6386,
    mapsUrl: 'https://www.google.com/maps/search/?api=1&query=-23.5442,-46.6386',
  },

  social: {
    instagram: 'https://www.instagram.com/saborebrasa',
    facebook: 'https://www.facebook.com/saborebrasa',
  },

  // 0 = domingo … 6 = sábado. Horários que viram a madrugada são aceitos.
  hours: {
    0: [{ open: '18:00', close: '23:00' }],
    1: [],
    2: [{ open: '18:00', close: '23:30' }],
    3: [{ open: '18:00', close: '23:30' }],
    4: [{ open: '18:00', close: '23:30' }],
    5: [{ open: '18:00', close: '23:59' }],
    6: [{ open: '12:00', close: '23:59' }],
  },
  acceptOrdersWhenClosed: false,

  delivery: {
    enabled: true,
    minOrder: 25,
    freeAbove: 90,
    radiusKm: 6,
    zones: [
      { id: 'centro', name: 'Centro', fee: 5, eta: '30-45 min' },
      { id: 'republica', name: 'República', fee: 6, eta: '35-50 min' },
      { id: 'jardim-america', name: 'Jardim América', fee: 7, eta: '40-55 min' },
      { id: 'vila-nova', name: 'Vila Nova', fee: 9, eta: '45-60 min' },
      { id: 'distrito-industrial', name: 'Distrito Industrial', fee: 12, eta: '50-70 min' },
    ],
  },

  pickup: { enabled: true, eta: '20-30 min' },

  payments: ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Vale-refeição'],
  pixKey: 'contato@saborebrasa.com.br',
};
