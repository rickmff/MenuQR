"use client";

import { EyeOff, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  setBillingExemptAction,
  syncBillingAction,
  unpublishBusinessAction,
  type AdminActionResult,
} from "@/server/actions/admin";

/**
 * Um pouco mais que a saída do sheet de confirmação (200ms): o `<dialog>`
 * modal fica no top layer até sair e cobriria o toast (armadilha 8 do design).
 * O mesmo tempo do `PublishToggle`.
 */
const SHEET_EXIT_MS = 250;

const afterSheetExit = () =>
  new Promise<void>((resolve) => window.setTimeout(resolve, SHEET_EXIT_MS));

function formOf(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) formData.set(name, value);
  return formData;
}

function toastOf(result: AdminActionResult) {
  return "success" in result
    ? { message: result.success, tone: "success" as const }
    : { message: result.error, tone: "error" as const };
}

/**
 * Liga e desliga a cortesia. Desligar pergunta antes quando a conta não tem
 * assinatura que a segure (`confirmRemoval`): painel e cardápio saem do ar no
 * mesmo instante. Ligar nunca derruba nada e vai direto.
 */
export function ExemptSwitch({
  userId,
  name,
  exempt,
  confirmRemoval,
}: {
  userId: string;
  name: string;
  exempt: boolean;
  confirmRemoval: boolean;
}) {
  const t = useTranslations("admin.account");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  // O interruptor muda no toque; a resposta do servidor (a página revalidada)
  // confirma, e um erro o devolve à posição de antes.
  const [shown, setShown] = useOptimistic(exempt);
  const [confirming, setConfirming] = useState(false);

  const apply = (next: boolean, fromSheet = false) => {
    startTransition(async () => {
      setShown(next);
      const [result] = await Promise.all([
        setBillingExemptAction(formOf({ userId, exempt: String(next) })),
        fromSheet ? afterSheetExit() : undefined,
      ]);
      toast(toastOf(result));
    });
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-body2 font-semibold text-gray-700">
          {t("exemptLabel")}
        </p>
        <p className="mt-0.5 text-caption text-gray-600">{t("exemptHint")}</p>
      </div>
      <Switch
        checked={shown}
        label={t("exemptLabel")}
        disabled={pending}
        onChange={(next) =>
          !next && confirmRemoval ? setConfirming(true) : apply(next)
        }
      />
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("exemptConfirmTitle", { name })}
        description={t("exemptConfirmText")}
        confirmLabel={t("exemptConfirmLabel")}
        onConfirm={() => apply(false, true)}
      />
    </div>
  );
}

/** Puxa do Asaas o que o webhook deixou de entregar. */
export function SyncBillingButton({ userId }: { userId: string }) {
  const t = useTranslations("admin.account");
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      loading={pending}
      leading={<RefreshCw aria-hidden="true" className="size-4" />}
      onClick={() =>
        startTransition(async () =>
          toast(toastOf(await syncBillingAction(formOf({ userId })))),
        )
      }
    >
      {t("sync")}
    </Button>
  );
}

/** Tira o cardápio do ar, depois de perguntar: o QR impresso para de abrir na hora. */
export function UnpublishButton({
  businessId,
  businessName,
}: {
  businessId: string;
  businessName: string;
}) {
  const t = useTranslations("admin.account");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const run = () => {
    startTransition(async () => {
      const [result] = await Promise.all([
        unpublishBusinessAction(formOf({ businessId })),
        afterSheetExit(),
      ]);
      toast(toastOf(result));
    });
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        loading={pending}
        leading={<EyeOff aria-hidden="true" className="size-4" />}
        onClick={() => setConfirming(true)}
      >
        {t("unpublish")}
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("unpublishConfirmTitle", { name: businessName })}
        description={t("unpublishConfirmText")}
        confirmLabel={t("unpublish")}
        onConfirm={run}
      />
    </>
  );
}
