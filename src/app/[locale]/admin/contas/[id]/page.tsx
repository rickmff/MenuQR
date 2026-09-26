import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import {
  ExemptSwitch,
  SyncBillingButton,
  UnpublishButton,
} from "@/components/admin/account-actions";
import {
  AccountStatusTag,
  AdminSection,
  DetailList,
  DetailRow,
  menuState,
  MenuStateTag,
} from "@/components/admin/admin-parts";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { billingStatusLine } from "@/components/painel/billing-notice";
import { PanelHeader, PanelPage } from "@/components/painel/panel-page";
import { PaymentHistory } from "@/components/painel/payment-history";
import { Button } from "@/components/ui/button";
import { ExternalIcon } from "@/components/ui/button-icons";
import { Card } from "@/components/ui/card";
import { Tag, type TagTone } from "@/components/ui/tag";
import { parseDbDate } from "@/lib/admin";
import {
  formatBillingDate,
  formatPlanPrice,
  summarizeBilling,
  todaySP,
  type SubscriptionStatus,
} from "@/lib/billing";
import { formatWhatsapp, nameOrEmail } from "@/lib/format";
import { siteUrl } from "@/lib/site";
import { asaasConfigured } from "@/server/asaas/config";
import { requireSuperAdmin } from "@/server/auth/admin";
import { billingMode } from "@/server/billing/config";
import { getAdminAccount } from "@/server/repositories/admin";
import { getBusinessById } from "@/server/repositories/businesses";

const SUBSCRIPTION_TONES: Record<SubscriptionStatus, TagTone> = {
  active: "positive",
  pending: "neutral",
  cancelled: "neutral",
};

/** Título genérico de propósito: o nome da conta não vai para o `<title>` de quem não pode ver a página. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("meta.accounts") };
}

/**
 * Uma conta vista por cima: a assinatura (e o que o suporte faz com ela), o
 * restaurante e os identificadores para achar a conta no Clerk e no Asaas.
 */
