import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ExternalIcon, NavIcon } from '@/components/ui/button-icons';

/**
 * "Ver como o cliente vê". Publicado, abre o link público em outra aba. Em
 * rascunho esse endereço mostra o aviso de cardápio fora do ar, então o botão
 * leva à prévia do painel — que monta a mesma tela do cardápio público.
 *
 * Um componente só para o painel com banco e o do modo demonstração: foi por
 * estarem separados que o da demonstração ficou sem a checagem e levava a uma
 * página de erro.
 */
export function CustomerViewLink({ slug, published }: { slug: string; published: boolean }) {
  const t = useTranslations('painel');
  if (!published) {
    return (
      <Button href="/painel/previa" variant="secondary" after={<NavIcon />}>
        {t('customerView')}
      </Button>
    );
  }

  return (
    <Button
      href={`/r/${slug}`}
      target="_blank"
      rel="noopener"
      variant="secondary"
      after={<ExternalIcon />}
    >
      {t('customerView')}
    </Button>
  );
}
