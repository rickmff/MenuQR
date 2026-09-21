/**
 * Nome do cookie de sessão. Fica num módulo sem dependências porque o
 * `proxy.ts` também precisa dele e não pode carregar o resto da autenticação.
 */
export const SESSION_COOKIE = 'menuqr_session';

/**
 * Dica de "tem alguém logado", legível pelo JavaScript da página.
 *
 * O cookie de sessão é `httpOnly`, e a página inicial é estática: sem isto o
 * cabeçalho não tem como saber que deve oferecer "Ir para o painel" em vez de
 * "Entrar". O valor é sempre `1` — não identifica ninguém e não autoriza nada.
 * Quem decide o acesso continua sendo o cookie de sessão, conferido no servidor;
 * com a dica velha (sessão vencida ou encerrada em outro aparelho), o clique em
 * "Ir para o painel" cai no login como qualquer acesso sem sessão.
 *
 * Mora aqui pelo mesmo motivo do nome acima: o cabeçalho é componente de cliente
 * e só pode importar um módulo sem dependências de servidor.
 */
export const LOGGED_HINT_COOKIE = 'menuqr_logged';
