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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { expenseCategoryValues } from "@/lib/server/purchasing/schemas";
import type { BranchFinanceRecentExpense } from "@/lib/server/control/branch-finance-detail";

interface OwnerBranchExpenseDialogProps {
  branchId: string;
  branchName: string;
  currency: string;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  onCreated?: (expense: BranchFinanceRecentExpense) => void;
}

export function OwnerBranchExpenseDialog({
  branchId,
  branchName,
  currency,
  label,
  variant = "outline",
  size = "sm",
  className,
  onCreated,
}: OwnerBranchExpenseDialogProps) {
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
    amount: "",
    expense_date: today,
    notes: "",
  });

  const resetForm = () => {
    setForm({
      description: "",
      category: "miscellaneous",
      amount: "",
      expense_date: today,
      notes: "",
    });
    setError(null);
  };
  const inputClassName =
    "h-10 rounded-md border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-[#FFF7E9] placeholder:text-[#8F7762] focus-visible:ring-[#D6A85F]/35";

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
      const res = await fetch(
        `/api/v1/owner/organization/restaurants/${branchId}/purchasing/expenses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            description: form.description,
            category: form.category,
            amount,
            currency,
            expense_date: form.expense_date,
            notes: form.notes || null,
          }),
        },
      );

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? tPurchasing("createFailed"));
      }

      if (body.expense) {
        onCreated?.(body.expense as BranchFinanceRecentExpense);
      }

      toast.success(tFinance("spending.expenseSaved", { branch: branchName }));
      router.refresh();
      handleOpenChange(false);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : tPurchasing("createFailed");
      setError(message);
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
        {label ?? tPurchasing("addExpense")}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[92svh] overflow-y-auto rounded-lg border-[#F1DCC4]/14 bg-[#17110C] p-0 text-[#FFF7E9] shadow-2xl shadow-black/40 sm:max-w-xl">
          <div className="border-b border-[#F1DCC4]/10 bg-[#FFF7E9]/6 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[#FFF7E9]">
                {tFinance("spending.addExpenseTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#CDBAA3]">
                {tFinance("spending.dialogHint", { branch: branchName })}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            <div className="border-b border-[#F1DCC4]/10 pb-4">
              <p className="text-sm font-medium text-[#FFF7E9]">
                {tFinance("spending.quickExpenseTitle")}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#CDBAA3]">
                {tFinance("spending.quickExpenseBody")}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#D8C6AF]">
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
                className={inputClassName}
                placeholder={tPurchasing("fields.descriptionPlaceholder")}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#D8C6AF]">
                  {tPurchasing("fields.category")}
                </Label>
                <Select
                  value={form.category}
                  onValueChange={(category) =>
                    setForm((current) => ({ ...current, category }))
                  }
                >
                  <SelectTrigger className={`${inputClassName} w-full`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#F1DCC4]/14 bg-[#201812] text-[#FFF7E9]">
                    {expenseCategoryValues.map((category) => (
                      <SelectItem key={category} value={category}>
                        {tPurchasing(`expenseCategories.${category}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#D8C6AF]">
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
                  className={inputClassName}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#D8C6AF]">
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
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#D8C6AF]">
                {tPurchasing("fields.notes")}
              </Label>
              <Input
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className={inputClassName}
                placeholder={tPurchasing("fields.notesPlaceholder")}
              />
            </div>

            {error ? <p className="text-xs text-[#F2B36F]">{error}</p> : null}

            <DialogFooter className="gap-3 border-t border-[#F1DCC4]/10 pt-4">
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-md text-[#D8C6AF] hover:bg-[#FFF7E9]/10 hover:text-[#FFF7E9]"
                  onClick={() => handleOpenChange(false)}
                >
                  {tPurchasing("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-1.5 rounded-md bg-[#E9C27B] text-[#20150C] hover:bg-[#FFD991]"
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
