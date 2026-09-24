'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';

/**
 * Pergunta antes de uma ação que não volta ("Limpar sacola?"): um sheet baixo
 * com dois botões. Substitui o `window.confirm`, que não segue o tema nem o
 * idioma da página.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  lockScroll,
  appearance = 'panel',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Desligue quando outro sheet (ou o StoreProvider) já trava a rolagem. */
  lockScroll?: boolean;
  /** store: telas do cliente — fechar à esquerda e botões em pílula. */
  appearance?: 'panel' | 'store';
}) {
  const store = appearance === 'store';
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={title}
      lockScroll={lockScroll}
      closeSide={store ? 'start' : 'end'}
      footer={
        <div className="flex gap-3">
          <Button variant="text" size={store ? 'cta' : 'md'} pill={store} className="flex-1" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            size={store ? 'cta' : 'md'}
            pill={store}
            className="flex-1"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      {description && <p className="px-4 pb-4 text-body2 text-gray-600">{description}</p>}
    </BottomSheet>
  );
}
