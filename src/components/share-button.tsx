'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

interface ShareTarget {
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
}: {
  url: string;
  title: string;
  text: string;
  className?: string;
  variant?: 'icon' | 'button';
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(url);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  /**
   * Instalado como aplicativo (ou em domínio de prévia), a origem real pode ser
   * diferente da configurada no build — então o link sai da janela atual.
   */
  const resolveUrl = (): string => {
    if (typeof window === 'undefined') return url;
    try {
      const current = new URL(url, window.location.origin);
      return `${window.location.origin}${current.pathname}${current.search}`;
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
        className={cn(
          variant === 'icon'
            ? 'grid size-10 place-items-center rounded-xl border border-ink-200 bg-white text-ink-950 transition-colors hover:border-(--tenant-brand-ink)'
            : 'btn btn-sm btn-outline',
          className,
        )}
      >
        <span aria-hidden="true">{variant === 'icon' ? '↗' : '↗ Compartilhar'}</span>
        <span className="sr-only">Compartilhar {title}</span>
      </button>

      {/*
        O menu é levado para o body: dentro do cabeçalho ele herdaria o bloco de
        contenção criado pelo backdrop-blur e ficaria preso na faixa do topo.
      */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-90 flex items-end justify-center bg-ink-950/55 sm:items-center"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              ref={dialogRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Compartilhar cardápio"
              className="w-full max-w-md rounded-t-[1.75rem] bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lift outline-none sm:rounded-[1.75rem] sm:pb-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">Compartilhar</h2>
                  <p className="mt-0.5 text-sm text-ink-500">{title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-700"
                >
                  <span aria-hidden="true">✕</span>
                  <span className="sr-only">Fechar</span>
                </button>
              </div>

              <ul className="mt-6 grid grid-cols-4 gap-3">
                {TARGETS.map((target) => (
                  <li key={target.label}>
                    <a
                      href={target.href(shareUrl, text)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpen(false)}
                      className="flex flex-col items-center gap-2 rounded-2xl border border-ink-200 px-2 py-3 text-xs font-medium transition-colors hover:border-(--tenant-brand-ink)"
                    >
                      <span aria-hidden="true" className="text-2xl">
                        {target.icon}
                      </span>
                      {target.label}
                    </a>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <label htmlFor="share-url" className="text-xs font-semibold text-ink-500">
                  Link do cardápio
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="share-url"
                    ref={inputRef}
                    readOnly
                    value={shareUrl}
                    onFocus={(event) => event.target.select()}
                    className="field-input flex-1 py-2.5 font-mono text-sm"
                  />
                  <button type="button" onClick={copy} className="btn btn-sm btn-dark shrink-0">
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
