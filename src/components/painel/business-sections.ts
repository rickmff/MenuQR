/**
 * As abas de "Dados do negócio" — a fonte da verdade, do tipo à ordem.
 *
 * Fica num módulo sem dependências de propósito: o formulário, as abas, o
 * checklist de configuração e a server action importam daqui, e nada aqui
 * importa de volta. Antes o tipo vinha de `@/server/actions/business` e um
 * módulo do cliente acabava dependendo de um `'use server'`.
 */
export type BusinessSection =
  | 'identidade'
  | 'contato'
  | 'horarios'
  | 'endereco'
  | 'entrega';

/**
 * As abas de "Dados do negócio", na ordem em que aparecem e em que o checklist
 * de configuração as percorre. Fica num arquivo próprio para o formulário e o
 * checklist poderem importar sem depender um do outro.
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
  horarios: {
    label: 'Horários',
    title: 'Horário de funcionamento',
    description: 'A página abre e fecha sozinha nos horários daqui.',
    href: '/painel/negocio/horarios',
  },
  endereco: {
    label: 'Endereço',
    title: 'Endereço',
    description: 'Usado na retirada, no rodapé do cardápio e na busca do Google.',
    href: '/painel/negocio/endereco',
  },
  entrega: {
    label: 'Entrega',
    title: 'Entrega e retirada',
    description: 'Taxas, prazos e regras que aparecem na sacola.',
    href: '/painel/negocio/entrega',
  },
};

/**
 * A ordem em que as abas são percorridas na configuração. Escrita à mão, e não
 * derivada de `Object.keys`: a ordem passa a ser uma decisão explícita, e a
 * lista existe mesmo que o objeto acima ainda não tenha sido avaliado.
 */
export const ONBOARDING_ORDER: BusinessSection[] = [
  'identidade',
  'contato',
  'horarios',
  'endereco',
  'entrega',
];
