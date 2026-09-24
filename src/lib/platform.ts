import { BILLING_PLAN, formatPlanPrice } from './billing';

/** Identidade e conteúdo comercial da plataforma (o produto white label). */
export const platform = {
  name: 'Menu Online',
  tagline: 'Cardápio digital com pedidos no WhatsApp',
  shortDescription:
    'Crie o cardápio online do seu restaurante em minutos e receba os pedidos direto no WhatsApp. Sem comissão por pedido, sem aplicativo.',
  description:
    'O Menu Online é a plataforma que transforma o cardápio do seu restaurante em uma página profissional, ' +
    'pronta para receber pedidos de delivery e retirada. Você cadastra o negócio e os pratos, ' +
    'compartilha o link ou o QR code, e os pedidos chegam prontos no seu WhatsApp — sem comissão por venda.',
  email: 'contato@menuqr.app',
  /** Domínio padrão usado quando NEXT_PUBLIC_SITE_URL não está definido. */
  fallbackUrl: 'https://www.menuqr.app',
} as const;

/** Como funciona, do lado do lojista — três estados de um painel só na landing. */
export const steps = [
  {
    number: '01',
    label: 'Cadastre',
    title: 'Cadastre o cardápio',
    text: 'Nome, preço, foto e complementos. Dá para começar com poucos itens.',
  },
  {
    number: '02',
    label: 'Compartilhe',
    title: 'Compartilhe o link ou o QR code',
    text: 'Um endereço curto para as redes e um QR code para a mesa e a embalagem.',
  },
  {
    number: '03',
    label: 'Receba',
    title: 'Receba o pedido no WhatsApp',
    text: 'A mensagem chega pronta: itens, complementos, endereço e observações.',
  },
] as const;

export const platformFaq = [
  {
    question: 'Preciso pagar comissão por pedido?',
    answer:
      'Não. O pedido sai do cardápio direto para o seu WhatsApp — o pagamento é combinado entre você e o ' +
      'cliente, fora do sistema, e não cobramos percentual sobre as vendas, diferente dos aplicativos de delivery.',
  },
  {
    question: 'Meu cliente precisa instalar algum aplicativo?',
    answer:
      'Não. O cardápio abre no navegador, pelo link ou pelo QR code. O único aplicativo usado é o WhatsApp, ' +
      'que o cliente já tem, na hora de enviar o pedido.',
  },
  {
    question: 'Como os pedidos chegam para mim?',
    answer:
      'Como uma mensagem no WhatsApp do restaurante, já formatada: itens e complementos, valores, dados do ' +
      'cliente e endereço de entrega. O pagamento vocês combinam na conversa.',
  },
  {
    question: 'Consigo mudar preços e esgotar itens durante o expediente?',
    answer:
      'Sim. Você altera preços, descrições e a disponibilidade de cada item pelo painel, e o cardápio publicado ' +
      'é atualizado na hora.',
  },
  {
    question: 'O cardápio aparece no Google?',
    answer:
      'Cada cardápio publicado tem endereço próprio, título e descrição únicos e dados estruturados de ' +
      'restaurante (schema.org), que é o que o Google usa para entender horário, endereço e pratos.',
  },
  {
    question: 'Posso usar meu próprio domínio?',
    answer:
      'O cardápio fica em um endereço do tipo menuqr.app/r/seu-restaurante. Domínio próprio está no nosso ' +
      'roteiro e pode ser configurado sob demanda por quem hospeda a plataforma.',
  },
];

/**
 * O que o lojista configura e o cardápio aplica sozinho. Texto puro: a landing
 * lista, não demonstra mais — cada linha precisa existir de verdade no produto.
 */
export const capabilities = [
  {
    label: 'Complementos',
    title: 'Complementos que se somam',
    text: 'Grupo obrigatório, limite de escolhas e adicional pago. O preço fecha na hora.',
  },
  {
    label: 'Entrega',
    title: 'Taxa e prazo por bairro',
    text: 'Cada região com o seu valor, pedido mínimo e frete grátis a partir do que você definir.',
  },
  {
    label: 'Retirada',
    title: 'Retirada no balcão',
    text: 'Ligue a retirada, diga em quanto tempo fica pronto e o cliente escolhe na sacola.',
  },
  {
    label: 'Horário',
    title: 'Aberto e fechado na hora certa',
    text: 'A página segue o horário da semana e pausa os pedidos quando a cozinha fecha.',
  },
  {
    label: 'Cardápio',
    title: 'Preço e esgotado no ato',
    text: 'Mudou no painel, mudou no cardápio publicado. Item esgotado sai do caminho do cliente.',
  },
  {
    label: 'Divulgação',
    title: 'Link curto e QR code',
    text: 'Um endereço para as redes e um QR code para a mesa, a embalagem e a vitrine.',
  },
] as const;

/**
 * Plano único: não há grátis nem teste (decisão do dono). O valor anunciado
 * por mês é o anual dividido por doze — o número de verdade mora em
 * `BILLING_PLAN` (src/lib/billing.ts), e é dele que a cobrança sai.
 */
const monthlyEquivalent = formatPlanPrice(BILLING_PLAN.amountCents / 12).replace(/,\d{2}$/, '');

export const pricing = {
  badge: 'Plano único',
  price: monthlyEquivalent,
  period: '/mês',
  billing: `Assinatura anual · ${formatPlanPrice(BILLING_PLAN.amountCents)} por ano, pagos por Pix`,
  includes: [
    'Cardápio publicado, com link curto e QR code',
    'Itens, categorias e complementos sem limite',
    'Entrega por bairro, retirada e horários',
    'Pedidos ilimitados no seu WhatsApp',
    'Painel para mudar preço e esgotar item na hora',
  ],
  note: 'Sem comissão por pedido: o que o cliente paga é seu.',
} as const;
