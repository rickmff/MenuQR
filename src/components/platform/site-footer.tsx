import Link from 'next/link';
import { platform } from '@/lib/platform';

const currentYear = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-cream-200 bg-white">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-xl bg-linear-to-br from-ember-500 to-ember-700 text-lg"
            >
              🍽️
            </span>
            <span className="font-display text-lg font-semibold">{platform.name}</span>
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-charcoal-500">
            {platform.shortDescription}
          </p>
        </div>

        <div>
          <h2 className="font-display text-base font-semibold">Produto</h2>
          <ul className="mt-4 space-y-2 text-sm text-charcoal-500">
            <li>
              <Link className="hover:text-ember-600" href="/#recursos">
                Recursos
              </Link>
            </li>
            <li>
              <Link className="hover:text-ember-600" href="/#como-funciona">
                Como funciona
              </Link>
            </li>
            <li>
              <Link className="hover:text-ember-600" href="/#planos">
                Planos e preços
              </Link>
            </li>
            <li>
              <Link className="hover:text-ember-600" href="/r/sabor-e-brasa">
                Ver um cardápio de exemplo
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-base font-semibold">Conta</h2>
          <ul className="mt-4 space-y-2 text-sm text-charcoal-500">
            <li>
              <Link className="hover:text-ember-600" href="/criar-conta">
                Criar conta grátis
              </Link>
            </li>
            <li>
              <Link className="hover:text-ember-600" href="/entrar">
                Entrar
              </Link>
            </li>
            <li>
              <Link className="hover:text-ember-600" href="/painel">
                Painel do restaurante
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h2 className="font-display text-base font-semibold">Legal</h2>
          <ul className="mt-4 space-y-2 text-sm text-charcoal-500">
            <li>
              <Link className="hover:text-ember-600" href="/termos-de-uso">
                Termos de uso
              </Link>
            </li>
            <li>
              <Link className="hover:text-ember-600" href="/politica-de-privacidade">
                Política de privacidade
              </Link>
            </li>
            <li>
              <a className="hover:text-ember-600" href={`mailto:${platform.email}`}>
                {platform.email}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream-200">
        <div className="container-page py-6 text-xs text-charcoal-500">
          © {currentYear} {platform.name}. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
}
