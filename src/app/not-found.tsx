import Link from 'next/link';
import '@/app/globals.css';

/**
 * 404 de um caminho que não passou pelo proxy (tem ponto, por exemplo). Sem o
 * idioma da rota, sai nos dois — o `[locale]/not-found.tsx` cobre o resto.
 */
export default function GlobalNotFound() {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <main className="container-page flex flex-1 flex-col justify-center py-24 text-center">
          <p className="text-h1 font-bold">404</p>
          <h1 className="mt-4 text-h4 font-semibold">Não encontramos esta página</h1>
          <p lang="en" className="mt-2 text-ink-500">
            We couldn&apos;t find this page
          </p>
          <div className="mt-8 flex justify-center">
            <Link href="/" className="btn btn-primary">
              Menu Online
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
