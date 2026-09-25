import type { Locale } from '@/i18n/routing';

/**
 * Frase que o lojista digita para confirmar a exclusão da conta, uma por
 * idioma. Mora aqui, e não na Server Action, porque arquivo `'use server'` só
 * exporta função assíncrona — e a tela e o servidor precisam comparar com o
 * mesmo texto.
 */
const DELETE_ACCOUNT_PHRASES: Record<Locale, string> = {
  'pt-BR': 'excluir minha conta',
  en: 'delete my account',
};

export function deleteAccountPhrase(locale: string): string {
  return DELETE_ACCOUNT_PHRASES[locale as Locale] ?? DELETE_ACCOUNT_PHRASES['pt-BR'];
}

/**
 * Tolerante a maiúsculas e espaços sobrando: o teclado do celular capitaliza a
 * primeira letra sozinho, e a frase existe para provar intenção, não digitação.
 * Vale a frase de qualquer idioma: quem trocou de idioma com a tela aberta não
 * deve ficar preso.
 */
export function matchesDeleteAccountPhrase(value: string): boolean {
  const typed = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return Object.values(DELETE_ACCOUNT_PHRASES).includes(typed);
}
