import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { formatPrice } from '@/lib/format';
import { restaurant } from '@/lib/restaurant';
import { breadcrumbSchema, buildMetadata, graph } from '@/lib/seo';

const lastUpdate = '19 de agosto de 2026';

export const metadata: Metadata = buildMetadata({
  title: 'Termos de uso',
  description: `Condições de uso do site e de realização de pedidos de delivery e retirada no ${restaurant.name}.`,
  path: '/termos-de-uso',
});

const trail = [
  { name: 'Início', path: '/' },
  { name: 'Termos de uso', path: '/termos-de-uso' },
];

export default function TermosPage() {
  return (
    <>
      <JsonLd id="ld-termos" data={graph(breadcrumbSchema(trail))} />

      <div className="container-page py-8">
        <Breadcrumbs trail={trail} />

        <article className="mt-6 max-w-3xl [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:mt-2 [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-charcoal-700 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-charcoal-700">
          <h1 className="text-4xl font-semibold sm:text-5xl">Termos de uso</h1>
          <p className="text-sm text-charcoal-500">Última atualização: {lastUpdate}</p>

          <p>
            Ao usar este site e enviar um pedido ao {restaurant.legalName}, você concorda com as condições abaixo.
          </p>

          <h2>1. Como o pedido é feito</h2>
          <p>
            O site funciona como cardápio digital: você monta o pedido e finaliza enviando uma mensagem pelo WhatsApp.
            O pedido só é considerado recebido depois da <strong>nossa confirmação na conversa</strong>. Enquanto não
            houver essa resposta, nenhum item foi reservado ou colocado em produção.
          </p>

          <h2>2. Preços, taxas e disponibilidade</h2>
          <ul>
            <li>Os preços exibidos estão em reais e incluem os tributos aplicáveis.</li>
            <li>
              A taxa de entrega varia conforme o bairro e é informada no carrinho. Pedidos acima de{' '}
              {formatPrice(restaurant.delivery.freeAbove)} têm frete grátis.
            </li>
            <li>
              O pedido mínimo para entrega é {formatPrice(restaurant.delivery.minOrder)}. Não há mínimo para retirada.
            </li>
            <li>
              Itens podem esgotar durante o expediente. Nesse caso, avisamos pelo WhatsApp e você pode trocar o item
              ou cancelar o pedido sem custo.
            </li>
          </ul>

          <h2>3. Prazos de entrega</h2>
          <p>
            Os prazos informados são estimativas e podem variar com o volume de pedidos, o clima e as condições de
            trânsito. Atrasos relevantes são comunicados pelo WhatsApp.
          </p>

          <h2>4. Cancelamento e trocas</h2>
          <p>
            Por se tratar de alimento preparado sob encomenda e perecível, o cancelamento só é possível enquanto o
            preparo não tiver começado — fale com a gente imediatamente pelo WhatsApp. Se o pedido chegar errado,
            incompleto ou fora do padrão, avise em até 2 horas: refazemos o item ou devolvemos o valor
            correspondente, conforme o Código de Defesa do Consumidor.
          </p>

          <h2>5. Bebidas alcoólicas</h2>
          <p>
            A venda de bebidas alcoólicas é proibida para menores de 18 anos (Lei nº 13.106/2015). O entregador pode
            solicitar documento de identidade com foto no ato da entrega e recusar a entrega em caso de recusa ou
            impossibilidade de comprovação.
          </p>

          <h2>6. Uso do site</h2>
          <p>
            O conteúdo do site — textos, fotos, marca e cardápio — pertence ao {restaurant.legalName} e não pode ser
            reproduzido comercialmente sem autorização. É proibido usar o site para fins ilícitos ou tentar
            comprometer sua disponibilidade e segurança.
          </p>

          <h2>7. Foro e contato</h2>
          <p>
            Estes termos são regidos pela legislação brasileira. Dúvidas e reclamações podem ser enviadas para{' '}
            <a className="text-ember-600" href={`mailto:${restaurant.email}`}>
              {restaurant.email}
            </a>{' '}
            ou pelo WhatsApp {restaurant.phoneDisplay}.
          </p>
        </article>
      </div>
    </>
  );
}
