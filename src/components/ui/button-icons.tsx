import { ArrowUpRight, ChevronRight } from 'lucide-react';

/**
 * Os dois ícones que acompanham botão e link no sistema (D22).
 *
 * Medido no site do WhatsApp: **nenhum botão deles vem sem ícone, e o ícone
 * está sempre à direita** — nunca à esquerda. E o desenho diz para onde a
 * pessoa vai: o chevron em "Log In" leva a outra tela do mesmo lugar; a seta
 * diagonal em "Help Center" e "For Business" sai do site.
 *
 * Por isso são dois componentes e não um: a distinção é informação, não
 * enfeite. Quem abre em aba nova usa `ExternalIcon`; quem navega dentro do
 * MenuQR usa `NavIcon`. Passe-os em `after`, que é a prop que cola o ícone ao
 * rótulo — `trailing` manda o conteúdo para a outra ponta do botão e é do
 * preço em "Adicionar    R$ 29,90".
 *
 * Ambos são decorativos: o rótulo do botão já diz o destino, e um `target`
 * blank também é anunciado pelo `rel`. Nada de `aria-label` aqui.
 */

/** Navegação dentro do MenuQR. */
export function NavIcon({ className = 'size-5' }: { className?: string }) {
  return <ChevronRight aria-hidden="true" className={className} />;
}

/** Abre fora: outra aba, o WhatsApp, o provedor de cobrança. */
export function ExternalIcon({ className = 'size-4' }: { className?: string }) {
  return <ArrowUpRight aria-hidden="true" className={className} />;
}
