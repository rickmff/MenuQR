"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { memo, useState } from "react";
import { CountBadge } from "@/components/store/count-badge";
import { DishImage } from "@/components/store/dish-image";
import { rememberMenuPosition } from "@/components/store/nav-marker";
import { readScrollTop, useScrollRoot } from "@/components/store/scroll-root";
import { NAV_FORWARD } from "@/components/store/store-screen";
import {
  useCartSelector,
  useCartStore,
  useMountAnimation,
} from "@/components/store/store-provider";
import { Stepper } from "@/components/ui/stepper";
import { Tag } from "@/components/ui/tag";
import { countInCart, findQuickLine } from "@/lib/cart-store";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import type { MenuItemCard } from "@/lib/types";

/**
 * Linha de item dos apps de delivery: nome, uma linha de descrição e o preço à
 * esquerda; a foto quadrada de cantos 16 à direita; e o "+" num círculo de
 * vidro fosco sobre o canto de baixo da foto.
 *
 * O "+" fica FORA do link (irmão dele, posicionado sobre a foto): em item sem
 * escolha obrigatória ele joga direto na sacola e vira a pílula "− n +" de
 * vidro, centrada na largura da foto e abrindo do centro para os dois lados; quando o prato exige
 * escolher algo (ponto da carne, tamanho), ele leva à página do prato, e a
 * contagem do que já está na sacola aparece num selo. A pílula flutua por cima
 * da foto — nada da linha se mexe (zero layout shift).
 *
 * Lê a sacola por seletor: só a linha cujo item mudou renderiza de novo.
 * `storeSlug` liga o "voltar" do prato à posição da lista (fora da loja — as
 * vitrines da landing — fica de fora).
 */
