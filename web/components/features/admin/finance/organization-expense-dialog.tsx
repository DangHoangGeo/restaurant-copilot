"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { expenseCategoryValues } from "@/lib/server/purchasing/schemas";

interface OrganizationExpenseDialogProps {
  currency: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function OrganizationExpenseDialog({
  currency,
  variant = "default",
  size = "sm",
  className,
}: OrganizationExpenseDialogProps) {
  const tFinance = useTranslations("owner.finance");
  const tPurchasing = useTranslations("owner.purchasing");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: "",
    category: "miscellaneous",
    vendor_name: "",
    amount: "",
    expense_date: today,
    notes: "",
  });

  const resetForm = () => {
    setForm({
      description: "",
      category: "miscellaneous",
      vendor_name: "",
      amount: "",
      expense_date: today,
      notes: "",
    });
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(tPurchasing("validation.invalidAmount"));
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        "/api/v1/owner/organization/finance/expenses",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: form.description,
            category: form.category,
            vendor_name: form.vendor_name || null,
            amount,
            currency,
            expense_date: form.expense_date,
            notes: form.notes || null,
          }),
        },
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? tPurchasing("createFailed"));
      }

      toast.success(tFinance("company.sharedExpenses.saved"));
      router.refresh();
      handleOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : tPurchasing("createFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        {tFinance("company.sharedExpenses.add")}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg rounded-[28px]">
          <DialogHeader>
            <DialogTitle>
              {tFinance("company.sharedExpenses.dialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {tFinance("company.sharedExpenses.dialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {tPurchasing("fields.description")}
              </Label>
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                required
                className="h-10 rounded-xl"
                placeholder={tFinance(
                  "company.sharedExpenses.descriptionPlaceholder",
                )}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {tPurchasing("fields.category")}
                </Label>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {expenseCategoryValues.map((category) => (
                    <option key={category} value={category}>
                      {tPurchasing(`expenseCategories.${category}`)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  {tFinance("company.sharedExpenses.vendor")}
                </Label>
                <Input
                  value={form.vendor_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      vendor_name: event.target.value,
                    }))
                  }
                  className="h-10 rounded-xl"
                  placeholder={tFinance(
                    "company.sharedExpenses.vendorPlaceholder",
                  )}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {tPurchasing("fields.amount")}
                </Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  required
                  className="h-10 rounded-xl"
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">
                  {tPurchasing("fields.expenseDate")}
                </Label>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      expense_date: event.target.value,
                    }))
                  }
                  required
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{tPurchasing("fields.notes")}</Label>
              <Input
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="h-10 rounded-xl"
                placeholder={tPurchasing("fields.notesPlaceholder")}
              />
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <DialogFooter className="gap-2">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => handleOpenChange(false)}
                >
                  {tPurchasing("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-1.5 rounded-xl"
                >
                  <Receipt className="h-4 w-4" />
                  {saving ? tPurchasing("saving") : tPurchasing("save")}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
