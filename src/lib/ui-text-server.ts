import 'server-only';
import { getLocale, getTranslations } from 'next-intl/server';
import type { UiText } from './i18n';

/**
 * Versão async de `useUiText`: server component async, `generateMetadata`,
 * server action e rota fora do `[locale]` (aí passe o idioma de
 * `localeFromRequest()`).
 */
export async function getUiText(locale?: string): Promise<UiText> {
  const resolved = locale ?? (await getLocale());
  const t = await getTranslations({ locale: resolved, namespace: 'ui' });
  return { t, locale: resolved };
}
