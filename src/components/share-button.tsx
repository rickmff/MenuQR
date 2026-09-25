'use client';

import { Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button, buttonClass } from '@/components/ui/button';
import { fieldClass } from '@/components/ui/text-field';
import { cn } from '@/lib/cn';

interface ShareTarget {
  /** Nome de marca, igual nos dois idiomas; o e-mail é traduzido na hora de mostrar. */
  label: string;
  icon: string;
  href: (url: string, text: string) => string;
}

/** Alternativas usadas quando o compartilhamento nativo não está disponível. */
const TARGETS: ShareTarget[] = [
  {
    label: 'WhatsApp',
    icon: '💬',
    href: (url, text) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  },
  {
    label: 'Telegram',
    icon: '✈️',
    href: (url, text) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    label: 'Facebook',
    icon: '📘',
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    label: 'E-mail',
    icon: '✉️',
    href: (url, text) =>
      `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(`${text}\n${url}`)}`,
  },
];

/**
 * Compartilha o cardápio. Usa a folha nativa do sistema (Web Share API), que é
 * o único caminho que funciona com o site instalado como aplicativo, onde não
 * há barra de endereço para copiar o link. Sem suporte nativo — desktop, por
 * exemplo — abre um menu próprio com as opções de sempre.
 */
export function ShareButton({
  url,
  title,
  text,
  className,
  variant = 'icon',
  closeSide = 'end',
}: {
  url: string;
  title: string;
  text: string;
  className?: string;
  variant?: 'icon' | 'button';
  /** Lado do fechar (o X) do menu alternativo. Na loja, à esquerda, como as outras telas do cliente. */
  closeSide?: 'start' | 'end';
}) {
  const t = useTranslations('ui.share');
  const tCommon = useTranslations('common');
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(url);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Instalado como aplicativo (ou em domínio de prévia), a origem real pode ser
   * diferente da configurada no build — então o link sai da janela atual.
   */
  const resolveUrl = (): string => {
    if (typeof window === 'undefined') return url;
    try {
      const current = new URL(url, window.location.origin);
      // O fragmento vai junto: no modo demonstração é ele que carrega o cardápio.
      return `${window.location.origin}${current.pathname}${current.search}${current.hash}`;
    } catch {
      return url;
    }
  };

  const share = async () => {
    const target = resolveUrl();
    setShareUrl(target);
    const payload = { title, text, url: target };

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        // Cancelar no menu do sistema não é erro: não abre o menu alternativo.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Sem permissão de área de transferência: seleciona para copiar à mão.
      inputRef.current?.select();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={share}
        aria-label={variant === 'icon' ? t('shareTitle', { title }) : undefined}
        className={cn(
          variant === 'icon'
            ? 'press grid size-10 cursor-pointer place-items-center rounded-full text-gray-700 hover:bg-gray-50 active:bg-gray-100'
            : buttonClass({ variant: 'secondary', size: 'sm' }),
          className,
        )}
      >
        <Share2 aria-hidden="true" className={variant === 'icon' ? 'size-5' : 'size-4'} />
        {variant === 'button' && tCommon('share')}
      </button>

      {/* O <dialog> do BottomSheet sobe para a camada do topo: nada de portal
          nem de z-index, e o Esc e o voltar do Android fecham só ele. */}
      <BottomSheet open={open} onClose={() => setOpen(false)} title={tCommon('share')} closeSide={closeSide}>
        <div className="px-4 pb-6">
          <p className="text-body2 text-gray-600">{title}</p>

          <ul className="mt-5 grid grid-cols-4 gap-2">
            {TARGETS.map((target) => (
              <li key={target.label}>
                <a
                  href={target.href(shareUrl, text)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="press flex flex-col items-center gap-2 rounded-md py-2 text-caption font-medium text-gray-700 hover:bg-gray-50"
                >
                  <span aria-hidden="true" className="grid size-14 place-items-center rounded-full bg-gray-100 text-h5">
                    {target.icon}
                  </span>
                  {target.label === 'E-mail' ? t('email') : target.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <label htmlFor="share-url" className="text-body2 font-medium text-gray-700">
              {t('menuLink')}
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="share-url"
                ref={inputRef}
                readOnly
                value={shareUrl}
                onFocus={(event) => event.target.select()}
                className={fieldClass(false, 'h-12 min-w-0 flex-1 font-mono text-body2', 'soft')}
              />
              <Button type="button" variant="secondary" size="md" pill onClick={copy} className="shrink-0 cursor-pointer">
                {copied ? tCommon('copied') : tCommon('copy')}
              </Button>
            </div>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
