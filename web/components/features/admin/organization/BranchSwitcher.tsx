"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Building2, ChevronDown, CheckCircle2, Loader2 } from "lucide-react";

interface Branch {
  id: string;
  name: string;
  subdomain: string;
}

interface BranchSwitcherProps {
  accessibleRestaurantIds: string[];
}

/**
 * BranchSwitcher shows the active branch and lets founders switch to another
 * branch in their org. It calls:
 *   GET /api/v1/owner/organization/active-branch  → current restaurant_id
 *   PUT /api/v1/owner/organization/active-branch  → set new branch
 *   GET /api/v1/owner/organization/restaurants    → list of accessible branches
 */
export function BranchSwitcher({ accessibleRestaurantIds }: BranchSwitcherProps) {
  const t = useTranslations("owner.organization");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch available branches and current active branch
  useEffect(() => {
    if (accessibleRestaurantIds.length <= 1) {
      return;
    }

    async function load() {
      try {
        const [branchesRes, activeRes] = await Promise.all([
          fetch("/api/v1/owner/organization/restaurants"),
          fetch("/api/v1/owner/organization/active-branch"),
        ]);

        if (branchesRes.ok) {
          const data = await branchesRes.json();
          setBranches(data.restaurants ?? []);
        }

        if (activeRes.ok) {
          const data = await activeRes.json();
          setActiveBranchId(data.restaurant_id ?? null);
        }
      } catch {
        // Non-fatal: switcher stays hidden if fetch fails
      }
    }
    load();
  }, [accessibleRestaurantIds.length]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Only show if there are multiple branches
  if (accessibleRestaurantIds.length <= 1) return null;

  const switchBranch = async (restaurantId: string) => {
    if (restaurantId === activeBranchId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setOpen(false);

    try {
      const res = await fetch("/api/v1/owner/organization/active-branch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restaurant_id: restaurantId }),
      });

      if (res.ok) {
        setActiveBranchId(restaurantId);
        // Reload the page so all data re-fetches with the new branch context
        window.location.reload();
      }
    } finally {
      setSwitching(false);
    }
  };

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className="flex items-center gap-2 w-full rounded-lg border bg-muted/60 px-3 py-2 text-sm hover:bg-muted transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {switching ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="flex-1 text-left truncate text-foreground">
          {activeBranch?.name ?? t("selectBranch")}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && branches.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border bg-popover shadow-md overflow-hidden">
          <ul role="listbox" className="py-1">
            {branches.map((branch) => (
              <li key={branch.id}>
                <button
                  role="option"
                  aria-selected={branch.id === activeBranchId}
                  onClick={() => switchBranch(branch.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted text-left transition-colors"
                >
                  <span className="flex-1 truncate">{branch.name}</span>
                  {branch.id === activeBranchId && (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
