import { defineRouting } from 'next-intl/routing';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

/**
 * Idiomas do sistema. O português é o padrão e o de quem chega sem cookie nem
 * `Accept-Language` que case com um dos dois (o robô do Google, por exemplo).
 *
 * `localePrefix: 'never'`: o endereço não muda com o idioma (`/painel` é
 * `/painel` nos dois). O proxy lê o cookie — ou o navegador, na primeira
 * visita — e reescreve por dentro para `/[locale]/...`, o que mantém as
 * páginas estáticas (landing, cardápio) em cache, uma cópia por idioma.
 */
export const routing = defineRouting({
  locales: ['pt-BR', 'en'],
  defaultLocale: 'pt-BR',
  localePrefix: 'never',
  localeCookie: { name: LOCALE_COOKIE, maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' },
});

export type Locale = (typeof routing.locales)[number];

/** Nome de cada idioma escrito nele mesmo, para o seletor. */
export const LOCALE_LABELS: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
};
