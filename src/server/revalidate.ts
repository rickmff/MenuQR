import 'server-only';
import { revalidatePath } from 'next/cache';

/**
 * Derruba o cache do cardápio público de um restaurante.
 *
 * A rota `/r/[slug]` é pré-renderizada por `generateStaticParams`, e para essas
 * páginas o caminho concreto (`/r/sabor-e-brasa`) NÃO invalida nada: só o padrão
 * da rota funciona. Sem isso o lojista muda o preço no painel e o cliente
 * continua vendo o antigo por até cinco minutos. Chamamos as duas formas: o
 * padrão cobre o que foi pré-renderizado, o caminho concreto cobre os cardápios
 * que entraram sob demanda.
 */
export function revalidateStore(slug: string) {
  revalidatePath('/painel', 'layout');
  revalidatePath('/r/[slug]', 'layout');
  revalidatePath(`/r/${slug}`, 'layout');
  revalidatePath('/sitemap.xml');
}
