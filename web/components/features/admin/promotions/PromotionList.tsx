"use client";

import { useTranslations } from "next-intl";
import { Tag, Calendar, Users, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Promotion } from "@/lib/server/promotions/types";

interface PromotionListProps {
  promotions: Promotion[];
  currency: string;
  locale: string;
  canWrite: boolean;
  toggling: string | null;
  deleting: string | null;
  deleteTarget: string | null;
  onToggle: (promo: Promotion) => void;
  onDeleteRequest: (promoId: string) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

function fmtAmount(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency || "JPY",
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}

function fmtDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function PromotionList({
  promotions,
  currency,
  locale,
  canWrite,
  toggling,
  deleting,
  deleteTarget,
  onToggle,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: PromotionListProps) {
  const t = useTranslations("owner.promotions");

  const formatDiscount = (promo: Promotion) => {
    if (promo.discount_type === "percentage") {
      return t("discountValuePct", { value: promo.discount_value });
    }
    return t("discountValueFlat", {
      amount: fmtAmount(promo.discount_value, currency, locale),
    });
  };

  const formatUsage = (promo: Promotion) => {
    if (promo.usage_limit === null) {
      return t("usageCount", { count: promo.usage_count });
    }
    return t("usageLimit", { used: promo.usage_count, limit: promo.usage_limit });
  };

  const formatValidity = (promo: Promotion) => {
    if (!promo.valid_from && !promo.valid_until) return t("validAlways");
    if (promo.valid_from && promo.valid_until)
      return t("validFromUntil", {
        from: fmtDate(promo.valid_from, locale),
        until: fmtDate(promo.valid_until, locale),
      });
    if (promo.valid_from) return t("validFrom", { date: fmtDate(promo.valid_from, locale) });
    return t("validUntil", { date: fmtDate(promo.valid_until ?? "", locale) });
  };

  return (
    <div className="space-y-3">
      {promotions.map((promo) => (
        <div
          key={promo.id}
          className={cn(
            "rounded-xl border bg-card p-4 transition-opacity",
            !promo.is_active && "opacity-60"
          )}
        >
          {/* Top row: code + badge + actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Tag className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-mono font-semibold text-sm truncate">{promo.code}</span>
              <span
                className={cn(
                  "shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                  promo.is_active
                    ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {promo.is_active ? t("statusActive") : t("statusInactive")}
              </span>
            </div>

            {canWrite && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onToggle(promo)}
                  disabled={toggling === promo.id}
                  className="rounded-md px-2.5 py-1 text-xs font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
                >
                  {toggling === promo.id
                    ? "…"
                    : promo.is_active
                    ? t("disable")
                    : t("enable")}
                </button>

                {promo.usage_count === 0 && (
                  <button
                    onClick={() => onDeleteRequest(promo.id)}
                    disabled={deleting === promo.id}
                    className="rounded-md px-2.5 py-1 text-xs font-medium border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {deleting === promo.id ? "…" : t("delete")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          {promo.description && (
            <p className="mt-1.5 text-sm text-muted-foreground">{promo.description}</p>
          )}

          {/* Meta pills */}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {/* Discount value */}
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <TrendingDown className="h-3 w-3" />
              {formatDiscount(promo)}
              {promo.discount_type === "percentage" && promo.max_discount_amount !== null
                ? ` (${t("maxDiscount", { amount: fmtAmount(promo.max_discount_amount, currency, locale) })})`
                : ""}
            </span>

            {/* Usage */}
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              {formatUsage(promo)}
            </span>

            {/* Validity */}
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatValidity(promo)}
            </span>

            {/* Min order */}
            {promo.min_order_amount !== null && (
              <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                {t("minOrder", { amount: fmtAmount(promo.min_order_amount, currency, locale) })}
              </span>
            )}
          </div>
        </div>
      ))}

      {/* Delete confirm dialog */}
      {deleteTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-card rounded-xl border shadow-xl p-6 space-y-4">
            <h3 className="text-base font-semibold">{t("deleteConfirm")}</h3>
            <p className="text-sm text-muted-foreground">{t("deleteConfirmBody")}</p>
            <div className="flex gap-3">
              <button
                onClick={onDeleteCancel}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={onDeleteConfirm}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                {t("confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
