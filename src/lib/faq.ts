import { formatPrice } from './format';
import { restaurant } from './restaurant';

/**
 * Perguntas frequentes — usadas na página /perguntas-frequentes e no
 * dado estruturado FAQPage. Manter as duas fontes iguais é exigência do Google.
 */
export const faq = [
  {
    question: 'Como faço um pedido de delivery?',
    answer:
      'Escolha os itens no cardápio online, abra o carrinho e informe nome, WhatsApp, endereço e forma de pagamento. ' +
      'Ao finalizar, abrimos a conversa do WhatsApp com o pedido já escrito: basta enviar a mensagem para a cozinha receber.',
  },
  {
    question: 'Qual é o valor mínimo do pedido?',
    answer: `O pedido mínimo para entrega é ${formatPrice(restaurant.delivery.minOrder)}. Para retirada no balcão não há valor mínimo.`,
  },
  {
    question: 'Quanto custa a entrega?',
    answer:
      `A taxa varia por bairro, de ${formatPrice(Math.min(...restaurant.delivery.zones.map((zone) => zone.fee)))} a ` +
      `${formatPrice(Math.max(...restaurant.delivery.zones.map((zone) => zone.fee)))}. ` +
      `Pedidos acima de ${formatPrice(restaurant.delivery.freeAbove)} têm frete grátis em toda a área atendida.`,
  },
  {
    question: 'Qual o tempo de entrega?',
    answer:
      'Entre 30 e 70 minutos, dependendo do bairro e do movimento da cozinha. O prazo estimado aparece ao escolher o bairro no carrinho. ' +
      `Para retirada no local, o pedido fica pronto em ${restaurant.pickup.eta}.`,
  },
  {
    question: 'Quais formas de pagamento vocês aceitam?',
    answer: `Aceitamos ${restaurant.payments.join(', ')}. O pagamento é feito na entrega ou na retirada, combinado pelo WhatsApp.`,
  },
  {
    question: 'Vocês têm opções vegetarianas?',
    answer:
      'Sim. O hambúrguer Verde que te quero Verde é vegetariano, feito com grão-de-bico e beterraba, e várias porções também são. ' +
      'Cada página de prato informa alérgenos e restrições alimentares.',
  },
  {
    question: 'Posso retirar o pedido no restaurante?',
    answer: `Pode. Escolha “Retirada” no carrinho e retire em ${restaurant.address.street}, ${restaurant.address.district}, ${restaurant.address.city}.`,
  },
  {
    question: 'Vocês atendem meu bairro?',
    answer:
      `Entregamos em um raio de ${restaurant.delivery.radiusKm} km: ` +
      `${restaurant.delivery.zones.map((zone) => zone.name).join(', ')}. ` +
      'Se o seu bairro não estiver na lista, fale com a gente pelo WhatsApp para confirmar.',
  },
];
