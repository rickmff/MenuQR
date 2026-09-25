import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

/** Bloco com brilho (utility `skeleton`) no lugar do conteúdo que ainda não chegou. */
export function Skeleton({
  shape = 'rect',
  className,
}: {
  /** bare: sem altura nem raio — quem chama define os dois (evita classes concorrentes). */
  shape?: 'text' | 'rect' | 'circle' | 'bare';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'skeleton block',
        shape === 'circle' ? 'rounded-full' : shape === 'text' ? 'h-4 rounded-xs' : shape === 'rect' ? 'rounded-sm' : '',
        className,
      )}
    />
  );
}

/** Mesma geometria da linha de item: texto à esquerda, foto de 112px e cantos 16 à direita. */
export function ItemRowSkeleton() {
  return (
    <div className="flex items-start gap-4 py-4">
      <div className="flex-1 space-y-2 pt-1">
        <Skeleton shape="bare" className="h-5 rounded-xs w-2/3" />
        <Skeleton shape="text" className="w-full" />
        <Skeleton shape="text" className="mt-3 w-1/4" />
      </div>
      <Skeleton shape="bare" className="size-28 shrink-0 rounded-lg" />
    </div>
  );
}

/**
 * Esqueleto da loja no desenho novo: capa, logo quadrado sobreposto, nome,
 * status, Entrega | Retirada, as duas células de informação, as abas e quatro
 * linhas. Serve ao modo demo enquanto ele lê o cardápio do navegador (as rotas
 * com banco não têm `loading.tsx`: a página chega pronta do ISR).
 */
export function StoreSkeleton() {
  const t = useTranslations('ui.skeleton');
  return (
    <div role="status" className="w-full">
      <span className="sr-only">{t('loadingMenu')}</span>
      <Skeleton shape="bare" className="h-60 w-full rounded-none lg:h-80" />
      <div className="relative -mt-6 rounded-t-xl bg-white lg:rounded-none">
        <div className="mx-auto w-full max-w-page px-4 pb-6 md:px-6 lg:px-8">
          <Skeleton shape="bare" className="-mt-8 size-16 rounded-lg border-[3px] border-white" />
          <Skeleton shape="bare" className="mt-3 h-7 rounded-xs w-1/2" />
          <Skeleton shape="bare" className="mt-2 h-5 rounded-xs w-1/3" />
          <Skeleton shape="bare" className="mx-auto mt-5 h-12 w-48 rounded-full" />
          <div className="mt-6 grid grid-cols-2 gap-4">
            {[0, 1].map((cell) => (
              <div key={cell} className="flex items-center gap-3">
                <Skeleton shape="circle" className="size-8 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton shape="text" className="w-3/4" />
                  <Skeleton shape="bare" className="h-3 rounded-xs w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex gap-6 border-b border-gray-200 pb-3">
            <Skeleton shape="bare" className="h-5 rounded-xs w-24" />
            <Skeleton shape="bare" className="h-5 rounded-xs w-16" />
            <Skeleton shape="bare" className="h-5 rounded-xs w-20" />
          </div>
          <Skeleton shape="bare" className="mt-8 h-6 rounded-xs w-1/2" />
          <div className="mt-2">
            <ItemRowSkeleton />
            <ItemRowSkeleton />
            <ItemRowSkeleton />
            <ItemRowSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Esqueleto da página do prato: foto, título, preço, dois grupos de opções e o CTA. */
export function ItemSkeleton() {
  const t = useTranslations('ui.skeleton');
  return (
    <div role="status" className="w-full lg:mx-auto lg:max-w-narrow lg:py-10">
      <span className="sr-only">{t('loadingItem')}</span>
      <Skeleton shape="bare" className="h-72 w-full rounded-none lg:rounded-t-lg" />
      <div className="px-4 pb-32 pt-6">
        <Skeleton shape="bare" className="h-8 rounded-xs w-2/3" />
        <Skeleton shape="text" className="mt-3 w-full" />
        <Skeleton shape="bare" className="mt-4 h-6 rounded-xs w-24" />
        {[0, 1].map((group) => (
          <div key={group} className="mt-8">
            <Skeleton shape="bare" className="h-6 rounded-xs w-1/2" />
            <Skeleton shape="bare" className="mt-2 h-3 rounded-xs w-1/3" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center justify-between py-4">
                <Skeleton shape="text" className="w-1/3" />
                <Skeleton shape="circle" className="size-6" />
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="fixed inset-x-0 bottom-0 px-4 pb-safe-4 pt-3 lg:static">
        <Skeleton shape="bare" className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
