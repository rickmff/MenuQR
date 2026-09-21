import { cn } from '@/lib/cn';

/** Bloco com brilho (utility `skeleton`) no lugar do conteúdo que ainda não chegou. */
export function Skeleton({
  shape = 'rect',
  className,
}: {
  shape?: 'text' | 'rect' | 'circle';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'skeleton block',
        shape === 'circle' ? 'rounded-full' : shape === 'text' ? 'h-4 rounded-xs' : 'rounded-sm',
        className,
      )}
    />
  );
}

/** Mesma geometria da linha de item: texto à esquerda, foto 88px à direita. */
export function ItemRowSkeleton() {
  return (
    <div className="flex items-start gap-3 border-b border-gray-200 py-4">
      <div className="flex-1 space-y-2">
        <Skeleton shape="text" className="w-2/3" />
        <Skeleton shape="text" className="w-full" />
        <Skeleton shape="text" className="w-1/4" />
      </div>
      <Skeleton className="size-[88px] shrink-0" />
    </div>
  );
}

/** Esqueleto da loja inteira: cabeçalho, tabs e quatro linhas de item. */
export function StoreSkeleton() {
  return (
    <div role="status" className="mx-auto w-full max-w-page px-4 py-4">
      <span className="sr-only">Carregando cardápio…</span>
      <div className="flex items-center gap-3">
        <Skeleton shape="circle" className="size-14" />
        <div className="flex-1 space-y-2">
          <Skeleton shape="text" className="h-5 w-1/2" />
          <Skeleton shape="text" className="w-1/3" />
        </div>
      </div>
      <Skeleton className="mt-4 h-16 w-full rounded-md" />
      <div className="mt-6 flex gap-4">
        <Skeleton shape="text" className="w-20" />
        <Skeleton shape="text" className="w-16" />
        <Skeleton shape="text" className="w-24" />
      </div>
      <div className="mt-4">
        <ItemRowSkeleton />
        <ItemRowSkeleton />
        <ItemRowSkeleton />
        <ItemRowSkeleton />
      </div>
    </div>
  );
}
