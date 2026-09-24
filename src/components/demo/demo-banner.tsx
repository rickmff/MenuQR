import { FlaskConical } from 'lucide-react';
import Link from 'next/link';
import { Banner } from '@/components/ui/banner';

const TEXT = 'Conta e cardápio ficam salvos só neste navegador — nada vai para um servidor.';

/** Aviso permanente: no modo demonstração nada sai do navegador. */
export function DemoBanner({ compact = false }: { compact?: boolean }) {
  // Na loja: um aviso como os outros da tela do cliente (cartão arredondado,
  // tom informativo), logo abaixo da identidade.
  if (compact) {
    return (
      <Banner tone="info" radius="md" icon={<FlaskConical className="size-5" />} title="Modo demonstração">
        {TEXT}{' '}
        <Link href="/#planos" className="font-semibold underline underline-offset-2">
          Saiba mais
        </Link>
      </Banner>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-flame-200 bg-flame-50 px-4 py-3 text-body2 text-flame-700">
      <span className="font-semibold">
        <span aria-hidden="true">🧪</span> Modo demonstração
      </span>
      <span className="hidden text-ink-700 sm:inline">{TEXT}</span>
      <Link href="/#planos" className="ml-auto shrink-0 font-semibold underline underline-offset-2">
        Saiba mais
      </Link>
    </div>
  );
}
