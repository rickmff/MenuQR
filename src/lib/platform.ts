/** Identidade e conteúdo comercial da plataforma (o produto white label). */
export const platform = {
  name: 'MenuQR',
  tagline: 'Cardápio digital com pedidos no WhatsApp',
  shortDescription:
    'Crie o cardápio online do seu restaurante em minutos e receba os pedidos direto no WhatsApp. Sem comissão por pedido, sem aplicativo.',
  description:
    'O MenuQR é a plataforma que transforma o cardápio do seu restaurante em uma página profissional, ' +
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

export interface Plan {
  name: string;
  price: string;
  period: string;
  /**
   * `false` enquanto o plano não pode ser contratado. A página troca o botão de
   * assinar por "Em breve" e deixa o plano fora das ofertas do dado estruturado:
   * preço de algo que não se compra não pode ir para o Google como oferta.
   */
  available: boolean;
  highlight: boolean;
  description: string;
  features: string[];
  cta: string;
  /** Linha acima do botão, para dizer o que o botão não diz. */
  note?: string;
}

/**
 * Só entra aqui o que o sistema entrega hoje. Não existe cobrança nem limite de
 * itens, então o Grátis não anuncia limite e o Profissional fica como "Em breve",
 * com o botão levando à conta grátis. Quando a cobrança existir: `available: true`
 * no Profissional, o `cta` de assinar de volta e o limite do Grátis — se houver —
 * aplicado no servidor antes de aparecer nesta lista.
 */
export const plans: Plan[] = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    period: 'para sempre',
    available: true,
    // O destaque vai para o plano que dá para escolher hoje.
    highlight: true,
    description: 'Para colocar o cardápio no ar hoje e testar com os seus clientes.',
    features: [
      'Cardápio publicado com link e QR code',
      'Sem limite de itens no cardápio, por enquanto',
      'Pedidos ilimitados pelo WhatsApp',
      'Entrega por bairro e retirada',
      'Sem comissão por pedido',
    ],
    cta: 'Criar minha conta',
  },
  {
    name: 'Profissional',
    price: 'R$ 49',
    period: 'por mês (preço previsto)',
    available: false,
    highlight: false,
    description: 'Para quem já vive de delivery e quer o cardápio como canal principal.',
    features: [
      'Tudo do plano grátis',
      'Itens e categorias ilimitados',
      'Fotos dos pratos e destaque na página',
      'Personalização de cores e marca',
      'Suporte por WhatsApp em horário comercial',
    ],
    cta: 'Começar no plano grátis',
    note: 'Ainda não dá para assinar. Quem já tem conta será avisado quando o plano chegar.',
  },
];
