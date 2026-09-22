'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

/** Copia o endereço público do cardápio para a área de transferência. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Sem permissão de área de transferência: o link continua à vista para copiar à mão.
      setCopied(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={copy}
      leading={copied ? <Check className="size-4 text-positive" /> : <Copy className="size-4" />}
    >
      {copied ? 'Link copiado' : 'Copiar link'}
    </Button>
  );
}
