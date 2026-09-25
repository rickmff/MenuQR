import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { loadMessages } from './messages';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: await loadMessages(locale),
    // Os preços são sempre em reais: o cardápio é de um restaurante no Brasil,
    // em qualquer idioma que o cliente leia.
    formats: { number: { brl: { style: 'currency', currency: 'BRL' } } },
    timeZone: 'America/Sao_Paulo',
  };
});
