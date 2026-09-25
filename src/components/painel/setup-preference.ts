/**
 * O formato da preferência "guia aberto ou recolhido" (ver `setup-collapsed.ts`),
 * sem nada de React: o layout do painel, que roda no servidor, lê o cookie com
 * isto, e o `setup-collapsed.ts` (só do navegador) grava com isto.
 */
export type SetupPreference = 'open' | 'collapsed' | null;

/** O nome da chave no localStorage e do cookie. */
export const setupPreferenceKey = (businessId: string) => `menuqr.setup.${businessId}`;

/** O que fica gravado. `'1'` era o único valor antes de existir o "aberto de propósito". */
export const SETUP_PREFERENCE_STORED: Record<Exclude<SetupPreference, null>, string> = {
  collapsed: '1',
  open: '0',
};

/** O valor gravado (localStorage ou cookie) lido como preferência. */
export function parseSetupPreference(stored: string | undefined | null): SetupPreference {
  if (stored === SETUP_PREFERENCE_STORED.collapsed) return 'collapsed';
  if (stored === SETUP_PREFERENCE_STORED.open) return 'open';
  return null;
}
