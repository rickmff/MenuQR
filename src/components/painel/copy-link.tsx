'use client';

import { useState } from 'react';

/** Copia o endereço público do cardápio para a área de transferência. */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-xl border border-cream-200 bg-white px-4 py-2.5 text-sm font-semibold hover:border-ember-400"
    >
      {copied ? 'Link copiado!' : 'Copiar link'}
    </button>
  );
}
