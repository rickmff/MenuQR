import { cn } from '@/lib/cn';

/**
 * Título que entra palavra por palavra, cada uma subindo de dentro de uma
 * máscara. É CSS puro (`animate-word-in`): começa no primeiro paint, sem esperar
 * hidratação, e com movimento reduzido a regra global do tema o desliga.
 */
export function WordReveal({
  text,
  accent,
  className,
}: {
  text: string;
  /** Palavra que ganha a cor de destaque. */
  accent?: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {text.split(' ').map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block overflow-hidden align-bottom">
          <span
            className={cn('inline-block animate-word-in', word === accent && 'text-primary')}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            {word}
          </span>
          {index < text.split(' ').length - 1 && ' '}
        </span>
      ))}
    </span>
  );
}
