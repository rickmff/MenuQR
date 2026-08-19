import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { restaurant } from '@/lib/restaurant';
import { breadcrumbSchema, buildMetadata, graph } from '@/lib/seo';

/** Atualize esta data sempre que o texto da política mudar. */
const lastUpdate = '19 de agosto de 2026';

export const metadata: Metadata = buildMetadata({
  title: 'Política de privacidade',
  description: `Como o ${restaurant.name} coleta, usa e protege os dados pessoais de quem faz pedidos pelo site, conforme a LGPD.`,
  path: '/politica-de-privacidade',
});

const trail = [
  { name: 'Início', path: '/' },
  { name: 'Política de privacidade', path: '/politica-de-privacidade' },
];

export default function PrivacidadePage() {
  return (
    <>
      <JsonLd id="ld-privacidade" data={graph(breadcrumbSchema(trail))} />

      <div className="container-page py-8">
        <Breadcrumbs trail={trail} />

        <article className="prose-page mt-6 max-w-3xl [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:mt-2 [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-charcoal-700 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-charcoal-700">
          <h1 className="text-4xl font-semibold sm:text-5xl">Política de privacidade</h1>
          <p className="text-sm text-charcoal-500">Última atualização: {lastUpdate}</p>

          <p>
            Esta política explica como o {restaurant.legalName} (“{restaurant.name}”) trata os dados pessoais de quem
            usa este site, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
          </p>

          <h2>Quem é o controlador dos dados</h2>
          <p>
            {restaurant.legalName}, com endereço em {restaurant.address.street}, {restaurant.address.district},{' '}
            {restaurant.address.city}/{restaurant.address.state}. Contato para assuntos de privacidade:{' '}
            <a className="text-ember-600" href={`mailto:${restaurant.email}`}>
              {restaurant.email}
            </a>
            .
          </p>

          <h2>Quais dados coletamos</h2>
          <ul>
            <li>
              <strong>Dados do pedido:</strong> nome, telefone/WhatsApp, endereço de entrega, forma de pagamento e
              observações que você digita no carrinho.
            </li>
            <li>
              <strong>Dados salvos no seu navegador:</strong> itens do carrinho e seus dados de contato, guardados
              no <em>localStorage</em> do seu dispositivo para você não precisar digitar tudo de novo. Esses dados
              ficam no seu aparelho e não são enviados a nenhum servidor nosso.
            </li>
          </ul>
          <p>
            Este site <strong>não usa cookies de rastreamento, publicidade ou analytics de terceiros</strong> e não
            exige cadastro.
          </p>

          <h2>Para que usamos os dados</h2>
          <ul>
            <li>Receber, preparar e entregar o seu pedido (execução de contrato, art. 7º, V da LGPD).</li>
            <li>Entrar em contato para confirmar informações ou avisar sobre a entrega.</li>
            <li>Cumprir obrigações fiscais e legais aplicáveis a restaurantes.</li>
          </ul>

          <h2>Compartilhamento com o WhatsApp</h2>
          <p>
            A finalização do pedido acontece no WhatsApp. Ao tocar em “Enviar pedido pelo WhatsApp”, o resumo do
            pedido é aberto no aplicativo e enviado por você para o nosso número. A partir daí, o tratamento da
            mensagem também segue as políticas do WhatsApp (Meta Platforms). Não vendemos nem compartilhamos seus
            dados com terceiros para fins de marketing.
          </p>

          <h2>Por quanto tempo guardamos</h2>
          <p>
            Mantemos o histórico de pedidos pelo prazo necessário ao cumprimento de obrigações legais e fiscais. Os
            dados salvos no seu navegador podem ser apagados por você a qualquer momento, limpando os dados do site
            nas configurações do navegador.
          </p>

          <h2>Seus direitos</h2>
          <p>
            Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade ou exclusão
            dos seus dados, além de revogar consentimentos. Basta escrever para{' '}
            <a className="text-ember-600" href={`mailto:${restaurant.email}`}>
              {restaurant.email}
            </a>
            . Respondemos em até 15 dias.
          </p>

          <h2>Segurança</h2>
          <p>
            O site é servido exclusivamente por HTTPS e adota cabeçalhos de segurança que reduzem riscos de
            interceptação e de injeção de conteúdo. Ainda assim, nenhum meio de transmissão é 100% seguro: evite
            enviar dados sensíveis (como números completos de cartão) por mensagem.
          </p>

          <h2>Alterações desta política</h2>
          <p>
            Podemos atualizar este texto para refletir mudanças no serviço ou na legislação. A data de atualização no
            topo da página indica a versão vigente.
          </p>
        </article>
      </div>
    </>
  );
}
