'use client';

import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShareButton } from '@/components/share-button';
import { useStore } from '@/components/store/store-provider';
import { useShareUrl } from '@/components/store/use-share-url';
import { Avatar } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/cn';

/** App bar do cardápio: a loja à esquerda, compartilhar e sacola à direita. */
export function StoreHeader() {
  const { business, menu, basePath, itemCount, openCart } = useStore();
  // Sem banco, o link tem de levar o cardápio junto: quem recebeu e repassa
  // manda um link que abre, e não um endereço vazio.
  const share = useShareUrl(business, menu);
  // Na página do item, no celular, quem ocupa o topo é a foto (e a app bar do item ao rolar).
  const onItemPage = usePathname().includes('/item/');

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b border-gray-200 bg-white pt-safe',
        onItemPage && 'hidden lg:block',
      )}
    >
      <div className="mx-auto flex h-14 w-full max-w-page items-center gap-3 px-4 lg:px-8">
        <Link href={basePath} className="press flex min-w-0 items-center gap-3 rounded-sm">
          <Avatar logo={business.logo} name={business.name} size={40} />
          <span className="truncate text-body1 font-semibold text-gray-700">{business.name}</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <ShareButton
            url={share.url}
            title={business.name}
            text={`Confira o cardápio do ${business.name} e peça pelo WhatsApp`}
          />
          <IconButton
            label={itemCount > 0 ? `Abrir sacola com ${itemCount} itens` : 'Abrir sacola vazia'}
            icon={<ShoppingBag className="size-6" />}
            badge={itemCount}
            onClick={() => openCart('cart')}
          />
        </div>
      </div>
    </header>
  );
}
