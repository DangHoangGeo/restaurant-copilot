"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Tag, TrendingDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromotionList } from "./PromotionList";
import { AddPromotionForm, type FormData } from "./AddPromotionForm";
import type { Promotion } from "@/lib/server/promotions/types";
import { MoneySectionNav } from "@/components/features/admin/money/MoneySectionNav";

interface PromotionsDashboardProps {
  initialPromotions: Promotion[];
  monthDiscountTotal: number;
  currency: string;
  locale: string;
  canWrite: boolean;
  financeHref?: string;
  purchasingHref?: string;
  promotionsHref?: string;
}

export function PromotionsDashboard({
  initialPromotions,
  monthDiscountTotal,
  currency,
  locale,
  canWrite,
  financeHref,
  purchasingHref,
  promotionsHref,
}: PromotionsDashboardProps) {
  const t = useTranslations("owner.promotions");
  const router = useRouter();

  const [promotions, setPromotions] = useState<Promotion[]>(initialPromotions);
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fmt = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "JPY",
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(n);

  const visible = showInactive
    ? promotions
    : promotions.filter((p) => p.is_active);

  const activeCount = promotions.filter((p) => p.is_active).length;

  // ── Create ───────────────────────────────────────────────────────────────────
  const handleCreate = async (data: FormData) => {
    const res = await fetch("/api/v1/owner/promotions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Failed to create promotion");
    }
    const { promotion } = await res.json();
    setPromotions((prev) => [promotion, ...prev]);
    setShowForm(false);
    router.refresh();
  };

  // ── Toggle active ────────────────────────────────────────────────────────────
  const handleToggle = async (promo: Promotion) => {
    setToggling(promo.id);
    try {
      const res = await fetch(`/api/v1/owner/promotions/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !promo.is_active }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      const { promotion: updated } = await res.json();
      setPromotions((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch {
      // silent — user will see unchanged state
    } finally {
      setToggling(null);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDeleteRequest = (promoId: string) => setDeleteTarget(promoId);
  const handleDeleteCancel  = () => setDeleteTarget(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(deleteTarget);
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/v1/owner/promotions/${deleteTarget}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setPromotions((prev) => prev.filter((p) => p.id !== deleteTarget));
    } catch {
      // silent
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Page header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("pageTitle")}</h1>
            <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
          </div>
        </div>

        <MoneySectionNav
          locale={locale}
          financeHref={financeHref}
          purchasingHref={purchasingHref}
          promotionsHref={promotionsHref}
        />

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("summary.activePromotions")}
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">{activeCount}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t("summary.monthDiscounts")}
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold text-foreground">{fmt(monthDiscountTotal)}</span>
            </div>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center justify-between gap-3">
          {canWrite && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {t("addPromotion")}
            </button>
          )}

          <button
            onClick={() => setShowInactive((v) => !v)}
            className={cn(
              "ml-auto inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors",
              showInactive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {showInactive ? t("hideInactive") : t("showInactive")}
          </button>
        </div>

        {/* Promotions list */}
        {visible.length === 0 ? (
          <div className="rounded-xl border bg-muted/30 px-5 py-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Tag className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground">
              {showInactive ? t("emptyStateTitleFiltered") : t("emptyStateTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {showInactive ? t("noPromotionsInactive") : t("noPromotions")}
            </p>
            {canWrite && !showInactive && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                {t("addPromotion")}
              </button>
            )}
          </div>
        ) : (
          <PromotionList
            promotions={visible}
            currency={currency}
            locale={locale}
            canWrite={canWrite}
            toggling={toggling}
            deleting={deleting}
            deleteTarget={deleteTarget}
            onToggle={handleToggle}
            onDeleteRequest={handleDeleteRequest}
            onDeleteConfirm={handleDeleteConfirm}
            onDeleteCancel={handleDeleteCancel}
          />
        )}
      </div>

      {/* Add form modal */}
      {showForm && (
        <AddPromotionForm
          currency={currency}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
