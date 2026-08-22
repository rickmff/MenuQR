import Link from 'next/link';
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
    <footer className="border-t border-ink-200 bg-white">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-9 place-items-center rounded-xl bg-ink-950 text-base text-ink-50"
            >
              ◍
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">{platform.name}</span>
          </p>
          <p className="mt-5 max-w-xs leading-relaxed text-ink-500">{platform.shortDescription}</p>
          <a
            className="mt-5 inline-block text-sm font-semibold text-flame-600 hover:text-flame-700"
            href={`mailto:${platform.email}`}
          >
            {platform.email}
          </a>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="font-display text-base font-semibold">{column.title}</h2>
            <ul className="mt-5 space-y-3 text-sm text-ink-500">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link className="transition-colors hover:text-flame-600" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-200">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {currentYear} {platform.name}. Todos os direitos reservados.
          </p>
          <p>Feito para restaurantes que querem vender direto.</p>
        </div>
      </div>
    </footer>
  );
}
