import type { BusinessSection } from '@/server/actions/business';

/**
 * As abas de "Dados do negócio", na ordem em que aparecem e em que o guia de
 * primeira visita as percorre. Fica num arquivo próprio para o formulário e o
 * guia poderem importar sem depender um do outro.
 */
export const BUSINESS_SECTIONS: Record<
  BusinessSection,
  { label: string; title: string; description: string; href: string }
> = {
  identidade: {
    label: 'Identidade',
    title: 'Identidade',
    description: 'Como o restaurante aparece no topo do cardápio.',
    href: '/painel/negocio',
  },
  contato: {
    label: 'Contato',
    title: 'Contato',
    description: 'O WhatsApp é para onde os pedidos são enviados.',
    href: '/painel/negocio/contato',
  },
  endereco: {
    label: 'Endereço',
    title: 'Endereço',
    description: 'Usado na retirada, no rodapé do cardápio e na busca do Google.',
    href: '/painel/negocio/endereco',
  },
  horarios: {
    label: 'Horários',
    title: 'Horário de funcionamento',
    description: 'A página abre e fecha sozinha nos horários daqui.',
    href: '/painel/negocio/horarios',
  },
  entrega: {
    label: 'Entrega',
    title: 'Entrega e retirada',
    description: 'Taxas, prazos e regras que aparecem na sacola.',
    href: '/painel/negocio/entrega',
  },
  pagamentos: {
    label: 'Pagamentos',
    title: 'Formas de pagamento',
    description: 'Aparecem para o cliente escolher ao finalizar o pedido.',
    href: '/painel/negocio/pagamentos',
  },
};

export const ONBOARDING_ORDER = Object.keys(BUSINESS_SECTIONS) as BusinessSection[];
