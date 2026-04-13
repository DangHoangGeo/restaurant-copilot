"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddPromotionFormProps {
  currency: string;
  onSave: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

export interface FormData {
  code: string;
  description: string;
  discount_type: "percentage" | "flat";
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
}

export function AddPromotionForm({ currency: _currency, onSave, onCancel }: AddPromotionFormProps) {
  const t = useTranslations("owner.promotions");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "flat">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [usageLimit, setUsageLimit] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const value = parseFloat(discountValue);
    if (isNaN(value) || value <= 0) {
      setError(t("invalidDiscountValue"));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        code: code.trim().toUpperCase(),
        description: description.trim() || "",
        discount_type: discountType,
        discount_value: value,
        min_order_amount: minOrder ? parseFloat(minOrder) : null,
        max_discount_amount: maxDiscount ? parseFloat(maxDiscount) : null,
        valid_from: validFrom || null,
        valid_until: validUntil || null,
        usage_limit: usageLimit ? parseInt(usageLimit, 10) : null,
      });
    } catch {
      setError(t("createFailed"));
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";
  const labelClass = "block text-sm font-medium text-foreground mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-xl border overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold">{t("addPromotionTitle")}</h2>
          <button
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label={t("cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Code */}
          <div>
            <label className={labelClass}>{t("fields.code")}</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("fields.codePlaceholder")}
              maxLength={50}
              required
              className={inputClass}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("fields.codeHint")}</p>
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>{t("fields.description")}</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("fields.descriptionPlaceholder")}
              maxLength={500}
              className={inputClass}
            />
          </div>

          {/* Discount type + value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("fields.discountType")}</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as "percentage" | "flat")}
                className={inputClass}
              >
                <option value="percentage">{t("discountTypes.percentage")}</option>
                <option value="flat">{t("discountTypes.flat")}</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>{t("fields.discountValue")}</label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "10" : "500"}
                min="0.01"
                step="any"
                required
                className={inputClass}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {discountType === "percentage"
                  ? t("fields.discountValueHintPct")
                  : t("fields.discountValueHintFlat")}
              </p>
            </div>
          </div>

          {/* Min order / Max discount */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("fields.minOrderAmount")}</label>
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder={t("fields.minOrderAmountPlaceholder")}
                min="0"
                step="any"
                className={inputClass}
              />
            </div>
            {discountType === "percentage" && (
              <div>
                <label className={labelClass}>{t("fields.maxDiscountAmount")}</label>
                <input
                  type="number"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(e.target.value)}
                  placeholder={t("fields.maxDiscountAmountPlaceholder")}
                  min="0"
                  step="any"
                  className={inputClass}
                />
              </div>
            )}
          </div>

          {/* Validity dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("fields.validFrom")}</label>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>{t("fields.validUntil")}</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Usage limit */}
          <div>
            <label className={labelClass}>{t("fields.usageLimit")}</label>
            <input
              type="number"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value)}
              placeholder={t("fields.usageLimitPlaceholder")}
              min="1"
              step="1"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                "flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors",
                saving ? "opacity-60 cursor-not-allowed" : "hover:bg-primary/90"
              )}
            >
              {saving ? t("saving") : t("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
