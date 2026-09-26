"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { asaasConfigured } from "../asaas/config";
import { ADMIN_PATH, getSuperAdmin } from "../auth/admin";
import { billingMode } from "../billing/config";
import { revalidateForUser, syncFromAsaas } from "../billing/lifecycle";
import { setBillingExempt } from "../repositories/admin";
import { getBusinessById, setPublished } from "../repositories/businesses";
import { listSubscriptionsByUser } from "../repositories/subscriptions";
import { revalidateStore } from "../revalidate";
import { summarizeBilling, todaySP } from "@/lib/billing";
import type { User } from "@/lib/types";

/** A resposta vira toast na tela de quem chamou, já no idioma dela. */
export type AdminActionResult = { success: string } | { error: string };

/**
 * Toda ação do /admin deixa rastro no log: quem fez, o quê e em quem. É o que
 * responde "quem tirou o meu cardápio do ar?" sem uma tabela de auditoria.
 */
function audit(admin: User, action: string, target: string) {
  console.info(`[admin] ${admin.email} ${action} ${target}`);
}

/**
 * Liga ou desliga a cortesia. A permissão é conferida aqui de novo: a página
 * já conferiu, mas a ação é um POST que qualquer um pode mandar.
 */
export async function setBillingExemptAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const t = await getTranslations("admin.actions");
  const admin = await getSuperAdmin();
  if (!admin) return { error: t("forbidden") };

  const userId = String(formData.get("userId") ?? "");
  const exempt = formData.get("exempt") === "true";
  if (!(await setBillingExempt(userId, exempt)))
    return { error: t("accountMissing") };
  audit(
    admin,
    exempt ? "ligou a cortesia de" : "desligou a cortesia de",
    userId,
  );

  // A isenção decide se o painel abre e se o cardápio fica no ar.
  await revalidateForUser(userId);
  revalidatePath(ADMIN_PATH, "layout");
  return { success: t(exempt ? "exemptOn" : "exemptOff") };
}

/**
 * Puxa do Asaas as cobranças da assinatura e recalcula o acesso — para o
 * webhook que se perdeu. É o "Já paguei" do lojista, sem a espera entre
 * consultas.
 */
export async function syncBillingAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const t = await getTranslations("admin.actions");
  const admin = await getSuperAdmin();
  if (!admin) return { error: t("forbidden") };
  if (billingMode() === "off" || !asaasConfigured())
    return { error: t("asaasNotConfigured") };

  const userId = String(formData.get("userId") ?? "");
  const access = summarizeBilling(
    await listSubscriptionsByUser(userId),
    todaySP(),
  );
  const target = access.current ?? access.latest;
  if (!target?.asaasSubscriptionId) return { error: t("nothingToSync") };

  try {
    await syncFromAsaas(target);
  } catch (error) {
    console.error("[admin] sincronização com o Asaas falhou:", error);
    return { error: t("asaasDown") };
  }
  audit(admin, "sincronizou com o Asaas", userId);

  revalidatePath(ADMIN_PATH, "layout");
  return { success: t("synced") };
}

/**
 * Tira o cardápio do ar (moderação, pedido do lojista pelo suporte). O lojista
 * continua podendo publicar de novo pelo painel dele.
 */
export async function unpublishBusinessAction(
  formData: FormData,
): Promise<AdminActionResult> {
  const t = await getTranslations("admin.actions");
  const admin = await getSuperAdmin();
  if (!admin) return { error: t("forbidden") };

  const business = await getBusinessById(
    String(formData.get("businessId") ?? ""),
  );
  if (!business) return { error: t("businessMissing") };
  if (business.published) await setPublished(business.id, false);
  audit(admin, "tirou do ar", business.slug);

  revalidateStore(business.slug);
  revalidatePath(ADMIN_PATH, "layout");
  return { success: t("unpublished", { name: business.name }) };
}
