import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Título que entra palavra por palavra, cada uma subindo de dentro de uma
 * máscara. É CSS puro (`animate-word-in`): começa no primeiro paint, sem esperar
 * hidratação, e com movimento reduzido a regra global do tema o desliga.
 */
export function WordReveal({
  text,
  accent,
  accentIcon,
  className,
}: {
  text: string;
  /** Palavra que ganha a cor de destaque. */
  accent?: string;
  /** Símbolo colado à palavra de destaque, dentro da mesma máscara: sobe junto com ela. */
  accentIcon?: ReactNode;
  className?: string;
}) {
  return (
    <span className={className}>
      {text.split(' ').map((word, index) => (
        // O espaço fica FORA da máscara: dentro de um inline-block ele é descartado.
        <span key={`${word}-${index}`}>
          <span className="inline-block overflow-hidden align-bottom">
            <span
              className={cn('inline-block animate-word-in', word === accent && 'text-primary')}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {word}
              {word === accent && accentIcon}
            </span>
          </span>{' '}
        </span>
      ))}
    </span>
  );
}
