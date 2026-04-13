"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GitCompare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
// Types only — server module is not executed client-side
import type { BranchMenuCategory, BranchMenuSnapshot } from "@/lib/server/organizations/branch-menu";

interface Branch {
  id: string;
  name: string;
  subdomain: string;
}

interface MenuComparePanelProps {
  branches: Branch[];
}

interface CompareResult {
  branchA: BranchMenuSnapshot;
  branchB: BranchMenuSnapshot;
}

// Build a flat map of item name → price for quick lookup
function buildItemPriceMap(categories: BranchMenuCategory[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const cat of categories) {
    for (const item of cat.items) {
      map.set(item.name_en, item.price);
    }
  }
  return map;
}

// Collect all unique item names across both branches
function allItemNames(a: BranchMenuCategory[], b: BranchMenuCategory[]): string[] {
  const names = new Set<string>();
  [...a, ...b].forEach((cat) => cat.items.forEach((item) => names.add(item.name_en)));
  return Array.from(names).sort();
}

/**
 * MenuComparePanel — inline side-by-side menu comparison for two branches.
 *
 * Calls GET /api/v1/owner/organization/menu/compare?branch_a=<id>&branch_b=<id>
 */
export function MenuComparePanel({ branches }: MenuComparePanelProps) {
  const t = useTranslations("owner.branches");

  const [branchAId, setBranchAId] = useState<string>("");
  const [branchBId, setBranchBId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  const branchA = branches.find((b) => b.id === branchAId);
  const branchB = branches.find((b) => b.id === branchBId);
  const canRun = !!branchAId && !!branchBId && branchAId !== branchBId;

  const runCompare = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/v1/owner/organization/menu/compare?branch_a=${branchAId}&branch_b=${branchBId}`
      );
      if (!res.ok) {
        throw new Error(t("compareError"));
      }
      const data: CompareResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("compareError"));
    } finally {
      setLoading(false);
    }
  };

  // Compute comparison data
  let priceMapA: Map<string, number> | null = null;
  let priceMapB: Map<string, number> | null = null;
  let itemNames: string[] = [];

  if (result) {
    priceMapA = buildItemPriceMap(result.branchA.categories);
    priceMapB = buildItemPriceMap(result.branchB.categories);
    itemNames = allItemNames(result.branchA.categories, result.branchB.categories);
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-primary shrink-0" />
        <h2 className="text-sm font-semibold">{t("compareMenuTitle")}</h2>
      </div>
      <p className="text-xs text-muted-foreground">{t("compareMenuDescription")}</p>

      {/* Branch selectors */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("compareBranchALabel")}
          </label>
          <select
            value={branchAId}
            onChange={(e) => { setBranchAId(e.target.value); setResult(null); }}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("compareSelect")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("compareBranchBLabel")}
          </label>
          <select
            value={branchBId}
            onChange={(e) => { setBranchBId(e.target.value); setResult(null); }}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("compareSelect")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={runCompare}
          disabled={!canRun || loading}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <GitCompare className="h-3.5 w-3.5" />
          )}
          {t("compareRun")}
        </button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Results */}
      {result && branchA && branchB && priceMapA && priceMapB && (
        <div className="space-y-2">
          {itemNames.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              {t("compareNoCategories")}
            </p>
          ) : (
            <>
              {/* Column headers */}
              <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground px-1 pb-1 border-b">
                <span>Item</span>
                <span className="text-right">{branchA.name}</span>
                <span className="text-right">{branchB.name}</span>
              </div>

              {/* Item rows */}
              {itemNames.map((name) => {
                const priceA = priceMapA!.get(name);
                const priceB = priceMapB!.get(name);
                const onlyInA = priceA !== undefined && priceB === undefined;
                const onlyInB = priceA === undefined && priceB !== undefined;
                const priceDiff = priceA !== undefined && priceB !== undefined && priceA !== priceB;

                return (
                  <div
                    key={name}
                    className={cn(
                      "grid grid-cols-3 gap-2 text-xs py-1.5 px-1 rounded-md",
                      onlyInA && "bg-blue-50 dark:bg-blue-950/30",
                      onlyInB && "bg-green-50 dark:bg-green-950/30",
                      priceDiff && "bg-amber-50 dark:bg-amber-950/30"
                    )}
                  >
                    <span className="truncate font-medium">{name}</span>
                    <span className={cn(
                      "text-right tabular-nums",
                      onlyInA && "text-blue-700 dark:text-blue-300",
                      onlyInB && "text-muted-foreground line-through opacity-50"
                    )}>
                      {priceA !== undefined
                        ? t("compareItemPrice", { price: priceA })
                        : "—"}
                    </span>
                    <span className={cn(
                      "text-right tabular-nums",
                      onlyInB && "text-green-700 dark:text-green-300",
                      onlyInA && "text-muted-foreground line-through opacity-50"
                    )}>
                      {priceB !== undefined
                        ? t("compareItemPrice", { price: priceB })
                        : "—"}
                    </span>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="flex flex-wrap gap-3 pt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-100 dark:bg-blue-950" />
                  {t("compareOnlyInA", { name: branchA.name })}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-green-100 dark:bg-green-950" />
                  {t("compareOnlyInB", { name: branchB.name })}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-100 dark:bg-amber-950" />
                  {t("comparePriceDiff")}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