export const ItemCard = memo(function ItemCard({
  item,
  basePath,
  storeSlug,
  priority = false,
}: {
  item: MenuItemCard;
  basePath: string;
  storeSlug?: string;
  priority?: boolean;
}) {
  const t = useTranslations("store.itemCard");
  const store = useCartStore();
  const scrollRoot = useScrollRoot();
  const canQuickAdd = item.available && !item.hasRequiredOptions;
  // Primitivos, para o seletor não mudar de identidade a cada render.
  const quick = useCartSelector((cart) => {
    if (!canQuickAdd) return "";
    const line = findQuickLine(cart, item.id);
    return line ? `${line.uid}|${line.quantity}` : "";
  });
  const inCart = useCartSelector((cart) => countInCart(cart, item.id));
  const [quickUid = "", quickQuantity = "0"] = quick.split("|");

  const href = `${basePath}/item/${item.slug}`;
  const hasImage = item.image.trim() !== "";
  const remember = () => {
    if (storeSlug)
      rememberMenuPosition(
        storeSlug,
        href,
        "menu",
        readScrollTop(scrollRoot?.current),
      );
  };
  // O prato entra deslizando da direita, como uma tela nova num app. Na prévia
  // (moldura rolável) não: a transição é da página inteira e vazaria da moldura.
  const transitionTypes = scrollRoot ? undefined : [NAV_FORWARD];
  const firstTag = item.tags[0];

  // Sobre a foto: o "+" no canto de baixo à direita (16 do respiro + 112 da
  // foto − 32 − 8); a pílula na mesma altura, mas centrada na largura da foto
  // (112 / 2 = 56 da borda direita), abrindo do centro para os dois lados.
  // Sem foto: os dois centrados na altura da linha, na borda direita.
  const place = hasImage ? "right-2 top-22" : "right-0 top-1/2 -translate-y-1/2";
  const pillPlace = hasImage ? "right-14 top-22 translate-x-1/2" : place;
  const circle = hasImage
    ? "glass text-gray-900 hover:bg-white/85 active:bg-white/90"
    : "bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300";

  return (
    <li className="relative">
      <Link
        href={href}
        onClick={remember}
        transitionTypes={transitionTypes}
        className={cn(
          "press -mx-4 flex gap-4 px-4 py-4 active:bg-gray-50 lg:rounded-md lg:hover:bg-gray-50",
          !item.available && "opacity-60",
        )}
      >
        <div className={cn("min-w-0 flex-1 self-center", !hasImage && "pr-12")}>
          <h3 className="line-clamp-2 text-subtitle font-semibold text-gray-700">
            {item.name}
          </h3>
          {item.description && (
            <p className="mt-1 line-clamp-1 text-body2 text-gray-600">
              {item.description}
            </p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-body1 font-bold tabular-nums text-gray-900">
              {formatPrice(item.price)}
            </span>
            {item.available && firstTag && <Tag tone="ink">{firstTag}</Tag>}
          </p>
        </div>

        {hasImage && (
          <div className="relative shrink-0 self-start">
            <DishImage
              image={item.image}
              alt={item.imageAlt || item.name}
              priority={priority}
              fade
              emojiSize="md"
              className={cn(
                "size-28 rounded-lg",
                !item.available && "grayscale",
              )}
              sizes="112px"
            />
            {!item.available && (
              <span className="absolute left-2 top-2 rounded-xs bg-gray-800/85 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {t("unavailable")}
              </span>
            )}
          </div>
        )}
        {!hasImage && !item.available && (
          <Tag tone="ink" className="absolute right-0 top-1/2 -translate-y-1/2">
            {t("unavailable")}
          </Tag>
        )}
      </Link>

      {item.available && (
        <div className={cn("absolute", quickUid ? pillPlace : place)}>
          {quickUid ? (
            <QuickPill
              uid={quickUid}
              quantity={Number(quickQuantity)}
              name={item.name}
              overImage={hasImage}
              onChange={(next) => store.setQuantity(quickUid, next)}
            />
          ) : canQuickAdd ? (
            <button
              type="button"
              onClick={() => store.addItem(item.id, 1, {}, "")}
              aria-label={t("addToBag", { name: item.name, count: inCart })}
              className={cn(
                "press hit-44 relative grid size-8 cursor-pointer place-items-center rounded-full",
                circle,
              )}
            >
              <Plus aria-hidden="true" className="size-5" />
              <CountBadge count={inCart} className="-right-1.5 -top-1.5" />
            </button>
          ) : (
            <Link
              href={href}
              onClick={remember}
              transitionTypes={transitionTypes}
              aria-label={t("chooseOptions", {
                name: item.name,
                count: inCart,
              })}
              className={cn(
                "press hit-44 relative grid size-8 place-items-center rounded-full",
                circle,
              )}
            >
              <Plus aria-hidden="true" className="size-5" />
              <CountBadge count={inCart} className="-right-1.5 -top-1.5" />
            </Link>
          )}
        </div>
      )}
    </li>
  );
});

/**
 * "− n +" no lugar do "+". Nasce do próprio "+": começa mostrando só o botão
 * "+" dela, em cima do círculo, e abre para a esquerda (sobre a foto, de vidro,
 * deslizando até o centro dela; sem foto, branca, no mesmo lugar). A lixeira
 * faz o caminho de volta e só então tira o item da sacola, e o círculo
 * reaparece onde a animação terminou. A entrada só anima o que a pessoa causou
 * — não na carga da página, quando o item já estava na sacola.
 */
function QuickPill({
  uid,
  quantity,
  name,
  overImage,
  onChange,
}: {
  uid: string;
  quantity: number;
  name: string;
  overImage: boolean;
  onChange: (next: number) => void;
}) {
  const t = useTranslations("store.itemCard");
  const animate = useMountAnimation();
  const [closing, setClosing] = useState(false);
  return (
    <div
      role="group"
      aria-label={t("inBag", { name })}
      data-uid={uid}
      // O fim da animação de saída é que remove. O número dentro da pílula tem
      // o próprio fade, e o evento dele sobe até aqui: por isso o nome confere.
      onAnimationEnd={(event) => {
        if (closing && /^pill-(morph|reveal)-out$/.test(event.animationName)) onChange(0);
      }}
    >
      <Stepper
        size="sm"
        variant={overImage ? "glass" : "floating"}
        value={quantity}
        min={1}
        max={99}
        onChange={onChange}
        onRemove={() => setClosing(true)}
        label={name}
        className={cn(
          closing
            ? cn(
                "pointer-events-none",
                overImage ? "animate-pill-morph-out" : "animate-pill-reveal-out",
              )
            : animate && (overImage ? "animate-pill-morph" : "animate-pill-reveal"),
        )}
      />
    </div>
  );
}
