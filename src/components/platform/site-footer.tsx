import Link from 'next/link';
import { Logo } from '@/components/platform/logo';
import { Container } from '@/components/ui/container';
import { platform } from '@/lib/platform';

const currentYear = new Date().getFullYear();

const columns = [
  {
    title: 'Produto',
    links: [
      { href: '/#recursos', label: 'Recursos' },
      { href: '/#como-funciona', label: 'Como funciona' },
      { href: '/#planos', label: 'Planos e preços' },
      { href: '/r/sabor-e-brasa', label: 'Cardápio de exemplo' },
    ],
  },
  {
    title: 'Conta',
    links: [
      { href: '/criar-conta', label: 'Criar conta' },
      { href: '/entrar', label: 'Entrar' },
      { href: '/painel', label: 'Painel do restaurante' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/termos-de-uso', label: 'Termos de uso' },
      { href: '/politica-de-privacidade', label: 'Política de privacidade' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <Container className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-body2 text-gray-600">{platform.shortDescription}</p>
          <a
            className="mt-4 inline-block text-body2 font-semibold text-primary hover:text-primary-pressed"
            href={`mailto:${platform.email}`}
          >
            {platform.email}
          </a>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="text-body2 font-semibold text-gray-700">{column.title}</h2>
            <ul className="mt-4 space-y-3 text-body2 text-gray-600">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    className="transition-colors duration-150 ease-standard hover:text-gray-700"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <div className="border-t border-gray-200">
        <Container className="flex flex-col gap-2 py-6 text-caption text-gray-600 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} {platform.name}. Todos os direitos reservados.
          </p>
          <p>Feito para restaurantes que querem vender direto.</p>
        </Container>
      </div>
    </footer>
  );
}
