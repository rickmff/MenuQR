import 'server-only';
import { cookies, headers } from 'next/headers';
import { hasLocale } from 'next-intl';
import { LOCALE_COOKIE, routing, type Locale } from './routing';

/**
 * Idioma de uma rota que fica fora do `[locale]` (API, imagens de
 * compartilhamento): o cookie do seletor e, sem ele, o `Accept-Language`.
 */
export async function localeFromRequest(): Promise<Locale> {
  const cookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (hasLocale(routing.locales, cookie)) return cookie;
  const accept = (await headers()).get('accept-language') ?? '';
  for (const part of accept.split(',')) {
    const tag = (part.split(';')[0] ?? '').trim().toLowerCase();
    if (tag.startsWith('pt')) return 'pt-BR';
    if (tag.startsWith('en')) return 'en';
  }
  return routing.defaultLocale;
}
