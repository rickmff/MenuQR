import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import type { UiText } from './i18n';

/**
 * Tradutor do namespace `ui` + idioma, para as funções de texto de `src/lib`.
 * Funciona em client component e em server component síncrono (o
 * `useTranslations` do next-intl serve aos dois). O objeto só muda quando o
 * idioma muda, então pode entrar em dependência de `useMemo`/`useEffect`.
 */
export function useUiText(): UiText {
  const t = useTranslations('ui');
  const locale = useLocale();
  return useMemo(() => ({ t, locale }), [t, locale]);
}
