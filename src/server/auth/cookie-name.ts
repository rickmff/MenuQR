/**
 * Nome do cookie de sessão. Fica num módulo sem dependências porque o
 * `proxy.ts` também precisa dele e não pode carregar o resto da autenticação.
 */
export const SESSION_COOKIE = 'menuqr_session';
