import { sampleBusiness, sampleMenu } from './sample-data';
import { formatPrice } from '@/lib/format';

/**
 * Dados da ilustração da página inicial.
 *
 * Vêm do mesmo restaurante de exemplo que abre em /r/sabor-e-brasa: assim a
 * vitrine da landing nunca anuncia um prato ou um preço que o cardápio de
 * exemplo não tem mais.
 */
const highlights = sampleMenu
  .filter((category) => category.items.length > 0)
  .slice(0, 3)
  .map((category) => category.items[0]!);

const first = highlights[0];
const requiredGroup = first?.options.find((group) => group.required);
const extraGroup = first?.options.find((group) => !group.required);
const chosen = requiredGroup?.choices[1] ?? requiredGroup?.choices[0];
const extra = extraGroup?.choices[0];
const zone = sampleBusiness.delivery.zones[0];

const itemTotal = (first?.price ?? 0) + (extra?.price ?? 0);

export const showcase = {
  logo: sampleBusiness.logo,
  name: sampleBusiness.name,
  eta: zone?.eta ?? sampleBusiness.pickup.eta,
  items: highlights.map((item) => ({
    emoji: item.image,
    name: item.name,
    price: formatPrice(item.price),
  })),
  /** Como o pedido chega no WhatsApp do lojista. */
  message: [
    `NOVO PEDIDO — ${sampleBusiness.name}`,
    '',
    `1x ${first?.name ?? ''} — ${formatPrice(itemTotal)}`,
    ...(requiredGroup && chosen ? [`   • ${requiredGroup.name}: ${chosen.name}`] : []),
    ...(extraGroup && extra ? [`   • ${extraGroup.name}: ${extra.name}`] : []),
    '',
    `Total: ${formatPrice(itemTotal + (zone?.fee ?? 0))}`,
    `Entrega: ${sampleBusiness.address.street} — ${zone?.name ?? sampleBusiness.address.district}`,
    'Pagamento: Pix',
  ].join('\n'),
};
