import Link from 'next/link';

/**
 * "Ver como o cliente vê". Publicado, abre o link público em outra aba. Em
 * rascunho esse endereço responde 404 de propósito, então o botão leva à prévia
 * do painel — que monta a mesma tela do cardápio público.
 *
 * Um componente só para o painel com banco e o do modo demonstração: foi por
 * estarem separados que o da demonstração ficou sem a checagem e levava ao 404.
 */
export function CustomerViewLink({ slug, published }: { slug: string; published: boolean }) {
  if (!published) {
    return (
      <Link href="/painel/previa" className="btn btn-sm btn-outline">
        Ver como o cliente vê
      </Link>
    );
  }

  return (
    <Link href={`/r/${slug}`} target="_blank" rel="noopener" className="btn btn-sm btn-outline">
      Ver como o cliente vê ↗
    </Link>
  );
}
