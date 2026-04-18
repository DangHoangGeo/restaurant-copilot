'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Plus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { expenseCategoryValues } from '@/lib/server/purchasing/schemas';
import type { BranchFinanceRecentExpense } from '@/lib/server/control/branch-finance-detail';

interface OwnerBranchExpenseDialogProps {
  branchId: string;
  branchName: string;
  currency: string;
  label?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onCreated?: (expense: BranchFinanceRecentExpense) => void;
}

export function OwnerBranchExpenseDialog({
  branchId,
  branchName,
  currency,
  label,
  variant = 'outline',
  size = 'sm',
  className,
  onCreated,
}: OwnerBranchExpenseDialogProps) {
  const tFinance = useTranslations('owner.finance');
  const tPurchasing = useTranslations('owner.purchasing');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: '',
    category: 'miscellaneous',
    amount: '',
    expense_date: today,
    notes: '',
  });

  const resetForm = () => {
    setForm({
      description: '',
      category: 'miscellaneous',
      amount: '',
      expense_date: today,
      notes: '',
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
      setError(tPurchasing('validation.invalidAmount'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/v1/owner/organization/restaurants/${branchId}/purchasing/expenses`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: form.description,
            category: form.category,
            amount,
            currency,
            expense_date: form.expense_date,
            notes: form.notes || null,
          }),
        }
      );

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? tPurchasing('createFailed'));
      }

      if (body.expense) {
        onCreated?.(body.expense as BranchFinanceRecentExpense);
      }

      toast.success(tFinance('spending.expenseSaved', { branch: branchName }));
      router.refresh();
      handleOpenChange(false);
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : tPurchasing('createFailed');
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {label ?? tPurchasing('addExpense')}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{tFinance('spending.addExpenseTitle')}</DialogTitle>
            <DialogDescription>
              {tFinance('spending.dialogHint', { branch: branchName })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">{tPurchasing('fields.description')}</Label>
              <Input
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                required
                className="h-10 rounded-xl"
                placeholder={tPurchasing('fields.descriptionPlaceholder')}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{tPurchasing('fields.category')}</Label>
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
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
                <Label className="text-xs">{tPurchasing('fields.amount')}</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={form.amount}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, amount: event.target.value }))
                  }
                  required
                  className="h-10 rounded-xl"
                  placeholder="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{tPurchasing('fields.expenseDate')}</Label>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, expense_date: event.target.value }))
                  }
                  required
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{tPurchasing('fields.notes')}</Label>
              <Input
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
                className="h-10 rounded-xl"
                placeholder={tPurchasing('fields.notesPlaceholder')}
              />
            </div>

            {error ? <p className="text-xs text-destructive">{error}</p> : null}

            <DialogFooter className="gap-2 sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {tFinance('spending.auditHint')}
              </p>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" className="rounded-xl" onClick={() => handleOpenChange(false)}>
                  {tPurchasing('cancel')}
                </Button>
                <Button type="submit" disabled={saving} className="gap-1.5 rounded-xl">
                  <Receipt className="h-4 w-4" />
                  {saving ? tPurchasing('saving') : tPurchasing('save')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
