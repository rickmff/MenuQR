'use client';

import { usePathname } from 'next/navigation';
import { useSyncExternalStore, type ReactNode } from 'react';
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

/**
 * O Clerk troca de etapa com `history.pushState` direto, sem passar pelo router
 * do Next (medido em 2026-09-24: `pushState → /entrar/factor-one` com `state`
 * nulo), então `usePathname()` fica parado em `/entrar` e a vitrine seguia ao
 * lado do código. A URL continua sendo a fonte; o que muda é o gatilho: a
 * coluna relê `location.pathname` a cada mudança do próprio DOM (a etapa nova
 * é renderizada logo depois do pushState) e no voltar/avançar. Só a coluna é
 * observada — a vitrine anima o tempo todo e não interessa aqui.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  const observer = new MutationObserver(onChange);
  const column = document.getElementById('conteudo');
  if (column) observer.observe(column, { childList: true, subtree: true });
  return () => {
    window.removeEventListener('popstate', onChange);
    observer.disconnect();
  };
}

function getPathname(): string {
  return window.location.pathname;
}

export function AuthShell({
  brand,
  aside,
  children,
}: {
  brand: ReactNode;
  aside: ReactNode;
  children: ReactNode;
}) {
  const routerPathname = usePathname();
  const pathname = useSyncExternalStore(subscribe, getPathname, () => routerPathname);
  // Ignora a barra final: `/entrar/` é a mesma porta de entrada que `/entrar`.
  const showAside = ENTRY_ROUTES.has(pathname.replace(/\/+$/, '') || '/');

  return (
    <div className={cn('grid flex-1', showAside && 'lg:grid-cols-2')}>
      <main
        id="conteudo"
        className={cn('flex flex-col items-center px-4 pb-10 pt-safe', !showAside && 'justify-center')}
      >
        <div className="flex w-full max-w-[25rem] flex-1 flex-col">
          {/* A marca segue o eixo do formulário: na porta de entrada ele é
              alinhado à esquerda a partir de `lg`; nas etapas do Clerk o
              conteúdo (título, e-mail, caixas do código) é centralizado, e a
              marca encostada à esquerda ficava solta acima de tudo. */}
          <div className={cn('mt-6 flex justify-center', showAside && 'lg:justify-start')}>{brand}</div>
          {children}
        </div>
      </main>
      {showAside && aside}
    </div>
  );
}
