/**
 * O "link do cardápio" (`/r/<slug>`) e os endereços de categoria e prato.
 *
 * Um módulo só para o navegador e o servidor: o cadastro deriva o link do nome
 * enquanto a pessoa digita, a aba Identidade formata o que ela escreve, e o
 * servidor normaliza de novo antes de gravar — os três precisam chegar ao
 * mesmo resultado.
 */

export const SLUG_MAX = 40;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
}

/**
 * O link pronto: sem hífen nas pontas e com no máximo `max` caracteres. Nome
 * comprido é cortado no último hífen que cabe, nunca no meio de uma palavra
 * ("cantina-da-nonna-racao-e-cia-comercio-de-alime" virava link impresso).
 */
export function slugify(value: string, max = SLUG_MAX): string {
  const full = normalize(value).replace(/^-+|-+$/g, '');
  if (full.length <= max) return full;
  const window = full.slice(0, max + 1);
  const hyphen = window.lastIndexOf('-');
  const cut = hyphen > 0 ? window.slice(0, hyphen) : full.slice(0, max);
  return cut.replace(/-+$/g, '');
}

/**
 * Enquanto a pessoa digita no campo do link: o mesmo formato, mas o hífen do
 * fim fica. Tirado a cada tecla, ele sumia antes da palavra seguinte e
 * "cantina da nona" digitado virava "cantinadanona". O `slugify` completo roda
 * ao sair do campo e no servidor.
 */
export function slugifyTyping(value: string, max = SLUG_MAX): string {
  return normalize(value).replace(/^-+/g, '').replace(/-{2,}/g, '-').slice(0, max);
}
