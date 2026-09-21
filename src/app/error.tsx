'use client';

import Link from 'next/link';
import { useEffect } from 'react';

type BoundaryError = Error & { digest?: string };

// Um relato por erro: o efeito roda duas vezes no modo estrito e de novo a cada
// render com o mesmo objeto. Erro novo depois de "Tentar novamente" é outro objeto.
const reported = new WeakSet<BoundaryError>();

/**
 * Conta o erro para o servidor (`/api/erros`), que o registra no log — sem isso o
 * dono da plataforma só ficava sabendo quando o lojista reclamava. É melhor esforço:
 * `sendBeacon` não espera resposta nem segura a tela, e falhar aqui não muda nada
 * para quem está vendo a página. Com Sentry ou similar, o `captureException` entra
 * no lugar desta função.
 */
function report(error: BoundaryError) {
  if (reported.has(error)) return;
  reported.add(error);

  // Só o caminho: a query pode levar dado de quem navega e, no modo demonstração,
  // o fragmento leva o cardápio inteiro.
  const body = JSON.stringify({
    message: String(error.message).slice(0, 500),
    digest: error.digest,
    path: window.location.pathname,
  });

  try {
    if (typeof navigator.sendBeacon === 'function' && navigator.sendBeacon('/api/erros', body)) return;
    void fetch('/api/erros', { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch {
    /* relato é melhor esforço */
  }
}

/** Barreira de erro: mantém o site utilizável se algo falhar no cliente. */
export default function Error({ error, reset }: { error: BoundaryError; reset: () => void }) {
  useEffect(() => {
    console.error(error);
    report(error);
  }, [error]);

  return (
    <div className="container-page py-24 text-center">
      <p className="text-h2" aria-hidden="true">
        ⚠️
      </p>
      <h1 className="mt-4 text-h4 font-semibold">Algo deu errado por aqui</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-500">
        Tivemos um problema ao carregar esta página. Tente de novo — o que você já tinha feito continua salvo.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary"
        >
          Tentar novamente
        </button>
        <Link
          href="/"
          className="btn btn-outline"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
