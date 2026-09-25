import { setRequestLocale } from 'next-intl/server';
import { SiteFooter } from '@/components/platform/site-footer';
import { SiteHeader } from '@/components/platform/site-header';

export default async function PlatformLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Layouts renderizam em paralelo com a página: cada um fixa o idioma, senão
  // os textos daqui leem o cabeçalho e a rota inteira deixa de ser estática.
  setRequestLocale((await params).locale);
  return (
    <>
      <SiteHeader />
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
