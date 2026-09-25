'use client';

import { useRef, type ReactNode } from 'react';
import { ScrollRootContext } from '@/components/store/scroll-root';

/**
 * O "aparelho" da prévia do painel: uma moldura de altura fixa que rola por
 * dentro. O `transform` faz dela o bloco de contenção dos elementos `fixed` da
 * loja — barra do topo, barra da sacola, CTA do prato ficam presos à moldura,
 * como na tela de um celular, em vez de cobrir o painel. A área segura vale
 * zero aqui (a moldura não encosta no notch), a altura de "tela" é a da
 * moldura (`--screen-height`) e a loja lê a rolagem dela pelo
 * `ScrollRootContext`.
 */
export function EmbeddedShell({ children }: { children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <ScrollRootContext.Provider value={scrollRef}>
      <div className="relative h-(--screen-height) transform-gpu overflow-hidden rounded-md border border-gray-200 bg-white [--safe-bottom:0px] [--safe-top:0px] [--screen-height:min(80dvh,56rem)] [--top-inset:var(--top-bar-height)]">
        <div ref={scrollRef} className="h-full overflow-y-auto overscroll-contain">
          <div className="flex min-h-full flex-col">{children}</div>
        </div>
      </div>
    </ScrollRootContext.Provider>
  );
}
