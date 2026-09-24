'use client';

import { useStore } from '@/components/store/store-provider';
import { Button } from '@/components/ui/button';
import { NavIcon } from '@/components/ui/button-icons';

/** "Sobre a loja" no rodapé (que é server component): abre o mesmo sheet do chevron. */
export function AboutButton() {
  const { openAbout } = useStore();
  return (
    <Button variant="text" size="sm" pill after={<NavIcon className="size-4" />} onClick={openAbout} className="-ml-4">
      Horários, entrega e contato
    </Button>
  );
}
