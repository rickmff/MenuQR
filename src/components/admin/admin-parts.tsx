import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Tag, type TagTone } from "@/components/ui/tag";
import { cn } from "@/lib/cn";
import type { AccountStatus } from "@/lib/admin";

/**
 * Peças de apresentação do /admin. Sem estado e sem ação: servem às páginas,
 * que são componentes de servidor.
 */

/**
 * O verde fica para quem paga em dia; vencida é o único vermelho. Cortesia,
 * aguardando, cancelada e sem assinatura se distinguem pelo rótulo — o tom é
 * reforço, nunca a informação sozinha.
 */
const STATUS_TONES: Record<AccountStatus, TagTone> = {
  active: "positive",
  pastDue: "warning",
  pending: "neutral",
  expired: "error",
  cancelled: "neutral",
  none: "neutral",
  exempt: "ink",
};

export function AccountStatusTag({ status }: { status: AccountStatus }) {
  const t = useTranslations("admin.status");
  return (
    <Tag tone={STATUS_TONES[status]} size="md">
      {t(status)}
    </Tag>
  );
}

export type MenuState = "live" | "blocked" | "draft";

const MENU_TONES: Record<MenuState, TagTone> = {
  live: "positive",
  blocked: "warning",
  draft: "neutral",
};

/** Publicado e no ar, publicado mas barrado pela cobrança, ou rascunho. */
export function menuState(
  business: { published: boolean },
  live: boolean,
): MenuState {
  if (live) return "live";
  return business.published ? "blocked" : "draft";
}

export function MenuStateTag({ state }: { state: MenuState }) {
  const t = useTranslations("admin.menuState");
  return (
    <Tag tone={MENU_TONES[state]} size="md">
      {t(state)}
    </Tag>
  );
}

/** Um número da plataforma: rótulo, valor e, se ajudar, uma linha de contexto. Vai dentro de um `<dl>`. */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card className="min-w-0">
      <dt className="text-caption text-gray-600">{label}</dt>
      {/* `break-words`: em duas colunas no celular, "R$ 12.345,00" em 24px
          passava da largura do cartão. */}
      <dd className="mt-1 break-words text-h6 font-bold tabular-nums text-gray-900 lg:text-h5">
        {value}
      </dd>
      {hint && <dd className="mt-1 text-caption text-gray-600">{hint}</dd>}
    </Card>
  );
}

/** Bloco de uma tela do /admin: título, apoio opcional e a ação do bloco à direita. */
export function AdminSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card as="section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-subtitle font-bold text-gray-700">{title}</h2>
        {action}
      </div>
      {description && (
        <p className="mt-1 text-body2 text-gray-600">{description}</p>
      )}
      {children && <div className="mt-4 space-y-4">{children}</div>}
    </Card>
  );
}

/** Pares rótulo/valor, um por linha. `mono` para texto de máquina (ids, links). */
export function DetailList({ children }: { children: ReactNode }) {
  return <dl className="divide-y divide-gray-100">{children}</dl>;
}

export function DetailRow({
  label,
  mono = false,
  children,
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
      <dt className="text-body2 text-gray-600 sm:w-40 sm:shrink-0">{label}</dt>
      <dd
        className={cn(
          "min-w-0 break-words text-body2 text-gray-700",
          mono && "font-mono",
        )}
      >
        {children}
      </dd>
    </div>
  );
}
