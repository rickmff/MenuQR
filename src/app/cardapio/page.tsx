import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { MenuBrowser } from '@/components/menu-browser';
import { OpeningBadge } from '@/components/opening-badge';
import { formatPrice } from '@/lib/format';
import { allItems, menu, toCardCategory } from '@/lib/menu';
import { restaurant } from '@/lib/restaurant';
import { breadcrumbSchema, buildMetadata, graph, menuSchema } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: `Cardápio completo — ${restaurant.name}`,
  description:
    `Cardápio online do ${restaurant.name}: ${allItems.length} opções entre hambúrgueres artesanais, porções, ` +
    `bebidas e sobremesas. Peça o delivery e finalize pelo WhatsApp em ${restaurant.address.city}.`,
  path: '/cardapio',
  keywords: ['cardápio online', 'delivery de hambúrguer', 'menu do restaurante', 'pedir comida'],
});

const trail = [
  { name: 'Início', path: '/' },
  { name: 'Cardápio', path: '/cardapio' },
];

export default function CardapioPage() {
  return (
    <>
      <JsonLd id="ld-cardapio" data={graph(menuSchema(), breadcrumbSchema(trail))} />

      <div className="container-page py-8">
        <Breadcrumbs trail={trail} />

        <header className="mt-6 max-w-3xl">
          <h1 className="text-4xl font-semibold sm:text-5xl">Cardápio</h1>
          <p className="mt-4 text-lg text-charcoal-700">
            {allItems.length} opções preparadas na hora. Escolha os itens, monte o pedido e finalize pelo WhatsApp —
            entrega a partir de {formatPrice(Math.min(...restaurant.delivery.zones.map((zone) => zone.fee)))} e
            frete grátis acima de {formatPrice(restaurant.delivery.freeAbove)}.
          </p>
          <div className="mt-4">
            <OpeningBadge />
          </div>
        </header>

        <div className="mt-8">
          <MenuBrowser categories={menu.map(toCardCategory)} />
        </div>
      </div>
    </>
  );
}
