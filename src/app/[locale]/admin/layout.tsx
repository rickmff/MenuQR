import { UserButton } from "@clerk/nextjs";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { PanelShell } from "@/components/painel/panel-shell";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { NavIcon } from "@/components/ui/button-icons";
import { Tag } from "@/components/ui/tag";
import { nameOrEmail } from "@/lib/format";
import { platform } from "@/lib/platform";
import { ADMIN_PATH, requireSuperAdmin } from "@/server/auth/admin";
import { billingMode } from "@/server/billing/config";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "admin" });
  return { title: t("meta.title"), robots: { index: false, follow: false } };
}

/**
 * A casca do super admin: a mesma do painel do lojista, com as abas daqui e um
 * selo ao lado do logo — quem administra também costuma ter um restaurante, e
 * as duas áreas não podem ser confundidas.
 *
 * Quem não pode entrar vê o 404 (`requireSuperAdmin`). As páginas conferem de
 * novo por conta própria: layout e página renderizam em paralelo, e a
 * conferência daqui não protege os dados que a página busca.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setRequestLocale((await params).locale);
  const user = await requireSuperAdmin();
  const t = await getTranslations("admin.shell");

  return (
    <PanelShell
      home={{
        href: ADMIN_PATH,
        label: t("logoLabel", { name: platform.name }),
      }}
      badge={
        <Tag tone="ink" size="md">
          {t("badge")}
        </Tag>
      }
      nav={<AdminNav />}
      notice={
        billingMode() === "off" && (
          <Banner tone="info">{t("billingOff")}</Banner>
        )
      }
      actions={
        <>
          <div className="hidden sm:block">
            <Button
              href="/painel"
              variant="secondary"
              size="sm"
              after={<NavIcon className="size-4" />}
            >
              {t("toPanel")}
            </Button>
          </div>
          <span className="hidden min-w-[8rem] max-w-[10rem] truncate text-end text-body2 font-medium text-gray-700 sm:block">
            {nameOrEmail(user.name, user.email)}
          </span>
          <UserButton
            userProfileMode="navigation"
            userProfileUrl="/painel/conta"
          />
        </>
      }
    >
      {children}
    </PanelShell>
  );
}
