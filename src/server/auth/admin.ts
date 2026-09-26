import "server-only";
import { currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { demoMode } from "@/lib/demo/config";
import { serverEnv } from "../env";
import { normalizeEmail } from "../repositories/users";
import { getCurrentUser } from "./current-user";
import { requireUser } from "./guards";
import type { User } from "@/lib/types";

export const ADMIN_PATH = "/admin";

function superAdminEmails(): Set<string> {
  const raw = serverEnv().SUPER_ADMIN_EMAILS ?? "";
  return new Set(raw.split(",").map(normalizeEmail).filter(Boolean));
}

/**
 * Só um atalho de interface (o link para o /admin no painel): compara o e-mail
 * que o banco guarda, sem ir ao Clerk. Quem decide o acesso é `isSuperAdmin`.
 */
export function isSuperAdminEmail(email: string): boolean {
  return superAdminEmails().has(normalizeEmail(email));
}

/**
 * O e-mail principal no Clerk, verificado, está na lista de `SUPER_ADMIN_EMAILS`.
 *
 * Vale o Clerk e não a cópia do banco: a linha pode estar velha (o lojista
 * trocou o e-mail e ainda não abriu a tela de conta) e o Clerk é quem prova que
 * o endereço é de quem está logado. Uma ida à API por requisição do /admin —
 * tráfego de uma pessoa, não do site.
 */
const isSuperAdmin = cache(async (): Promise<boolean> => {
  if (demoMode) return false;
  const allowed = superAdminEmails();
  if (allowed.size === 0) return false;

  const clerkUser = await clerkCurrentUser();
  const primary = clerkUser?.primaryEmailAddress;
  if (!primary || primary.verification?.status !== "verified") return false;
  return allowed.has(normalizeEmail(primary.emailAddress));
});

/**
 * Páginas do /admin. Deslogado vai para a entrada; logado sem permissão vê o
 * 404 — o painel não confirma a quem não pode que ele existe.
 */
export async function requireSuperAdmin(returnTo = ADMIN_PATH): Promise<User> {
  if (demoMode) notFound();
  const user = await requireUser(returnTo);
  if (!(await isSuperAdmin())) notFound();
  return user;
}

/** Ações do /admin: `null` quando quem chama não é super admin (ou a sessão caiu). */
export async function getSuperAdmin(): Promise<User | null> {
  if (demoMode) return null;
  const user = await getCurrentUser();
  if (!user || !(await isSuperAdmin())) return null;
  return user;
}
