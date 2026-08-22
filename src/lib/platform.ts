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

export const features = [
  {
    icon: '📱',
    title: 'Cardápio próprio, com a sua marca',
    text: 'Logo, cores, fotos e descrições dos pratos. O cliente vê o seu restaurante, não o nosso.',
  },
  {
    icon: '💬',
    title: 'Pedido pronto no WhatsApp',
    text: 'O cliente monta o pedido e a mensagem chega organizada: itens, complementos, endereço e pagamento.',
  },
  {
    icon: '🛵',
    title: 'Entrega por bairro',
    text: 'Taxa e prazo por região, pedido mínimo, frete grátis a partir de um valor e opção de retirada.',
  },
  {
    icon: '🧾',
    title: 'Complementos e variações',
    text: 'Ponto da carne, tamanho, adicionais pagos, limite de escolhas e observações do cliente.',
  },
  {
    icon: '🔗',
    title: 'Link e QR code na hora',
    text: 'Um endereço curto para as redes sociais e um QR code para imprimir nas mesas e embalagens.',
  },
  {
    icon: '🔍',
    title: 'Preparado para o Google',
    text: 'Cada cardápio publicado sai com título, descrição e dados estruturados de restaurante.',
  },
  {
    icon: '⏰',
    title: 'Horário de funcionamento',
    text: 'A página mostra aberto ou fechado em tempo real e pode bloquear pedidos fora do expediente.',
  },
  {
    icon: '💸',
    title: 'Sem comissão por pedido',
    text: 'O pedido vai direto do cliente para o seu WhatsApp. Nada de taxa por venda como nos aplicativos.',
  },
];

export const steps = [
  {
    number: '1',
    title: 'Crie sua conta',
    text: 'Leva menos de um minuto: nome, e-mail e senha. Nenhum cartão de crédito é pedido.',
  },
  {
    number: '2',
    title: 'Cadastre o negócio',
    text: 'Informe o WhatsApp que recebe os pedidos, o endereço, os horários e os bairros que você atende.',
  },
  {
    number: '3',
    title: 'Monte o cardápio',
    text: 'Categorias, pratos, preços e complementos. Dá para começar com poucos itens e crescer depois.',
  },
  {
    number: '4',
    title: 'Publique e divulgue',
    text: 'Publique o cardápio e compartilhe o link ou o QR code. Os pedidos começam a chegar no WhatsApp.',
  },
];

export const platformFaq = [
  {
    question: 'Preciso pagar comissão por pedido?',
    answer:
      'Não. O pedido sai do cardápio direto para o seu WhatsApp — nós não processamos pagamento e não cobramos ' +
      'percentual sobre as vendas, diferente dos aplicativos de delivery.',
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
      'cliente, endereço de entrega, forma de pagamento e troco.',
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

export const plans = [
  {
    name: 'Grátis',
    price: 'R$ 0',
    period: 'para sempre',
    highlight: false,
    description: 'Para colocar o cardápio no ar hoje e testar com os seus clientes.',
    features: [
      'Cardápio publicado com link e QR code',
      'Até 30 itens no cardápio',
      'Pedidos ilimitados pelo WhatsApp',
      'Entrega por bairro e retirada',
      'Sem comissão por pedido',
    ],
    cta: 'Começar grátis',
  },
  {
    name: 'Profissional',
    price: 'R$ 49',
    period: 'por mês',
    highlight: true,
    description: 'Para quem já vive de delivery e quer o cardápio como canal principal.',
    features: [
      'Tudo do plano grátis',
      'Itens e categorias ilimitados',
      'Fotos dos pratos e destaque na página',
      'Personalização de cores e marca',
      'Suporte por WhatsApp em horário comercial',
    ],
    cta: 'Assinar o Profissional',
  },
];
