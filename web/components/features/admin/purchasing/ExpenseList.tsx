"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Receipt, Plus, Trash2, ChevronUp, Download } from "lucide-react";
import type { Expense } from "@/lib/server/purchasing/types";
import { expenseCategoryValues } from "@/lib/server/purchasing/schemas";

function getDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface ExpenseListProps {
  initialExpenses: Expense[];
  restaurantCurrency: string;
  monthStart: string;
  monthEnd: string;
  canWrite: boolean;
}

export function ExpenseList({
  initialExpenses,
  restaurantCurrency,
  monthStart,
  monthEnd,
  canWrite,
}: ExpenseListProps) {
  const t = useTranslations("owner.purchasing");
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [showForm, setShowForm] = useState(false);

  const handleCreated = (expense: Expense) => {
    setExpenses((prev) => [expense, ...prev]);
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/v1/owner/purchasing/expenses/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: restaurantCurrency || "JPY",
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="space-y-4">
      {/* Header + Add */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("tabs.expenses")}
        </h2>
        <div className="flex items-center gap-2">
          <a
            href={`/api/v1/owner/purchasing/export?type=expenses&from_date=${monthStart}&to_date=${monthEnd}`}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            {t("exportExpenses")}
          </a>
          {canWrite && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {t("addExpense")}
            </button>
          )}
        </div>
      </div>

      {/* Quick-entry form */}
      {showForm && (
        <AddExpenseForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
      )}

      {/* Empty state */}
      {expenses.length === 0 && !showForm && (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <Receipt className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("noExpenses")}</p>
        </div>
      )}

      {/* Expense rows */}
      {expenses.map((expense) => (
        <div
          key={expense.id}
          className="flex items-start gap-3 rounded-xl border bg-card p-4"
        >
          <Receipt className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm truncate">{expense.description}</span>
              <span className="font-semibold text-sm shrink-0">
                {formatAmount(expense.amount)}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-muted-foreground">{expense.expense_date}</span>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground capitalize">{expense.category}</span>
            </div>
            {expense.notes && (
              <p className="text-xs text-muted-foreground mt-1">{expense.notes}</p>
            )}
          </div>
          {canWrite && (
            <button
              onClick={() => handleDelete(expense.id)}
              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
              aria-label={t("delete")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Add Expense Form ─────────────────────────────────────

interface AddExpenseFormProps {
  onCreated: (expense: Expense) => void;
  onCancel: () => void;
}

function AddExpenseForm({ onCreated, onCancel }: AddExpenseFormProps) {
  const t = useTranslations("owner.purchasing");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = getDateInputValue();

  const [form, setForm] = useState({
    description: "",
    category: "other" as string,
    amount: "",
    expense_date: today,
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      setError(t("validation.invalidAmount"));
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/owner/purchasing/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          category: form.category,
          amount,
          expense_date: form.expense_date,
          notes: form.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t("createFailed"));
        return;
      }

      const { expense } = await res.json();
      onCreated(expense);
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
      <h3 className="text-sm font-semibold">{t("addExpenseTitle")}</h3>

      {/* Description */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          {t("fields.description")}
        </label>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
          placeholder={t("fields.descriptionPlaceholder")}
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
            {expenseCategoryValues.map((cat) => (
              <option key={cat} value={cat}>
                {t(`expenseCategories.${cat}`)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {t("fields.expenseDate")}
          </label>
          <input
            type="date"
            value={form.expense_date}
            onChange={(e) => setForm((f) => ({ ...f, expense_date: e.target.value }))}
            required
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          {t("fields.amount")}
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={form.amount}
          onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
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
        <input
          type="text"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder={t("fields.notesPlaceholder")}
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
