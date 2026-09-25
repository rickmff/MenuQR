'use client';

import { Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/**
 * Copia o endereço público do cardápio para a área de transferência. O rótulo
 * troca para "Link copiado" e o toast diz o mesmo: é a região viva dele que faz
 * o leitor de tela anunciar — a troca do rótulo sozinha passa em silêncio.
 */
export function CopyLink({ url }: { url: string }) {
  const t = useTranslations('painel.copyLink');
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ message: t('copied'), tone: 'success' });
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Sem permissão de área de transferência: o link continua à vista para copiar à mão.
      setCopied(false);
      toast({ message: t('failed'), tone: 'error' });
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={copy}
      leading={copied ? <Check className="size-4 text-positive" /> : <Copy className="size-4" />}
    >
      {copied ? t('copied') : t('copy')}
    </Button>
  );
}
