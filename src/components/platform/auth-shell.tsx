import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Container } from '@/components/ui/container';
import { cn } from '@/lib/cn';

/**
 * Casca das telas de conta em volta do login (esqueci a senha, redefinir a
 * senha): coluna estreita centralizada, título fora do card e o formulário
 * dentro — a mesma leitura de `/entrar`.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  /** Linha solta abaixo do card: o caminho de volta para o login. */
  footer?: ReactNode;
}) {
  return (
    <Container className="flex justify-center py-12 lg:py-20">
      <div className="w-full max-w-md">
        <h1 className="text-h5 font-bold text-gray-700">{title}</h1>
        {description && <p className="mt-2 text-body2 text-gray-600">{description}</p>}
        <Card padding="lg" className="mt-6">
          {children}
        </Card>
        {footer && <p className="mt-6 text-center text-body2 text-gray-600">{footer}</p>}
      </div>
    </Container>
  );
}

/**
 * Tela de resultado, sem formulário: link vencido, e-mail confirmado, recurso
 * que não existe no modo demonstração. Ícone, o que aconteceu e o próximo passo.
 */
export function AuthStatus({
  icon,
  title,
  description,
  action,
}: {
  /** Ícone Lucide de 48px já com a cor do tom: `<MailCheck className="size-12 text-positive" />`. */
  icon: ReactNode;
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Container className="flex justify-center py-12 lg:py-20">
      <Card padding="lg" className="w-full max-w-md text-center">
        <span aria-hidden="true" className="flex justify-center">
          {icon}
        </span>
        <h1 className="mt-4 text-h6 font-bold text-gray-700">{title}</h1>
        <div className="mt-2 space-y-2 text-body2 text-gray-600">{description}</div>
        {action && <div className="mt-6 flex flex-col gap-2">{action}</div>}
      </Card>
    </Container>
  );
}

type NoticeTone = 'info' | 'warning' | 'error' | 'success';

const NOTICE_BACKGROUND: Record<NoticeTone, string> = {
  info: 'bg-info-bg',
  warning: 'bg-warning-bg',
  error: 'bg-error-bg',
  success: 'bg-success-bg',
};

const NOTICE_ICON: Record<NoticeTone, string> = {
  info: 'text-info',
  warning: 'text-warning',
  error: 'text-error',
  success: 'text-success',
};

/**
 * Aviso dentro do card, na receita do `Banner` da skill ifood-design (fundo do
 * tom, ícone na cor cheia, texto cinza). Quando o primitivo existir em
 * `src/components/ui/`, este componente vira um apelido dele.
 */
export function AuthNotice({
  tone,
  role,
  className,
  children,
}: {
  tone: NoticeTone;
  /** `alert` para erro que acabou de acontecer; `status` para confirmação. */
  role?: 'alert' | 'status';
  className?: string;
  children: ReactNode;
}) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'info' ? Info : TriangleAlert;
  return (
    <div
      role={role}
      className={cn('flex gap-3 rounded-sm p-3 text-body2 text-gray-700', NOTICE_BACKGROUND[tone], className)}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-5 shrink-0', NOTICE_ICON[tone])} />
      <div className="min-w-0 space-y-1">{children}</div>
    </div>
  );
}
