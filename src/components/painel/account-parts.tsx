import { CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';

/**
 * Peças de apresentação da tela "Conta", separadas dos formulários para o modo
 * demonstração montar a mesma tela sem carregar as Server Actions junto.
 */

/** Bloco com título e texto de apoio, como os cards de "Dados do negócio". */
export function AccountSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card as="section">
      <h2 className="text-subtitle font-bold text-gray-700">{title}</h2>
      <p className="mt-1 text-body2 text-gray-600">{description}</p>
      <div className="mt-5 space-y-4">{children}</div>
    </Card>
  );
}

type NoticeTone = 'error' | 'success' | 'info';

const NOTICE_TONES: Record<NoticeTone, { box: string; icon: string; Icon: LucideIcon }> = {
  error: { box: 'bg-error-bg', icon: 'text-error', Icon: TriangleAlert },
  success: { box: 'bg-success-bg', icon: 'text-success', Icon: CircleCheck },
  info: { box: 'bg-info-bg', icon: 'text-info', Icon: Info },
};

const NOTICE_ROLES: Record<NoticeTone, 'alert' | 'status' | undefined> = {
  error: 'alert',
  success: 'status',
  // Aviso fixo da página não é região viva: já está lá quando a tela abre.
  info: undefined,
};

/** Retorno de um formulário (erro, sucesso) ou aviso fixo (info). */
export function Notice({
  tone,
  children,
  className,
}: {
  tone: NoticeTone;
  children: ReactNode;
  className?: string;
}) {
  const { box, icon, Icon } = NOTICE_TONES[tone];
  return (
    <div
      role={NOTICE_ROLES[tone]}
      className={cn('flex gap-3 rounded-sm p-3 text-body2 text-gray-700', box, className)}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', icon)} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
