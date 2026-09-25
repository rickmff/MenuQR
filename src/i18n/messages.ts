import type { Locale } from './routing';

/**
 * Um arquivo por área em `messages/<idioma>/`. Cada área usa o próprio
 * namespace (`useTranslations('store')`), e `common` guarda o que se repete
 * em todo lugar (Salvar, Cancelar, Voltar).
 */
const NAMESPACES = ['common', 'ui', 'platform', 'legal', 'auth', 'painel', 'account', 'store', 'demo', 'api'] as const;

export async function loadMessages(locale: Locale) {
  const entries = await Promise.all(
    NAMESPACES.map(async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const),
  );
  return Object.fromEntries(entries);
}