export default async function AdminAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireSuperAdmin(`/admin/contas/${id}`);
  const account = await getAdminAccount(id);
  if (!account) notFound();

  const [business, t, locale, format] = await Promise.all([
    account.business ? getBusinessById(account.business.id) : null,
    getTranslations("admin.account"),
    getLocale(),
    getFormatter(),
  ]);
  const displayName = nameOrEmail(account.name, account.email);
  const displayUrl = siteUrl.replace(/^https?:\/\//, "");

  // A conta sem a cortesia: é ela que diz se desligar a isenção derruba o
  // painel, e qual assinatura sincronizar (`account.billing` de uma conta
  // isenta não aponta assinatura nenhuma).
  const paidAccess = summarizeBilling(account.subscriptions, todaySP());
  const charging = billingMode() === "asaas";
  const syncTarget = paidAccess.current ?? paidAccess.latest;
  const canSync =
    charging && asaasConfigured() && Boolean(syncTarget?.asaasSubscriptionId);

  const date = (value: string) =>
    format.dateTime(parseDbDate(value), { dateStyle: "short" });

  return (
    <PanelPage width="form">
      <Breadcrumbs
        trail={[
          { name: t("breadcrumb"), path: "/admin/contas" },
          { name: displayName, path: `/admin/contas/${account.id}` },
        ]}
      />

      <PanelHeader
        title={displayName}
        description={
          <>
            <span className="min-w-0 break-all">{account.email}</span>
            <AccountStatusTag status={account.status} />
          </>
        }
        actions={
          account.business?.published && (
            <Button
              href={`/r/${account.business.slug}`}
              target="_blank"
              rel="noopener"
              variant="secondary"
              size="sm"
              after={<ExternalIcon />}
            >
              {t("viewMenu")}
            </Button>
          )
        }
      />

      <AdminSection
        title={t("subscriptionTitle")}
        description={billingStatusLine(account.billing, t, locale)}
        action={canSync && <SyncBillingButton userId={account.id} />}
      >
        <ExemptSwitch
          userId={account.id}
          name={displayName}
          exempt={account.billingExempt}
          confirmRemoval={charging && !paidAccess.allowed}
        />

        {account.subscriptions.length > 0 && (
          <div>
            <h3 className="text-body2 font-semibold text-gray-700">
              {t("historyTitle")}
            </h3>
            <ul className="mt-2 divide-y divide-gray-100">
              {account.subscriptions.map((subscription) => (
                <li key={subscription.id} className="py-3 last:pb-0">
                  <p className="flex flex-wrap items-center gap-2 text-body2 text-gray-700">
                    <span className="font-semibold">
                      {t(`cycle.${subscription.cycle}`)} ·{" "}
                      {formatPlanPrice(subscription.amountCents)}
                    </span>
                    <Tag
                      tone={SUBSCRIPTION_TONES[subscription.status]}
                      size="md"
                    >
                      {t(`subscriptionStatus.${subscription.status}`)}
                    </Tag>
                  </p>
                  <p className="mt-0.5 text-caption text-gray-600">
                    {[
                      t("subscriptionCreated", {
                        date: date(subscription.createdAt),
                      }),
                      subscription.paidUntil &&
                        t("subscriptionPaidUntil", {
                          date: formatBillingDate(
                            subscription.paidUntil,
                            locale,
                          ),
                        }),
                      subscription.cancelledAt &&
                        t("subscriptionCancelled", {
                          date: date(subscription.cancelledAt),
                        }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {subscription.asaasSubscriptionId && (
                    <p className="mt-0.5 font-mono text-caption text-gray-600">
                      {subscription.asaasSubscriptionId}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </AdminSection>

      {account.payments.length > 0 && (
        <Card>
          <PaymentHistory payments={account.payments} />
        </Card>
      )}

      <AdminSection
        title={t("businessTitle")}
        description={business ? undefined : t("noBusiness")}
        action={
          business?.published && (
            <UnpublishButton
              businessId={business.id}
              businessName={business.name}
            />
          )
        }
      >
        {business && (
          <DetailList>
            <DetailRow label={t("businessName")}>{business.name}</DetailRow>
            <DetailRow label={t("menuLink")} mono>
              <a
                href={`/r/${business.slug}`}
                target="_blank"
                rel="noopener"
                className="text-primary underline"
              >
                {displayUrl}/r/{business.slug}
              </a>
            </DetailRow>
            <DetailRow label={t("menuState")}>
              <MenuStateTag state={menuState(business, account.live)} />
            </DetailRow>
            {account.menu && (
              <DetailRow label={t("menuSize")}>
                {t("menuCount", {
                  items: account.menu.items,
                  categories: account.menu.categories,
                  available: account.menu.available,
                })}
              </DetailRow>
            )}
            {business.address.city && (
              <DetailRow label={t("city")}>
                {[business.address.city, business.address.state]
                  .filter(Boolean)
                  .join(" / ")}
              </DetailRow>
            )}
            {business.whatsapp && (
              <DetailRow label={t("whatsapp")}>
                <a
                  href={`https://wa.me/${business.whatsapp}`}
                  target="_blank"
                  rel="noopener"
                  className="text-primary underline"
                >
                  {formatWhatsapp(business.whatsapp)}
                </a>
              </DetailRow>
            )}
          </DetailList>
        )}
      </AdminSection>

      <AdminSection title={t("accountTitle")}>
        <DetailList>
          <DetailRow label={t("createdAt")}>
            {format.dateTime(parseDbDate(account.createdAt), {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </DetailRow>
          <DetailRow label={t("access")}>
            {account.clerkLinked ? t("clerkLinked") : t("clerkPending")}
          </DetailRow>
          <DetailRow label={t("internalId")} mono>
            {account.id}
          </DetailRow>
          <DetailRow label={t("clerkId")} mono>
            {account.clerkUserId ?? t("empty")}
          </DetailRow>
          <DetailRow label={t("asaasId")} mono>
            {account.asaasCustomerId ?? t("empty")}
          </DetailRow>
        </DetailList>
      </AdminSection>
    </PanelPage>
  );
}
