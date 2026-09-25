import { createTranslator, hasLocale } from 'next-intl';
import { routing, type Locale } from '@/i18n/routing';
import enLegal from '../../messages/en/legal.json';
import enPlatform from '../../messages/en/platform.json';
import ptLegal from '../../messages/pt-BR/legal.json';
import ptPlatform from '../../messages/pt-BR/platform.json';
import { platform } from './platform';

/**
 * Textos da plataforma fora de um componente: `seo.ts`, o manifesto, o
 * `llms.txt` e a imagem de compartilhamento. É o mesmo arquivo de mensagens
 * que a UI lê, sem depender da requisição — quem chama diz o idioma, e sem
 * idioma vale o padrão (pt-BR).
 *
 * Fica fora de `platform.ts` porque aquele módulo vai para o navegador
 * (logo, cabeçalho) e não precisa levar as mensagens junto.
 */
const MESSAGES = {
  'pt-BR': { platform: ptPlatform, legal: ptLegal },
  en: { platform: enPlatform, legal: enLegal },
} satisfies Record<Locale, unknown>;

export function resolveLocale(locale?: string): Locale {
  return hasLocale(routing.locales, locale) ? locale : routing.defaultLocale;
}

export function platformText(locale?: string) {
  const resolved = resolveLocale(locale);
  return createTranslator({ locale: resolved, messages: MESSAGES[resolved], namespace: 'platform' });
}

export function legalText(locale?: string) {
  const resolved = resolveLocale(locale);
  return createTranslator({ locale: resolved, messages: MESSAGES[resolved], namespace: 'legal' });
}

/** "Menu Online — Cardápio digital com pedidos no WhatsApp", no idioma pedido. */
export function platformTitle(locale?: string): string {
  const t = platformText(locale);
  return t('meta.defaultTitle', { name: platform.name, tagline: t('tagline') });
}

/** `og:locale` pede idioma e país: `pt_BR`, `en_US`. */
export function ogLocale(locale?: string): string {
  return resolveLocale(locale) === 'en' ? 'en_US' : 'pt_BR';
}
