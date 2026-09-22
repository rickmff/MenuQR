import Link from 'next/link';
import { Logo } from '@/components/platform/logo';
import { Container } from '@/components/ui/container';
import { platform } from '@/lib/platform';

const currentYear = new Date().getFullYear();

const groups = [
  {
    title: 'Produto',
    links: [
      { href: '/#como-funciona', label: 'Como funciona' },
      { href: '/#capacidades', label: 'Capacidades' },
      { href: '/#preco', label: 'Preço' },
      { href: '/r/sabor-e-brasa', label: 'Cardápio de exemplo' },
    ],
  },
  {
    title: 'Conta',
    links: [
      { href: '/criar-conta', label: 'Criar cardápio' },
      { href: '/entrar', label: 'Entrar' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/termos-de-uso', label: 'Termos de uso' },
      { href: '/politica-de-privacidade', label: 'Privacidade' },
    ],
  },
];

/**
 * Rodapé do site institucional: a marca e o contato de um lado, os links em
 * colunas do outro, e a assinatura — o nome em tamanho de letreiro, cortado
 * pela base da página. É decoração declarada (`aria-hidden`), um carimbo a 5%
 * sobre o papel de parede, para não competir com nenhum texto por cima.
 */
export function SiteFooter() {
  return (
    <footer className="wallpaper relative overflow-hidden border-t border-gray-200">
      {/* No celular os três grupos dividem duas colunas; a marca ocupa a linha inteira. */}
      <Container className="relative grid grid-cols-2 gap-x-6 gap-y-10 py-12 md:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))] lg:py-16">
        <div className="col-span-2 md:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-body2 text-gray-600">
            {platform.tagline}. Você recebe o pedido pronto e não paga comissão por venda.
          </p>
          <a
            href={`mailto:${platform.email}`}
            className="press mt-4 inline-flex rounded-sm text-body2 font-semibold text-primary hover:text-primary-hover"
          >
            {platform.email}
          </a>
        </div>

        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="font-mono text-caption uppercase tracking-widest text-gray-400">{group.title}</p>
            <ul className="mt-4 space-y-3 text-body2 text-gray-600">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors duration-150 ease-standard hover:text-gray-700"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>

      {/* O padding de baixo é o espaço do letreiro: sem ele, o nome passaria por cima do texto. */}
      <Container className="relative flex flex-col gap-1 border-t border-gray-200 pb-[clamp(2.5rem,7vw,7rem)] pt-6 text-caption text-gray-600 md:flex-row md:items-center md:justify-between">
        <p>
          © {currentYear} {platform.name}
        </p>
        <p>Feito para quem vende direto do próprio cardápio.</p>
      </Container>

      {/* Letreiro: cresce com a largura da tela e some pela borda de baixo. */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-[42%] select-none text-center text-[clamp(3.5rem,15vw,10rem)] font-extrabold leading-none tracking-tight text-gray-900 opacity-[0.05]"
      >
        {platform.name}
      </p>
    </footer>
  );
}
