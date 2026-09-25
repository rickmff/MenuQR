"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/i18n/set-locale";
import { LOCALE_LABELS, routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

/**
 * Bandeiras em SVG, e não emoji: o Windows não desenha bandeira de emoji e
 * mostra só as letras ("BR", "US"). Desenho simplificado para 20×14 — no
 * tamanho de ícone, estrelas e faixa não se leem. O inglês do sistema é o
 * americano, daí a bandeira dos EUA.
 */
function FlagBR() {
  return (
    <>
      <rect width="20" height="14" fill="#009c3b" />
      <path d="M10 2 18 7 10 12 2 7Z" fill="#ffdf00" />
      <circle cx="10" cy="7" r="2.9" fill="#002776" />
    </>
  );
}

function FlagUS() {
  return (
    <>
      <rect width="20" height="14" fill="#ffffff" />
      {/* 13 listras, as 7 vermelhas nas posições pares. */}
      {[0, 2, 4, 6, 8, 10, 12].map((stripe) => (
        <rect key={stripe} y={(stripe * 14) / 13} width="20" height={14 / 13} fill="#b22234" />
      ))}
      <rect width="9" height="7.54" fill="#3c3b6e" />
    </>
  );
}

const FLAGS: Record<Locale, () => React.JSX.Element> = {
  "pt-BR": FlagBR,
  en: FlagUS,
};

export function Flag({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const Shape = FLAGS[locale];
  return (
    <svg
      viewBox="0 0 20 14"
      aria-hidden="true"
      className={cn(
        "h-3.5 w-5 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10",
        className,
      )}
    >
      <Shape />
    </svg>
  );
}

/** Grava o cookie e recarrega os dados da rota — o endereço não muda. */
function useSwitchLocale() {
  const current = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const change = (locale: Locale) => {
    if (locale === current) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  };
  return { current, pending, change };
}

/**
 * Seletor em linha (rodapés, página Conta, gaveta do menu): bandeira e nome
 * na própria língua, lado a lado, o atual em negrito.
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { current, pending, change } = useSwitchLocale();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex items-center gap-3 text-body2 text-gray-600",
        pending && "opacity-60",
        className,
      )}
    >
      {routing.locales.map((locale, index) => (
        <span key={locale} className="inline-flex items-center gap-3">
          {index > 0 && (
            <span aria-hidden="true" className="text-gray-300">
              ·
            </span>
          )}
          <button
            type="button"
            lang={locale}
            aria-pressed={locale === current}
            disabled={pending}
            onClick={() => change(locale)}
            className={cn(
              "press inline-flex items-center gap-1.5 rounded-xs transition-colors duration-150 ease-standard hover:text-gray-700",
              locale === current && "font-semibold text-gray-700",
            )}
          >
            <Flag
              locale={locale}
              className={cn(locale !== current && "opacity-70")}
            />
            {LOCALE_LABELS[locale]}
          </button>
        </span>
      ))}
    </div>
  );
}

/**
 * Seletor compacto para barras de navegação: só a bandeira do idioma atual,
 * que abre a lista. Mesmo contrato visual de `ui/menu.tsx`.
 */
export function LocaleMenu({ className }: { className?: string }) {
  const t = useTranslations("common");
  const { current, pending, change } = useSwitchLocale();

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`${t("language")}: ${LOCALE_LABELS[current]}`}
          disabled={pending}
          className={cn(
            "press inline-flex h-10 items-center gap-1 rounded-full px-3 text-gray-600 hover:bg-gray-50 hover:text-gray-700",
            pending && "opacity-60",
            className,
          )}
        >
          <Flag locale={current} />
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          collisionPadding={8}
          className="z-60 min-w-44 animate-pop-in rounded-sm border border-gray-200 bg-white p-1.5 shadow-high"
        >
          {routing.locales.map((locale) => (
            <DropdownMenu.Item
              key={locale}
              lang={locale}
              onSelect={() => change(locale)}
              className="flex h-10 cursor-pointer select-none items-center gap-2.5 rounded-xs px-3 text-body2 text-gray-700 outline-none data-highlighted:bg-gray-50"
            >
              <Flag locale={locale} />
              <span className="flex-1">{LOCALE_LABELS[locale]}</span>
              {locale === current && (
                <Check aria-hidden="true" className="size-4 text-primary" />
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
