"use client";

import { LayoutDashboard, Users, Webhook } from "lucide-react";
import { useTranslations } from "next-intl";
import { PanelNav } from "@/components/painel/panel-nav";

/** Abas do super admin: os números, as contas e o que chegou dos provedores. */
export function AdminNav() {
  const t = useTranslations("admin.nav");
  return (
    <PanelNav
      label={t("label")}
      entries={[
        {
          href: "/admin",
          label: t("overview"),
          exact: true,
          icon: LayoutDashboard,
        },
        { href: "/admin/contas", label: t("accounts"), icon: Users },
        { href: "/admin/webhooks", label: t("webhooks"), icon: Webhook },
      ]}
    />
  );
}
