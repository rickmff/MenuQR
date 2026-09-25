'use client';

import { ChevronLeft, SearchX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, type ReactNode } from 'react';
import { useStore } from '@/components/store/store-provider';
import { useBackToMenu } from '@/components/store/use-back-to-menu';
import { useStoreRoute } from '@/components/store/use-store-route';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/cn';

/**
 * Tela cheia de aviso dentro da casca da loja — prato que não existe mais,
 * erro ao carregar. Mantém o "‹" no topo esquerdo, como toda tela do app, e
 * uma ação para seguir.
 */
export function StoreMessage({
  title,
  description,
  icon = <SearchX className="size-10" />,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  const t = useTranslations('store');
  const { basePath, setCompactHeader } = useStore();
  const { back } = useBackToMenu();
  const onItem = useStoreRoute().view === 'item';

  // Na rota do cardápio (erro ao carregar) o topo é o da loja, que ali está
  // visível: ele vira a barra branca com o nome, e esta tela não desenha um
  // segundo "‹" por baixo dele. Na rota do prato o topo da loja some no
  // celular, e a barra é esta.
  useEffect(() => {
    if (onItem) return;
    setCompactHeader(true);
    return () => setCompactHeader(false);
  }, [onItem, setCompactHeader]);

  return (
    <div className={cn('flex min-h-[70dvh] flex-col', !onItem && 'pt-(--top-inset)')}>
      {onItem && (
        <div className="sticky top-0 z-40 bg-white pt-safe lg:hidden">
          <div className="flex h-14 items-center px-2">
            <IconButton
              label={t('backToMenu')}
              icon={<ChevronLeft className="size-6" />}
              size="lg"
              onClick={back}
              className="cursor-pointer"
            />
          </div>
        </div>
      )}
      <div className={cn('flex flex-1 items-center justify-center', onItem && 'lg:pt-(--top-inset)')}>
        <EmptyState
          variant="hero"
          icon={icon}
          title={title}
          description={description}
          action={
            action ?? (
              <Button href={basePath} variant="secondary" size="cta" pill after={<NavIcon />}>
                {t('message.seeMenu')}
              </Button>
            )
          }
        />
      </div>
    </div>
  );
}

/** O prato não existe (mais) neste cardápio. */
export function ItemMissing() {
  const t = useTranslations('store.message');
  return (
    <StoreMessage
      title={t('itemMissingTitle')}
      description={t('itemMissingDescription')}
    />
  );
}
