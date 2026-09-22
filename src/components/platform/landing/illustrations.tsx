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

/** Um celular com a conversa: pedido enviado, dois tiques, resposta da loja. */
export function PhoneChatIllustration(props: Props) {
  return (
    <Line viewBox="0 0 160 220" strokeWidth={1.75} {...props}>
      {/* aparelho */}
      <rect x="20" y="8" width="120" height="204" rx="18" />
      <path d="M64 8h32v6a4 4 0 0 1-4 4H68a4 4 0 0 1-4-4z" />
      {/* balão do cliente (direita) */}
      <path d="M52 52h72a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H62l-8 6v-6h-2a6 6 0 0 1-6-6V58a6 6 0 0 1 6-6z" />
      <path d="M58 64h50M58 74h38M58 84h44" />
      {/* tiques */}
      <path d="M108 88l3 3 5-5M113 88l3 3 5-5" />
      {/* balão da loja (esquerda) */}
      <path d="M36 118h60a6 6 0 0 1 6 6v18a6 6 0 0 1-6 6H44v6l-8-6a6 6 0 0 1-6-6v-18a6 6 0 0 1 6-6z" />
      <path d="M42 130h44M42 140h30" />
      {/* barra de digitar */}
      <rect x="30" y="176" width="86" height="20" rx="10" />
      <path d="M124 186a8 8 0 1 0 16 0 8 8 0 0 0-16 0zM128 186h8M132 182l4 4-4 4" />
    </Line>
  );
}

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
