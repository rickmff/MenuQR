import { Webhook } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { PanelHeader, PanelPage } from "@/components/painel/panel-page";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tag, type TagTone } from "@/components/ui/tag";
import { firstParam, parseDbDate } from "@/lib/admin";
import { requireSuperAdmin } from "@/server/auth/admin";
import {
  listWebhookEvents,
  WEBHOOK_LIST_LIMIT,
  type WebhookEventStatus,
} from "@/server/repositories/admin";

const WEBHOOKS_PATH = "/admin/webhooks";

/** O normal é processado e fica em cinza: na lista, só o problema chama atenção. */
const STATUS_TONES: Record<WebhookEventStatus, TagTone> = {
  processed: "neutral",
  processing: "neutral",
  stuck: "warning",
  failed: "error",
};

/** Nome dos provedores como eles se escrevem — marca não se traduz. */
const PROVIDERS: Record<string, string> = { clerk: "Clerk", asaas: "Asaas" };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("meta.webhooks") };
}

/**
 * O que o Clerk e o Asaas entregaram: é aqui que se descobre por que um
 * pagamento não liberou o painel. `?problemas=1` deixa só os eventos com erro
 * ou travados.
 */
export default async function AdminWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ problemas?: string | string[] }>;
}) {
  await requireSuperAdmin(WEBHOOKS_PATH);
  const problemsOnly = firstParam((await searchParams).problemas) === "1";
  const [events, t, format] = await Promise.all([
    listWebhookEvents({ problemsOnly }),
    getTranslations("admin.webhooks"),
    getFormatter(),
  ]);

  const filters = [
    { href: WEBHOOKS_PATH, label: t("all"), active: !problemsOnly },
    {
      href: `${WEBHOOKS_PATH}?problemas=1`,
      label: t("problems"),
      active: problemsOnly,
    },
  ];

  return (
    <PanelPage>
      <PanelHeader
        title={t("title")}
        description={t("description", { limit: WEBHOOK_LIST_LIMIT })}
      />

      <nav aria-label={t("filterLabel")} className="flex gap-2">
        {filters.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            aria-current={filter.active ? "page" : undefined}
            className={buttonClass({
              variant: filter.active ? "secondary" : "tertiary",
              size: "sm",
              pill: true,
            })}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {events.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Webhook className="size-12" />}
            title={t(problemsOnly ? "emptyProblemsTitle" : "emptyTitle")}
            description={problemsOnly ? undefined : t("emptyDescription")}
          />
        </Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-gray-100">
            {events.map((event) => {
              const received = parseDbDate(event.receivedAt);
              return (
                <li key={event.id} className="px-4 py-3 lg:px-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone="ink" size="md">
                      {PROVIDERS[event.provider] ?? event.provider}
                    </Tag>
                    <span className="min-w-0 break-all font-mono text-body2 text-gray-700">
                      {event.type}
                    </span>
                    <Tag tone={STATUS_TONES[event.status]} size="md">
                      {t(`status.${event.status}`)}
                    </Tag>
                    <time
                      dateTime={received.toISOString()}
                      className="ml-auto text-caption text-gray-600"
                    >
                      {format.dateTime(received, {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </time>
                  </div>
                  {event.error && (
                    <p className="mt-1 break-words text-caption text-error-pressed">
                      {event.error}
                    </p>
                  )}
                  {event.accountId ? (
                    <Link
                      href={`/admin/contas/${event.accountId}`}
                      className="mt-1 inline-block text-caption font-semibold text-primary underline"
                    >
                      {t("viewAccount")}
                    </Link>
                  ) : (
                    event.refId && (
                      <p className="mt-1 break-all font-mono text-caption text-gray-600">
                        {event.refId}
                      </p>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </PanelPage>
  );
}
