import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
      <Button href="/painel/previa" variant="secondary">
        Ver como o cliente vê
      </Button>
    );
  }

  return (
    <Button
      href={`/r/${slug}`}
      target="_blank"
      rel="noopener"
      variant="secondary"
      trailing={<ExternalLink aria-hidden="true" className="size-4" />}
    >
      Ver como o cliente vê
    </Button>
  );
}
