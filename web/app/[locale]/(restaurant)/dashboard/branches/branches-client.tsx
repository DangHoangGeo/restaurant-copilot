"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Layers, CheckCircle2, ArrowRight, Copy, GitCompare } from "lucide-react";
import { MenuCopyModal } from "@/components/features/admin/branches/MenuCopyModal";
import { MenuComparePanel } from "@/components/features/admin/branches/MenuComparePanel";
import { cn } from "@/lib/utils";

interface Branch {
  id: string;
  name: string;
  subdomain: string;
}

interface BranchesClientProps {
  branches: Branch[];
  activeBranchId: string | null;
  canManageMenu: boolean;
}

type ActivePanel = "none" | "copy" | "compare";

export function BranchesClient({
  branches,
  activeBranchId,
  canManageMenu,
}: BranchesClientProps) {
  const t = useTranslations("owner.branches");
  const locale = useLocale();
  const router = useRouter();
  const [panel, setPanel] = useState<ActivePanel>("none");
  const [switching, setSwitching] = useState(false);
  const [currentActiveBranchId, setCurrentActiveBranchId] = useState(activeBranchId);

  /** Switch active branch. Returns true on success. */
  const switchBranch = async (restaurantId: string): Promise<boolean> => {
    if (restaurantId === currentActiveBranchId) return true;
    setSwitching(true);
    try {
      const res = await fetch("/api/v1/owner/organization/active-branch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      });
      if (res.ok) {
        setCurrentActiveBranchId(restaurantId);
        return true;
      }
      return false;
    } finally {
      setSwitching(false);
    }
  };

  if (branches.length === 0) {
    return (
      <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center py-16 text-muted-foreground">
          <Layers className="h-10 w-10 mx-auto mb-4 opacity-30" />
          <p>{t("noBranches")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{t("pageTitle")}</h1>
            <p className="text-xs text-muted-foreground">{t("pageDescription")}</p>
          </div>
        </div>

        {/* Branch list */}
        <div className="space-y-2">
          {branches.map((branch) => {
            const isActive = branch.id === currentActiveBranchId;
            return (
              <div
                key={branch.id}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-card p-4",
                  isActive && "border-primary/40 bg-primary/5"
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{branch.name}</span>
                    {isActive && (
                      <span className="shrink-0 text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {t("currentBranch")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{branch.subdomain}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isActive ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <button
                      onClick={async () => {
                        const ok = await switchBranch(branch.id);
                        if (ok) window.location.reload();
                      }}
                      disabled={switching}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                    >
                      {t("switchToBranch")}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      if (!isActive) {
                        const ok = await switchBranch(branch.id);
                        if (!ok) return;
                      }
                      router.push(`/${locale}/dashboard/menu`);
                    }}
                    disabled={switching}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                  >
                    {t("manageMenu")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions — only shown when there are 2+ branches and canManageMenu */}
        {branches.length >= 2 && canManageMenu && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPanel(panel === "copy" ? "none" : "copy")}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors hover:bg-muted",
                panel === "copy" ? "border-primary/40 bg-primary/5 text-primary" : "bg-card text-foreground"
              )}
            >
              <Copy className="h-4 w-4 shrink-0" />
              {t("copyMenuTitle")}
            </button>
            <button
              onClick={() => setPanel(panel === "compare" ? "none" : "compare")}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors hover:bg-muted",
                panel === "compare" ? "border-primary/40 bg-primary/5 text-primary" : "bg-card text-foreground"
              )}
            >
              <GitCompare className="h-4 w-4 shrink-0" />
              {t("compareMenuTitle")}
            </button>
          </div>
        )}

        {/* Copy panel */}
        {panel === "copy" && branches.length >= 2 && (
          <MenuCopyModal
            branches={branches}
            onClose={() => setPanel("none")}
          />
        )}

        {/* Compare panel */}
        {panel === "compare" && branches.length >= 2 && (
          <MenuComparePanel
            branches={branches}
          />
        )}
      </div>
    </div>
  );
}
