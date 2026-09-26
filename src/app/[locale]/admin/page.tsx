import { ChevronRight, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { AccountStatusTag, StatTile } from "@/components/admin/admin-parts";
import { PanelHeader, PanelPage } from "@/components/painel/panel-page";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { ACCOUNT_STATUSES } from "@/lib/admin";
import { formatPlanPrice } from "@/lib/billing";
import { ADMIN_PATH, requireSuperAdmin } from "@/server/auth/admin";
import { getPlatformStats } from "@/server/repositories/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("meta.overview") };
}

/**
 * Primeira aba do super admin: como a plataforma está hoje e onde agir. Cada
 * situação leva à lista de contas já filtrada — é de lá que se resolve.
 */
export default async function AdminOverviewPage() {
  await requireSuperAdmin(ADMIN_PATH);
  const [stats, t, format] = await Promise.all([
    getPlatformStats(),
    getTranslations("admin.overview"),
    getFormatter(),
  ]);
  const paying = stats.byStatus.active + stats.byStatus.pastDue;

  return (
    <PanelPage>
      <PanelHeader title={t("title")} description={t("description")} />

      {stats.webhookProblems > 0 && (
        <Banner tone="warning" icon={<TriangleAlert className="size-5" />}>
          {t("webhookProblems", { count: stats.webhookProblems })}{" "}
          <Link
            href="/admin/webhooks?problemas=1"
            className="font-semibold underline"
          >
            {t("seeWebhooks")}
          </Link>
        </Banner>
      )}

      <section aria-label={t("statsLabel")}>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label={t("accounts")}
            value={format.number(stats.accounts)}
            hint={t("recentAccounts", { count: stats.recentAccounts })}
          />
          <StatTile
            label={t("live")}
            value={format.number(stats.live)}
            hint={t("liveHint", {
              published: stats.published,
              businesses: stats.businesses,
            })}
          />
          <StatTile
            label={t("paying")}
            value={format.number(paying)}
            hint={t("payingHint", { count: stats.byStatus.pastDue })}
          />
          <StatTile
            label={t("paidLastYear")}
            value={formatPlanPrice(stats.paidLastYearCents)}
            hint={t("recurringHint", {
              value: formatPlanPrice(stats.annualRecurringCents),
            })}
          />
        </dl>
      </section>

      <Card as="section" padding="none">
        <h2 className="px-4 pt-4 text-subtitle font-bold text-gray-700 lg:px-6 lg:pt-6">
          {t("byStatus")}
        </h2>
        <ul className="mt-2 divide-y divide-gray-100 pb-2">
          {ACCOUNT_STATUSES.map((status) => (
            <li key={status}>
              <Link
                href={`/admin/contas?situacao=${status}`}
                className="press flex items-center gap-3 px-4 py-3 transition-colors duration-150 ease-standard hover:bg-gray-50 lg:px-6"
              >
                <AccountStatusTag status={status} />
                <span className="ml-auto text-body1 font-semibold tabular-nums text-gray-700">
                  {format.number(stats.byStatus[status])}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-5 shrink-0 text-gray-400"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </PanelPage>
  );
}
