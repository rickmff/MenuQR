/**
 * Frase que o lojista digita para confirmar a exclusão da conta. Mora aqui, e
 * não na Server Action, porque arquivo `'use server'` só exporta função
 * assíncrona — e a tela e o servidor precisam comparar com o mesmo texto.
 */
export const DELETE_ACCOUNT_PHRASE = 'excluir minha conta';

/**
 * Tolerante a maiúsculas e espaços sobrando: o teclado do celular capitaliza a
 * primeira letra sozinho, e a frase existe para provar intenção, não digitação.
 */
export function matchesDeleteAccountPhrase(value: string): boolean {
  return value.trim().replace(/\s+/g, ' ').toLowerCase() === DELETE_ACCOUNT_PHRASE;
}
