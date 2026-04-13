"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Building2, Plus, ChevronUp, Trash2, Phone, Mail } from "lucide-react";
import type { Supplier } from "@/lib/server/purchasing/types";
import { supplierCategoryValues } from "@/lib/server/purchasing/schemas";

interface SupplierListProps {
  initialSuppliers: Supplier[];
  canWrite: boolean;
}

export function SupplierList({ initialSuppliers, canWrite }: SupplierListProps) {
  const t = useTranslations("owner.purchasing");
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [showForm, setShowForm] = useState(false);

  const handleCreated = (supplier: Supplier) => {
    setSuppliers((prev) => [...prev, supplier].sort((a, b) => a.name.localeCompare(b.name)));
    setShowForm(false);
  };

  const handleArchive = async (id: string) => {
    const res = await fetch(`/api/v1/owner/purchasing/suppliers/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSuppliers((prev) => prev.filter((s) => s.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("tabs.suppliers")}
        </h2>
        {canWrite && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {t("addSupplier")}
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <AddSupplierForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      )}

      {/* Empty state */}
      {suppliers.length === 0 && !showForm && (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <Building2 className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("noSuppliers")}</p>
        </div>
      )}

      {/* Supplier cards */}
      {suppliers.map((supplier) => (
        <div
          key={supplier.id}
          className="flex items-start gap-3 rounded-xl border bg-card p-4"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{supplier.name}</span>
              <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded-full">
                {supplier.category}
              </span>
            </div>
            {supplier.contact_name && (
              <p className="text-xs text-muted-foreground mt-1">{supplier.contact_name}</p>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {supplier.contact_phone && (
                <a
                  href={`tel:${supplier.contact_phone}`}
                  className="flex items-center gap-1 text-xs text-primary"
                >
                  <Phone className="h-3 w-3" />
                  {supplier.contact_phone}
                </a>
              )}
              {supplier.contact_email && (
                <a
                  href={`mailto:${supplier.contact_email}`}
                  className="flex items-center gap-1 text-xs text-primary"
                >
                  <Mail className="h-3 w-3" />
                  {supplier.contact_email}
                </a>
              )}
            </div>
          </div>
          {canWrite && (
            <button
              onClick={() => handleArchive(supplier.id)}
              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
              aria-label={t("archive")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Add Supplier Form ────────────────────────────────────

interface AddSupplierFormProps {
  onCreated: (supplier: Supplier) => void;
  onCancel: () => void;
}

function AddSupplierForm({ onCreated, onCancel }: AddSupplierFormProps) {
  const t = useTranslations("owner.purchasing");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    category: "food" as string,
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/v1/owner/purchasing/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          contact_name: form.contact_name || null,
          contact_phone: form.contact_phone || null,
          contact_email: form.contact_email || null,
          notes: form.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t("createFailed"));
        return;
      }

      const { supplier } = await res.json();
      onCreated(supplier);
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
      <h3 className="text-sm font-semibold">{t("addSupplierTitle")}</h3>

      {/* Name + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {t("fields.supplierName")} *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {t("fields.category")}
          </label>
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {supplierCategoryValues.map((cat) => (
              <option key={cat} value={cat}>
                {t(`supplierCategories.${cat}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {t("fields.contactName")}
          </label>
          <input
            type="text"
            value={form.contact_name}
            onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {t("fields.contactPhone")}
          </label>
          <input
            type="tel"
            value={form.contact_phone}
            onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          {t("fields.contactEmail")}
        </label>
        <input
          type="email"
          value={form.contact_email}
          onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

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
