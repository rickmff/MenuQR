'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

/**
 * O aviso de termos pertence ao ato de criar a conta, e só a ele. Nas etapas
 * que o Clerk abre abaixo de `/criar-conta` — confirmar o e-mail, digitar o
 * código — a pessoa já aceitou; repetir o aviso ali só rouba atenção de quem
 * precisa colar um código.
 */
export function SignupTerms() {
  const t = useTranslations('auth.signup');
  if (usePathname().replace(/\/+$/, '') !== '/criar-conta') return null;

  return (
    <p className="mt-6 text-center text-caption text-gray-600">
      {t.rich('terms', {
        terms: (chunks) => (
          <Link className="underline underline-offset-2" href="/termos-de-uso">
            {chunks}
          </Link>
        ),
        privacy: (chunks) => (
          <Link className="underline underline-offset-2" href="/politica-de-privacidade">
            {chunks}
          </Link>
        ),
      })}
    </p>
  );
}
