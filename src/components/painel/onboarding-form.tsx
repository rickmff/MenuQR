"use client";

import { Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { TextField } from "@/components/ui/text-field";
import { useFormAction, useHydrated } from "@/components/use-form-action";
import { cn } from "@/lib/cn";
import { demoMode } from "@/lib/demo/config";
import { demoCreateBusinessAction } from "@/lib/demo/actions";
import { slugify, slugifyTyping } from "@/lib/slug";
import { createBusinessAction } from "@/server/actions/business";
import type { FormState } from "@/server/actions/business";

const initialState: FormState = {};

/**
 * Rótulo, dica e erro dos campos que não cabem no `TextField` (o link, com o
 * prefixo dentro da caixa, e o WhatsApp, com o seletor de país) — o mesmo
 * desenho do `FieldShell`, para os quatro campos do cadastro falarem igual.
 */
function FieldFrame({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const t = useTranslations("ui.textField");
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-body2 font-medium text-gray-700"
      >
        {label}
        <span aria-hidden="true" className="text-gray-600">
          {" "}
          *
        </span>
        <span className="sr-only"> {t("required")}</span>
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-caption text-gray-600">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-caption font-medium text-error"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/** Primeiro passo do lojista: nome, link do cardápio e WhatsApp. */
export function OnboardingForm({ siteUrl }: { siteUrl: string }) {
  const { state, formProps, pending, isEdited, edited, markEdited } =
    useFormAction(
      demoMode ? demoCreateBusinessAction : createBusinessAction,
      initialState,
    );
  // Antes da hidratação o envio é o POST nativo, e o WhatsApp (espelhado do
  // estado num campo oculto) ia vazio: o botão só liga depois dela.
  const hydrated = useHydrated();
  const t = useTranslations("painel.onboarding");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const derivedSlug = slugify(name);
  const currentSlug = slugTouched ? slug : derivedSlug;

  // O erro de um campo vale até o lojista mexer nele; a faixa geral, até mexer
  // em qualquer um. O link derivado muda junto com o nome, então o erro dele
  // também sai quando o nome muda.
  const errors = state.fieldErrors ?? {};
  const nameError = isEdited("name") ? undefined : errors.name;
  const slugError =
    isEdited("slug") || (!slugTouched && isEdited("name"))
      ? undefined
      : errors.slug;
  const whatsappError = isEdited("whatsapp") ? undefined : errors.whatsapp;
  const cityError = isEdited("city") ? undefined : errors.city;
  const slugDescribedBy = slugError ? "slug-error" : "slug-hint";
  const whatsappDescribedBy = whatsappError
    ? "whatsapp-error"
    : "whatsapp-hint";

  return (
    <form {...formProps} className="space-y-5" noValidate>
      {state.error && !edited && (
        <Banner tone="error" role="alert">
          {state.error}
        </Banner>
      )}

      <TextField
        id="name"
        name="name"
        label={t("nameLabel")}
        required
        maxLength={80}
        autoComplete="organization"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={t("namePlaceholder")}
        error={nameError}
      />

      <FieldFrame
        id="slug"
        label={t("slugLabel")}
        hint={t("slugHint")}
        error={slugError}
      >
        <div
          className={cn(
            "flex h-12 items-center rounded-sm border bg-white px-4 transition-[border-color,box-shadow] duration-150 ease-standard",
            slugError
              ? "border-error focus-within:shadow-[inset_0_0_0_1px_var(--color-error)]"
              : "border-gray-300 focus-within:border-primary focus-within:shadow-[inset_0_0_0_1px_var(--color-primary)]",
          )}
        >
          <span
            aria-hidden="true"
            className="shrink-0 text-body1 text-gray-600"
          >
            {siteUrl}/r/
          </span>
          <input
            id="slug"
            name="slug"
            required
            maxLength={40}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={slugError ? true : undefined}
            aria-describedby={slugDescribedBy}
            value={currentSlug}
            onChange={(event) => {
              // Enquanto digita, o hífen do fim fica (senão "cantina da" virava
              // "cantinada"); o formato final sai no blur e no servidor.
              setSlugTouched(true);
              setSlug(slugifyTyping(event.target.value));
            }}
            onBlur={() => {
              if (!slugTouched) return;
              // Apagado, o link volta a ser o do nome — o placeholder já mostra
              // qual. Esvaziar não é pedir um link vazio.
              if (!slug) setSlugTouched(false);
              else setSlug(slugify(slug));
            }}
            placeholder={derivedSlug || "cantina-da-nona"}
            className="h-full w-full min-w-0 bg-transparent text-body1 text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </FieldFrame>

      <FieldFrame
        id="whatsapp"
        label={t("whatsappLabel")}
        hint={t("whatsappHint")}
        error={whatsappError}
      >
        {/* O número mora num campo oculto: a mudança (digitada ou de país)
            chega por `onValueChange`, com o nome que o servidor usa no erro. */}
        <PhoneInput
          id="whatsapp"
          name="whatsapp"
          required
          invalid={Boolean(whatsappError)}
          describedBy={whatsappDescribedBy}
          onValueChange={() => markEdited("whatsapp")}
        />
      </FieldFrame>

      <TextField
        id="city"
        name="city"
        label={t("cityLabel")}
        hint={t("cityHint")}
        maxLength={80}
        autoComplete="address-level2"
        placeholder={t("cityPlaceholder")}
        error={cityError}
      />

      <Button
        type="submit"
        fullWidth
        disabled={!hydrated}
        loading={pending}
        leading={<Store className="size-5" />}
      >
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
