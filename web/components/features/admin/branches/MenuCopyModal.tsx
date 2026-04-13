"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Branch {
  id: string;
  name: string;
  subdomain: string;
}

interface MenuCopyModalProps {
  branches: Branch[];
  onClose: () => void;
}

/**
 * MenuCopyModal — inline panel for copying a menu from one branch to another.
 *
 * Flow:
 *   1. Founder selects source and target branches.
 *   2. A confirmation step shows before the destructive copy.
 *   3. POST /api/v1/owner/organization/menu/copy is called.
 *   4. Success / error feedback via toast.
 */
export function MenuCopyModal({ branches, onClose }: MenuCopyModalProps) {
  const t = useTranslations("owner.branches");

  const [sourceId, setSourceId] = useState<string>("");
  const [targetId, setTargetId] = useState<string>("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const sourceBranch = branches.find((b) => b.id === sourceId);
  const targetBranch = branches.find((b) => b.id === targetId);
  const sameError = sourceId && targetId && sourceId === targetId;
  const canProceed = !!sourceId && !!targetId && !sameError;

  const handleCopy = async () => {
    if (!canProceed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/v1/owner/organization/menu/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_restaurant_id: sourceId,
          target_restaurant_id: targetId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? t("copyMenuError"));
      }

      const data = await res.json();
      toast.success(
        t("copyMenuSuccess", {
          categories: data.categories_copied,
          items: data.items_copied,
        })
      );
      setConfirming(false);
      setSourceId("");
      setTargetId("");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("copyMenuError");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Copy className="h-4 w-4 text-primary shrink-0" />
        <h2 className="text-sm font-semibold">{t("copyMenuTitle")}</h2>
      </div>
      <p className="text-xs text-muted-foreground">{t("copyMenuDescription")}</p>

      <div className="space-y-3">
        {/* Source */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("copyMenuSourceLabel")}
          </label>
          <select
            value={sourceId}
            onChange={(e) => {
              setSourceId(e.target.value);
              setConfirming(false);
            }}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("copyMenuSelectSource")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Target */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            {t("copyMenuTargetLabel")}
          </label>
          <select
            value={targetId}
            onChange={(e) => {
              setTargetId(e.target.value);
              setConfirming(false);
            }}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("copyMenuSelectTarget")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {sameError && (
          <p className="text-xs text-destructive">{t("copyMenuSameError")}</p>
        )}
      </div>

      {/* Confirmation step */}
      {confirming && sourceBranch && targetBranch && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                {t("copyMenuConfirmTitle", { targetName: targetBranch.name })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("copyMenuConfirmDescription", {
                  targetName: targetBranch.name,
                  sourceName: sourceBranch.name,
                })}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("copyMenuConfirm")}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              {t("copyMenuCancel")}
            </button>
          </div>
        </div>
      )}

      {/* Action row */}
      {!confirming && (
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            {t("copyMenuCancel")}
          </button>
          <button
            onClick={() => setConfirming(true)}
            disabled={!canProceed}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
          >
            <Copy className="h-3.5 w-3.5" />
            {t("copyMenuTitle")}
          </button>
        </div>
      )}
    </div>
  );
}
