'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/cn';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  /** Ação que não volta (excluir): vermelha e separada das outras por um divisor. */
  destructive?: boolean;
}

/**
 * Menu de opções de uma linha ou de um card: o "⋯" abre uma lista curta
 * ancorada no botão. Sobre o Radix, que cuida de foco, setas do teclado,
 * Esc, clique fora e de não sair da tela. Visual do sistema: branco, borda
 * fina, raio 8, sombra só porque flutua.
 */
export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const regular = items.filter((item) => !item.destructive);
  const destructive = items.filter((item) => item.destructive);

  const renderItem = (item: MenuItem) => (
    <DropdownMenu.Item
      key={item.label}
      disabled={item.disabled}
      onSelect={item.onSelect}
      className={cn(
        'flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-xs px-3 text-body2 outline-none data-highlighted:bg-gray-50 data-disabled:cursor-default data-disabled:text-gray-400',
        item.destructive ? 'text-error' : 'text-gray-700',
      )}
    >
      {item.icon && (
        <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center">
          {item.icon}
        </span>
      )}
      {item.label}
    </DropdownMenu.Item>
  );

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <IconButton label={label} icon={<MoreHorizontal className="size-5" />} aria-haspopup="menu" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className="z-60 min-w-56 animate-pop-in rounded-sm border border-gray-200 bg-white p-1.5 shadow-high"
        >
          {regular.map(renderItem)}
          {destructive.length > 0 && regular.length > 0 && (
            <DropdownMenu.Separator className="my-1.5 h-px bg-gray-200" />
          )}
          {destructive.map(renderItem)}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
