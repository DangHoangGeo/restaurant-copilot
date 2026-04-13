"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PurchaseOrder, Supplier } from "@/lib/server/purchasing/types";
import { purchaseCategoryValues } from "@/lib/server/purchasing/schemas";

function getDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface AddPurchaseOrderFormProps {
  onCreated: (order: PurchaseOrder) => void;
  onCancel: () => void;
  suppliers: Supplier[];
}

export function AddPurchaseOrderForm({ onCreated, onCancel, suppliers }: AddPurchaseOrderFormProps) {
  const t = useTranslations("owner.purchasing");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = getDateInputValue();

  const [form, setForm] = useState({
    supplier_id: "",
    supplier_name: "",
    category: "food" as string,
    order_date: today,
    total_amount: "",
    notes: "",
    is_paid: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const amount = parseFloat(form.total_amount);
    if (isNaN(amount) || amount < 0) {
      setError(t("validation.invalidAmount"));
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/owner/purchasing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: form.supplier_id || null,
          supplier_name: form.supplier_id ? null : form.supplier_name || null,
          category: form.category,
          order_date: form.order_date,
          total_amount: amount,
          notes: form.notes || null,
          is_paid: form.is_paid,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t("createFailed"));
        return;
      }

      const { order } = await res.json();
      onCreated(order);
    } catch {
      setError(t("createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-muted/30 p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold">{t("addOrderTitle")}</h3>

      {/* Supplier */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          {t("fields.savedSupplier")}
        </label>
        <select
          value={form.supplier_id}
          onChange={(e) => {
            const nextSupplierId = e.target.value;
            const selectedSupplier = suppliers.find((supplier) => supplier.id === nextSupplierId);
            setForm((current) => ({
              ...current,
              supplier_id: nextSupplierId,
              supplier_name: nextSupplierId ? selectedSupplier?.name ?? current.supplier_name : current.supplier_name,
            }));
          }}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">{t("fields.savedSupplierPlaceholder")}</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      {/* Supplier name */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          {t("fields.supplierName")}
        </label>
        <input
          type="text"
          value={form.supplier_name}
          onChange={(e) => setForm((f) => ({ ...f, supplier_name: e.target.value }))}
          placeholder={t("fields.supplierNamePlaceholder")}
          disabled={Boolean(form.supplier_id)}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Category + Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {t("fields.category")}
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {purchaseCategoryValues.map((cat) => (
              <option key={cat} value={cat}>
                {t(`categories.${cat}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {t("fields.orderDate")}
          </label>
          <input
            type="date"
            value={form.order_date}
            onChange={(e) => setForm((f) => ({ ...f, order_date: e.target.value }))}
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          {t("fields.totalAmount")}
        </label>
        <input
          type="number"
          min="0"
          step="1"
          value={form.total_amount}
          onChange={(e) => setForm((f) => ({ ...f, total_amount: e.target.value }))}
          required
          placeholder="0"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          {t("fields.notes")}
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder={t("fields.notesPlaceholder")}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>

      {/* Paid toggle */}
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_paid}
          onChange={(e) => setForm((f) => ({ ...f, is_paid: e.target.checked }))}
          className="rounded"
        />
        {t("fields.markAsPaid")}
      </label>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
