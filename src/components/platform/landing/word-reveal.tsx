import type { ReactNode } from 'react';

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
  /**
   * Palavra que recebe o símbolo. Ela NÃO muda de cor: até 2026-09-23
   * "WhatsApp" vinha em verde e era o terceiro verde da primeira dobra,
   * disputando com o botão. O título é grafite inteiro e quem leva a cor é o
   * glifo, que é do tamanho de uma letra (D19).
   */
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
              className="inline-block animate-word-in"
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
