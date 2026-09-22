import Link from 'next/link';
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
 * (ver o comentário de escopo lá).
 */
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const storeUrl = absoluteUrl(`/r/${sampleBusiness.slug}`);
  const qrSvg = await QRCode.toString(storeUrl, {
    type: 'svg',
    margin: 0,
    width: 176,
    color: { dark: '#1a1a1a', light: '#ffffff' },
  });

  return (
    <AuthShell aside={<AuthAside qrSvg={qrSvg} storeUrl={storeUrl} />}>
      <Link
        href="/"
        aria-label={`${platform.name}, página inicial`}
        className="press mt-6 self-center rounded-sm lg:self-start"
      >
        <Logo />
      </Link>

      {/* O formulário ocupa o meio do que sobra: nem colado no topo, nem no rodapé. */}
      <div className="flex flex-1 items-center py-10">
        <div className="w-full">{children}</div>
      </div>
    </AuthShell>
  );
}
