import type { SVGProps } from 'react';

/**
 * Ilustrações da landing: linha só, `currentColor`, sem preenchimento — o
 * mesmo traço do rabisco do papel de parede (public/landing/doodle.svg), só
 * que em primeiro plano. Cada uma diz uma coisa; nenhuma é decoração solta.
 */
type Props = SVGProps<SVGSVGElement>;

function Line({ children, viewBox = '0 0 24 24', ...props }: Props) {
  return (
    <svg
      viewBox={viewBox}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

/* ------------------------------------------------ ícones das capacidades */

export const capabilityIcons = {
  Complementos: (props: Props) => (
    <Line {...props}>
      <path d="M4 7h10M4 12h7M4 17h9M17 4v6M14 7h6" />
    </Line>
  ),
  Entrega: (props: Props) => (
    <Line {...props}>
      <path d="M3 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM17 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0zM7 17h8l3-6h3M13 11h-3l-2 6M15 11V8h3" />
    </Line>
  ),
  Retirada: (props: Props) => (
    <Line {...props}>
      <path d="M6 8h12l1 12H5zM9 8V6a3 3 0 0 1 6 0v2" />
    </Line>
  ),
  Horário: (props: Props) => (
    <Line {...props}>
      <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2" />
    </Line>
  ),
  Cardápio: (props: Props) => (
    <Line {...props}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h4" />
    </Line>
  ),
  Divulgação: (props: Props) => (
    <Line {...props}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM16 18h2v2h-2z" />
    </Line>
  ),
} as const;

export type CapabilityLabel = keyof typeof capabilityIcons;

/* ------------------------------------------------------- cenas maiores */

/** O QR na mesa: cavalete de papel com o código e o nome da loja. */
export function TableTentIllustration(props: Props) {
  return (
    <Line viewBox="0 0 160 140" strokeWidth={1.75} {...props}>
      <path d="M40 124 80 16l40 108zM24 124h112" />
      <path d="M64 60h8v8h-8zM88 60h8v8h-8zM64 84h8v8h-8zM88 84h3v3h-3zM93 89h3v3h-3zM88 92h3v3h-3z" />
      <path d="M66 108h28" />
    </Line>
  );
}
