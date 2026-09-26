"use client";

import { Share2, Store, User, UtensilsCrossed } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  BUSINESS_SECTIONS,
  ONBOARDING_ORDER,
} from "@/components/painel/business-sections";
import { PanelNav } from "@/components/painel/panel-nav";

/** Abas do painel do lojista. O desenho mora em `PanelNav`. */
export function DashboardNav() {
  const t = useTranslations("painel.nav");
  return (
    <PanelNav
      label={t("label")}
      entries={[
        { href: "/painel", label: t("share"), exact: true, icon: Share2 },
        { href: "/painel/cardapio", label: t("menu"), icon: UtensilsCrossed },
        {
          // Direto na primeira aba ("Endereço e entrega"), a mesma em que o guia
          // começa o negócio — e não em `/painel/negocio`, que é a Identidade.
          href: BUSINESS_SECTIONS[ONBOARDING_ORDER[0] ?? "entrega"].href,
          label: t("business"),
          short: t("businessShort"),
          match: "/painel/negocio",
          icon: Store,
        },
        { href: "/painel/conta", label: t("account"), icon: User },
      ]}
    />
  );
}
