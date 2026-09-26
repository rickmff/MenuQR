import { ChevronRight, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import {
  AccountStatusTag,
  menuState,
  MenuStateTag,
} from "@/components/admin/admin-parts";
import { PanelHeader, PanelPage } from "@/components/painel/panel-page";
import { Button } from "@/components/ui/button";
import { NavIcon } from "@/components/ui/button-icons";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField, TextField } from "@/components/ui/text-field";
import {
  ACCOUNT_STATUSES,
  firstParam,
  isAccountStatus,
  parseDbDate,
} from "@/lib/admin";
import { nameOrEmail } from "@/lib/format";
import { requireSuperAdmin } from "@/server/auth/admin";
import { listAccounts } from "@/server/repositories/admin";

const ACCOUNTS_PATH = "/admin/contas";

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
 * Todas as contas, a mais nova primeiro. Os filtros vivem na URL (`busca`,
 * `situacao`, `pagina`): dá para voltar a uma lista filtrada e mandar o link
 * para outra pessoa do time.
 */
export default async function AdminAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{
    busca?: string | string[];
    situacao?: string | string[];
    pagina?: string | string[];
  }>;
}) {
  await requireSuperAdmin(ACCOUNTS_PATH);
  const params = await searchParams;
  const query = firstParam(params.busca)?.trim() ?? "";
  const statusParam = firstParam(params.situacao);
  const status = isAccountStatus(statusParam) ? statusParam : null;

  const [list, t, tStatus, format] = await Promise.all([
    listAccounts({
      query,
      status,
      page: Number(firstParam(params.pagina)) || 1,
    }),
    getTranslations("admin.accounts"),
    getTranslations("admin.status"),
    getFormatter(),
  ]);

  const pageHref = (page: number) => {
    const search = new URLSearchParams();
    if (query) search.set("busca", query);
    if (status) search.set("situacao", status);
    if (page > 1) search.set("pagina", String(page));
    const encoded = search.toString();
    return encoded ? `${ACCOUNTS_PATH}?${encoded}` : ACCOUNTS_PATH;
  };

  return (
    <PanelPage>
      <PanelHeader
        title={t("title")}
        description={t("count", { count: list.total })}
      />

      {/* GET e `next/form`: o filtro é a URL, e funciona antes da hidratação. */}
      <Form
        action={ACCOUNTS_PATH}
        role="search"
        className="flex flex-wrap items-end gap-3"
      >
        <TextField
          id="busca"
          name="busca"
          type="search"
          label={t("searchLabel")}
          placeholder={t("searchPlaceholder")}
          defaultValue={query}
          autoComplete="off"
          className="min-w-0 flex-1 basis-64"
        />
        <SelectField
          id="situacao"
          name="situacao"
          label={t("statusLabel")}
          defaultValue={status ?? ""}
          className="w-full sm:w-56"
        >
          <option value="">{t("allStatuses")}</option>
          {ACCOUNT_STATUSES.map((entry) => (
            <option key={entry} value={entry}>
              {tStatus(entry)}
            </option>
          ))}
        </SelectField>
        <Button type="submit" variant="secondary">
          {t("filter")}
        </Button>
      </Form>

      {list.accounts.length === 0 ? (
        <Card>
          <EmptyState
            icon={<SearchX className="size-12" />}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
            action={
              (query || status) && (
                <Button href={ACCOUNTS_PATH} variant="secondary" size="sm">
                  {t("clearFilters")}
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-gray-100">
            {list.accounts.map((account) => (
              <li key={account.id}>
                <Link
                  href={`${ACCOUNTS_PATH}/${account.id}`}
                  className="press flex items-center gap-4 px-4 py-3 transition-colors duration-150 ease-standard hover:bg-gray-50 lg:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body2 font-semibold text-gray-700">
                      {nameOrEmail(account.name, account.email)}
                    </p>
                    <p className="truncate text-caption text-gray-600">
                      {account.email}
                    </p>
                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-caption text-gray-600">
                      {account.business ? (
                        <>
                          <span className="min-w-0 truncate">
                            {account.business.name}
                          </span>
                          <MenuStateTag
                            state={menuState(account.business, account.live)}
                          />
                        </>
                      ) : (
                        t("noBusiness")
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <AccountStatusTag status={account.status} />
                    <span className="hidden text-caption text-gray-600 sm:block">
                      {t("createdAt", {
                        date: format.dateTime(parseDbDate(account.createdAt), {
                          dateStyle: "short",
                        }),
                      })}
                    </span>
                  </div>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-gray-400"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {list.pageCount > 1 && (
        <nav
          aria-label={t("pagination")}
          className="flex items-center justify-between gap-3"
        >
          {list.page > 1 ? (
            <Button
              href={pageHref(list.page - 1)}
              variant="secondary"
              size="sm"
            >
              {t("previous")}
            </Button>
          ) : (
            <Button variant="secondary" size="sm" disabled>
              {t("previous")}
            </Button>
          )}
          <span className="text-body2 text-gray-600">
            {t("page", { page: list.page, pageCount: list.pageCount })}
          </span>
          {list.page < list.pageCount ? (
            <Button
              href={pageHref(list.page + 1)}
              variant="secondary"
              size="sm"
              after={<NavIcon className="size-4" />}
            >
              {t("next")}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled
              after={<NavIcon className="size-4" />}
            >
              {t("next")}
            </Button>
          )}
        </nav>
      )}
    </PanelPage>
  );
}
