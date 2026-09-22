import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * A coluna de conteúdo de uma tela do painel.
 *
 * Existem duas larguras, e só duas: `wide` (64rem) para as telas de leitura e
 * de lista — compartilhar, cardápio, prévia — e `form` (48rem) para as telas
 * que são um formulário, onde a linha de texto curta é o que ajuda a ler. Os
 * valores moram em `--container-panel*`, no globals.css.
 *
 * O `space-y-6` é o outro motivo de o componente existir: o respiro entre os
 * blocos de uma tela do painel é sempre 24px, então nenhuma página precisa
 * decidir de novo entre `mt-6` e `mt-8`.
 *
 * A coluna é alinhada à esquerda, não centralizada: assim as duas larguras
 * começam na mesma vertical do logo e das abas, e trocar de aba não desloca o
 * conteúdo de lado.
 */

type PanelWidth = 'wide' | 'form';

const WIDTHS: Record<PanelWidth, string> = {
  wide: 'max-w-panel',
  form: 'max-w-panel-form',
};

/** Respiro vertical entre a casca do painel e o conteúdo. */
export const PANEL_GUTTER = 'py-6 lg:py-10';

export function PanelPage({
  width = 'wide',
  className,
  children,
}: {
  width?: PanelWidth;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('w-full space-y-6', WIDTHS[width], className)}>{children}</div>
  );
}

/**
 * O cabeçalho de uma tela do painel: um `h1`, uma linha de apoio e, à direita,
 * a ação daquela tela (publicar, ver como o cliente vê). Mesma tipografia em
 * todas as abas — era aqui que cada tela inventava um peso e uma cor.
 */
export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-h4 font-bold text-gray-700">{title}</h1>
        {description && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-body2 text-gray-600">
            {description}
          </p>
        )}
      </div>
      {actions}
    </header>
  );
}
