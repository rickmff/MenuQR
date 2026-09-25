import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import QRCode from 'qrcode';
import { AuthAside } from '@/components/platform/auth-aside';
import { AuthShell } from '@/components/platform/auth-shell';
import { Logo } from '@/components/platform/logo';
import { sampleBusiness } from '@/lib/demo/sample-data';
import { platform } from '@/lib/platform';
import { absoluteUrl } from '@/lib/site';

/**
 * Moldura das telas de conta. O QR é gerado aqui, no servidor, e entregue
 * pronto ao `AuthShell`, que decide se a tela atual comporta a coluna ao lado
 * e onde a marca se alinha (ver o comentário de escopo lá).
 */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Layouts renderizam em paralelo com a página: cada um fixa o idioma, senão
  // os textos daqui leem o cabeçalho e a rota inteira deixa de ser estática.
  setRequestLocale((await params).locale);
  const t = await getTranslations('platform.header');
  const storeUrl = absoluteUrl(`/r/${sampleBusiness.slug}`);
  const qrSvg = await QRCode.toString(storeUrl, {
    type: 'svg',
    margin: 0,
    width: 176,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });

  return (
    <AuthShell
      brand={
        <Link href="/" aria-label={t('homeLabel', { name: platform.name })} className="press rounded-sm">
          <Logo />
        </Link>
      }
      aside={<AuthAside qrSvg={qrSvg} storeUrl={storeUrl} />}
    >
      {/* No celular o formulário sobe: centralizá-lo na vertical abre um vão
          entre a marca e o título maior que o próprio formulário. Na tela
          grande, onde a coluna é alta e curta, ele volta para o meio. */}
      <div className="flex flex-1 items-start py-8 lg:items-center lg:py-10">
        <div className="w-full">{children}</div>
      </div>
    </AuthShell>
  );
}
