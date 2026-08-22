import { SiteFooter } from '@/components/platform/site-footer';
import { SiteHeader } from '@/components/platform/site-header';

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
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
