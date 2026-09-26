import type { BillingAccess } from "./billing";

/**
 * A situação de uma conta como o /admin agrupa: o estado da cobrança
 * (`summarizeBilling`), com a isenção à parte — para quem administra, "não paga
 * porque é cortesia" e "paga em dia" são coisas diferentes, embora as duas
 * liberem o painel.
 */
export type AccountStatus =
  | "active"
  | "pastDue"
  | "pending"
  | "expired"
  | "cancelled"
  | "none"
  | "exempt";

/** A ordem do filtro e da contagem: de quem paga até quem nunca pagou. */
export const ACCOUNT_STATUSES: readonly AccountStatus[] = [
  "active",
  "pastDue",
  "pending",
  "expired",
  "cancelled",
  "none",
  "exempt",
];

export function isAccountStatus(value: unknown): value is AccountStatus {
  return (
    typeof value === "string" &&
    (ACCOUNT_STATUSES as readonly string[]).includes(value)
  );
}

export function accountStatus(billing: BillingAccess): AccountStatus {
  if (billing.exempt) return "exempt";
  switch (billing.state) {
    case "active":
      return "active";
    case "past_due":
      return "pastDue";
    case "pending":
      return "pending";
    case "expired":
      return "expired";
    case "cancelled":
      return "cancelled";
    default:
      return "none";
  }
}

/**
 * Data gravada pelo banco: o `datetime('now')` do SQLite ("2026-09-26
 * 14:03:00", em UTC e sem fuso escrito) ou um ISO completo (`cancelled_at`).
 */
export function parseDbDate(value: string): Date {
  return new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
}

/** O primeiro valor de um parâmetro da URL (`?busca=a&busca=b` chega como lista). */
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Minúsculas e sem acento: "joão" acha "Joao" e "JOÃO". */
export function foldForSearch(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}
