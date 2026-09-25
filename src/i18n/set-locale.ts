'use server';

import { cookies } from 'next/headers';
import { hasLocale } from 'next-intl';
import { LOCALE_COOKIE, routing } from './routing';

/** Grava o idioma escolhido no seletor; quem chama dá o `router.refresh()`. */
export async function setLocale(locale: string) {
  if (!hasLocale(routing.locales, locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}
