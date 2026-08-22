import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { JsonLd } from '@/components/json-ld';
import { platform } from '@/lib/platform';
import { breadcrumbSchema, buildMetadata, graph } from '@/lib/seo';

const lastUpdate = '22 de agosto de 2026';

export const metadata: Metadata = buildMetadata({
  title: 'Termos de uso',
  description: `Condições de uso da plataforma ${platform.name} por restaurantes e por clientes que fazem pedidos pelos cardápios publicados.`,
  path: '/termos-de-uso',
});

const trail = [
  { name: 'Início', path: '/' },
  { name: 'Termos de uso', path: '/termos-de-uso' },
];

const proseClass =
  '[&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:mt-2 [&_p]:mt-4 [&_p]:leading-relaxed ' +
  '[&_p]:text-ink-700 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-ink-700';

export default function TermsPage() {
  return (
    <>
      <JsonLd id="ld-termos" data={graph(breadcrumbSchema(trail))} />

      <div className="container-page py-10">
        <Breadcrumbs trail={trail} />

        <article className={`mt-6 max-w-3xl ${proseClass}`}>
          <h1 className="text-4xl font-semibold sm:text-5xl">Termos de uso</h1>
          <p className="text-sm text-ink-500">Última atualização: {lastUpdate}</p>

          <p>
            Ao criar uma conta no {platform.name} ou usar um cardápio publicado na plataforma, você
            concorda com as condições abaixo.
          </p>

          <h2>1. O que a plataforma faz</h2>
          <p>
            O {platform.name} é uma ferramenta de publicação de cardápio digital. Nós hospedamos a página
            do cardápio e organizamos a mensagem do pedido. <strong>Não somos parte da venda</strong>: não
            processamos pagamentos, não preparamos nem entregamos alimentos.
          </p>

          <h2>2. Responsabilidade do restaurante</h2>
          <ul>
            <li>
              Manter cardápio, preços, horários, taxas e área de entrega corretos e atualizados.
            </li>
            <li>
              Cumprir a legislação aplicável ao seu negócio — vigilância sanitária, rotulagem, informação
              de alérgenos, direito do consumidor e emissão de nota fiscal.
            </li>
            <li>
              Não vender bebida alcoólica a menores de 18 anos (Lei nº 13.106/2015) nem publicar produtos
              proibidos.
            </li>
            <li>Ter direito de uso sobre as imagens, marcas e textos que publicar.</li>
            <li>Manter a senha em sigilo. As ações feitas com a conta são de responsabilidade do titular.</li>
          </ul>

          <h2>3. Relação com o consumidor</h2>
          <p>
            O contrato de compra e venda é firmado entre o cliente e o restaurante. Dúvidas, trocas,
            cancelamentos e reclamações sobre um pedido devem ser tratados diretamente com o
            estabelecimento, que responde por eles nos termos do Código de Defesa do Consumidor.
          </p>

          <h2>4. Planos e pagamento</h2>
          <p>
            O plano gratuito pode ser usado por tempo indeterminado, dentro dos limites divulgados na
            página de planos. Planos pagos são cobrados de forma recorrente e podem ser cancelados a
            qualquer momento, com acesso mantido até o fim do período já pago. Não cobramos comissão por
            pedido.
          </p>

          <h2>5. Disponibilidade</h2>
          <p>
            Trabalhamos para manter o serviço no ar, mas ele é oferecido “como está”: podem ocorrer
            interrupções para manutenção ou por falhas de terceiros. Recomendamos manter um canal
            alternativo de atendimento.
          </p>

          <h2>6. Uso aceitável</h2>
          <p>
            É proibido usar a plataforma para atividade ilícita, conteúdo enganoso, spam ou tentativas de
            comprometer a segurança e a disponibilidade do serviço. Contas que violarem estas regras podem
            ser suspensas.
          </p>

          <h2>7. Encerramento</h2>
          <p>
            Você pode encerrar a conta quando quiser; o cardápio sai do ar e os dados são removidos
            conforme a política de privacidade.
          </p>

          <h2>8. Foro e contato</h2>
          <p>
            Estes termos são regidos pela legislação brasileira. Fale conosco em{' '}
            <a className="text-flame-600" href={`mailto:${platform.email}`}>
              {platform.email}
            </a>
            .
          </p>
        </article>
      </div>
    </>
  );
}
