import { ViewTransition, type ReactNode } from 'react';

/**
 * Tipos de navegação da loja, como a troca de tela num app:
 * - `nav-forward`: do cardápio para o prato (o `Link` do `ItemCard` leva o tipo);
 * - `nav-back`: do prato de volta ao cardápio quando a pessoa chegou direto
 *   pelo link (`router.replace` do `useBackToMenu`).
 *
 * O voltar do sistema e o `router.back()` não levam tipo (o Next os roda num
 * `popstate`, fora do nosso alcance): a tela troca seca, como o voltar do
 * navegador — e no iOS o gesto de voltar já traz a animação dele.
 */
export const NAV_FORWARD = 'nav-forward';
export const NAV_BACK = 'nav-back';

const ENTER = { [NAV_FORWARD]: 'vt-push-in', [NAV_BACK]: 'vt-pop-in', default: 'none' };
const EXIT = { [NAV_FORWARD]: 'vt-push-out', [NAV_BACK]: 'vt-pop-out', default: 'none' };

/**
 * Uma tela da loja (cardápio ou prato). Fica em volta do conteúdo de cada
 * PÁGINA, não do layout: o layout sobrevive à troca de rota, e entrada e saída
 * nunca aconteceriam nele. `default="none"`: a busca (`useDeferredValue`) e o
 * `router.refresh()` também são transições, e não podem animar a tela.
 */
export function StoreScreen({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={ENTER} exit={EXIT} default="none">
      {children}
    </ViewTransition>
  );
}
