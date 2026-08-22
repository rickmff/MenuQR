'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/** Barreira de erro: mantém o site utilizável se algo falhar no cliente. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Em produção, envie para o seu monitoramento (Sentry, Vercel, etc.).
    console.error(error);
  }, [error]);

  return (
    <div className="container-page py-24 text-center">
      <p className="text-5xl" aria-hidden="true">
        ⚠️
      </p>
      <h1 className="mt-4 text-3xl font-semibold">Algo deu errado por aqui</h1>
      <p className="mx-auto mt-3 max-w-md text-ink-500">
        Tivemos um problema ao carregar esta página. Tente de novo — se continuar, fale com a gente pelo WhatsApp que
        anotamos seu pedido na hora.
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
          href="/cardapio"
          className="btn btn-outline"
        >
          Ir para o cardápio
        </Link>
      </div>
    </div>
  );
}
