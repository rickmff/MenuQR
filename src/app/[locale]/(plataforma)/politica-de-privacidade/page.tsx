import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { platform } from '@/lib/platform';
import { breadcrumbSchema, buildMetadata, graph } from '@/lib/seo';

/** Atualize esta data sempre que o texto da política mudar. */
const lastUpdate = '22 de setembro de 2026';

export const metadata: Metadata = buildMetadata({
  title: 'Política de privacidade',
  description: `Como o ${platform.name} trata os dados de restaurantes cadastrados e de clientes que fazem pedidos pelos cardápios, conforme a LGPD.`,
  path: '/politica-de-privacidade',
});

const trail = [
  { name: 'Início', path: '/' },
  { name: 'Política de privacidade', path: '/politica-de-privacidade' },
];

const proseClass =
  '[&_h2]:mt-10 [&_h2]:text-h5 [&_h2]:font-semibold [&_li]:mt-2 [&_p]:mt-4 [&_p]:leading-relaxed ' +
  '[&_p]:text-ink-700 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-ink-700';

export default function PrivacyPage() {
  return (
    <>
      <JsonLd id="ld-privacidade" data={graph(breadcrumbSchema(trail))} />

      <div className="container-page py-10">
        <Breadcrumbs trail={trail} />

        <article className={`mt-6 max-w-3xl ${proseClass}`}>
          <h1 className="text-h3 font-semibold sm:text-h2">Política de privacidade</h1>
          <p className="text-body2 text-ink-500">Última atualização: {lastUpdate}</p>

          <p>
            Esta política explica como o {platform.name} trata dados pessoais, em conformidade com a Lei
            Geral de Proteção de Dados (Lei nº 13.709/2018). Ela vale tanto para os restaurantes que usam a
            plataforma quanto para quem faz pedidos pelos cardápios publicados.
          </p>

          <h2>Dois papéis diferentes</h2>
          <ul>
            <li>
              <strong>Conta do restaurante:</strong> somos o controlador dos dados de cadastro (nome e
              e-mail), dos dados de cobrança da assinatura e dos dados do negócio publicados no cardápio. A
              senha fica com o Clerk, nosso operador de autenticação, e nunca passa pelos nossos servidores.
            </li>
            <li>
              <strong>Pedidos dos clientes:</strong> o restaurante é o controlador. O pedido é enviado do
              navegador do cliente direto para o WhatsApp do restaurante — <strong>nós não armazenamos
              pedidos</strong> nem os dados do consumidor.
            </li>
          </ul>

          <h2>Dados que coletamos</h2>
          <ul>
            <li>
              <strong>Conta:</strong> nome e e-mail, espelhados do Clerk. A senha (ou o acesso por código ou
              conta Google) é tratada pelo Clerk; não a recebemos nem guardamos.
            </li>
            <li>
              <strong>Cobrança:</strong> nome do titular, CPF ou CNPJ, os identificadores do cliente e da
              assinatura no Asaas, e o valor, a data e o status de cada cobrança. Não guardamos dados
              bancários — o Pix é pago no seu banco.
            </li>
            <li>
              <strong>Negócio:</strong> dados que você publica no cardápio — nome, endereço, WhatsApp,
              horários, área de entrega, itens e preços. São públicos por natureza.
            </li>
            <li>
              <strong>Sessão:</strong> os cookies de sessão do Clerk (<code>__session</code>,{' '}
              <code>__client_uat</code>), estritamente necessários para manter você conectado. Não usamos
              cookies de publicidade ou rastreamento de terceiros.
            </li>
            <li>
              <strong>No navegador do cliente final:</strong> o carrinho e os dados de entrega ficam no
              armazenamento local do aparelho dele, para não precisar digitar tudo de novo. Esses dados
              não chegam aos nossos servidores.
            </li>
          </ul>

          <h2>Para que usamos</h2>
          <ul>
            <li>Manter sua conta, autenticar o acesso e publicar o cardápio (execução de contrato).</li>
            <li>Cobrar a assinatura, emitir o comprovante e avisar do vencimento (execução de contrato).</li>
            <li>Enviar avisos operacionais sobre o serviço.</li>
            <li>Cumprir obrigações legais aplicáveis.</li>
          </ul>
          <p>Não vendemos dados e não os compartilhamos com terceiros para fins de marketing.</p>

          <h2>Operadores e transferência internacional</h2>
          <p>Estes serviços tratam dados em nosso nome, cada um só para a sua função:</p>
          <ul>
            <li>
              <strong>Clerk</strong> (autenticação): e-mail, nome e credenciais de acesso. Estados Unidos.
            </li>
            <li>
              <strong>Turso</strong> (banco de dados) e <strong>Vercel</strong> (hospedagem e CDN): os dados
              da conta, do negócio e do cardápio, inclusive as fotos. Estados Unidos.
            </li>
            <li>
              <strong>Asaas Gestão Financeira Instituição de Pagamento S.A.</strong> (cobrança da
              assinatura): nome, e-mail, CPF ou CNPJ e celular do titular, para gerar o Pix e enviar os
              avisos de cobrança. Brasil.
            </li>
          </ul>
          <p>
            A transferência para os Estados Unidos se apoia em cláusulas contratuais padrão, conforme o
            art. 33 da LGPD.
          </p>

          <h2>Compartilhamento com o WhatsApp</h2>
          <p>
            A finalização do pedido acontece no WhatsApp. Ao tocar em “Enviar pedido”, a mensagem é aberta
            no aplicativo e enviada pelo próprio cliente ao restaurante. A partir daí, o tratamento também
            segue as políticas do WhatsApp (Meta Platforms).
          </p>

          <h2>Retenção e exclusão</h2>
          <p>
            Mantemos os dados da conta enquanto ela existir. Você pode excluir a conta e o cardápio a
            qualquer momento, sem depender de nós, em{' '}
            <Link className="text-flame-600" href="/painel/conta">
              Conta › Excluir conta
            </Link>
            , no painel. A exclusão vale na hora: os dados de cadastro, o negócio e o cardápio são
            apagados, e o link público e o QR code param de funcionar. Os registros financeiros das
            cobranças permanecem no Asaas pelo prazo que a lei exige, e uma cópia das fotos pode ficar no
            cache da CDN por até 12 meses, em endereços que só quem já tinha o link conhece.
          </p>
          <p>
            Se preferir, ou se não conseguir entrar no painel, peça a exclusão escrevendo para{' '}
            <a className="text-flame-600" href={`mailto:${platform.email}`}>
              {platform.email}
            </a>
            ; nesse caso concluímos a remoção em até 15 dias.
          </p>

          <h2>Seus direitos</h2>
          <p>
            Você pode pedir confirmação de tratamento, acesso, correção, portabilidade, anonimização ou
            exclusão dos seus dados, além de revogar consentimentos, pelo mesmo e-mail.
          </p>

          <h2>Segurança</h2>
          <p>
            A plataforma é servida por HTTPS, com cabeçalhos de segurança que reduzem risco de
            interceptação e injeção de conteúdo. A autenticação é do Clerk (senha com hash, verificação
            em duas etapas opcional, sessão em cookies <code>httpOnly</code>). Nenhum sistema é totalmente
            imune a incidentes: se algum ocorrer com risco relevante, comunicaremos os afetados e a ANPD.
          </p>

          <h2>Alterações</h2>
          <p>
            Podemos atualizar este texto para refletir mudanças no serviço ou na legislação. A data no topo
            indica a versão vigente.
          </p>
        </article>
      </div>
    </>
  );
}
