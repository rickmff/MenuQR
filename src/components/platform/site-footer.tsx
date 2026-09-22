import Link from 'next/link';
import { Logo } from '@/components/platform/logo';
import { Container } from '@/components/ui/container';
import { platform } from '@/lib/platform';

const currentYear = new Date().getFullYear();

const links = [
  { href: '/entrar', label: 'Entrar' },
  { href: '/r/sabor-e-brasa', label: 'Cardápio de exemplo' },
  { href: '/termos-de-uso', label: 'Termos de uso' },
  { href: '/politica-de-privacidade', label: 'Privacidade' },
];

/** Rodapé mínimo: a marca, os links que precisam existir e o contato. */
export function SiteFooter() {
  return (
    <footer className="border-t border-gray-200">
      <Container className="flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
        <Logo size="sm" />
        <nav aria-label="Rodapé">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-body2 text-gray-600">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors duration-150 ease-standard hover:text-gray-700">
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a href={`mailto:${platform.email}`} className="transition-colors duration-150 ease-standard hover:text-gray-700">
                {platform.email}
              </a>
            </li>
          </ul>
        </nav>
        <p className="text-caption text-gray-600">
          © {currentYear} {platform.name}
        </p>
      </Container>
    </footer>
  );
}
