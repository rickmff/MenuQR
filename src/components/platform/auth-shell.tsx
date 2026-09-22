'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Cada tela de conta tem um objetivo só, e a moldura acompanha.
 *
 * `/entrar` e `/criar-conta` são a porta de entrada: ali cabe mostrar o que o
 * produto entrega, na coluna ao lado. As etapas que o Clerk abre abaixo delas
 * (confirmar e-mail, digitar o código, redefinir a senha) têm um único objetivo
 * — terminar aquele passo. Nelas a tela fica com o formulário e nada mais:
 * qualquer vitrine ali vira ruído e atrapalha quem só quer colar um código.
 */
const ENTRY_ROUTES = new Set(['/entrar', '/criar-conta']);

export function AuthShell({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  // Ignora a barra final: `/entrar/` é a mesma porta de entrada que `/entrar`.
  const showAside = ENTRY_ROUTES.has(pathname.replace(/\/+$/, '') || '/');

  return (
    <div className={cn('grid flex-1', showAside && 'lg:grid-cols-2')}>
      <main
        id="conteudo"
        className={cn('flex flex-col items-center px-4 pb-10 pt-safe', !showAside && 'justify-center')}
      >
        <div className="flex w-full max-w-[25rem] flex-1 flex-col">{children}</div>
      </main>
      {showAside && aside}
    </div>
  );
}
