import Link from 'next/link';

/** Aviso permanente: no modo demonstração nada sai do navegador. */
export function DemoBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-flame-200 bg-flame-50 px-4 text-flame-700 ${
        compact ? 'py-2 text-xs' : 'py-3 text-sm'
      }`}
    >
      <span className="font-semibold">
        <span aria-hidden="true">🧪</span> Modo demonstração
      </span>
      <span className="hidden text-ink-700 sm:inline">
        Conta e cardápio ficam salvos só neste navegador — nada vai para um servidor.
      </span>
      <Link href="/#planos" className="ml-auto shrink-0 font-semibold underline underline-offset-2">
        Saiba mais
      </Link>
    </div>
  );
}
