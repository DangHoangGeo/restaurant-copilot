"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import { purchaseCategoryValues } from "@/lib/server/purchasing/schemas";
import type { BranchFinanceRecentPurchase } from "@/lib/server/control/branch-finance-detail";
import type { Supplier } from "@/lib/server/purchasing/types";

interface OwnerBranchPurchaseOrderDialogProps {
  branchId: string;
  branchName: string;
  currency: string;
  label?: string;
  className?: string;
  onCreated?: (purchase: BranchFinanceRecentPurchase) => void;
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OwnerBranchPurchaseOrderDialog({
  branchId,
  branchName,
  currency,
  label,
  className,
  onCreated,
}: OwnerBranchPurchaseOrderDialogProps) {
  const tFinance = useTranslations("owner.finance");
  const tPurchasing = useTranslations("owner.purchasing");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    supplier_id: "",
    supplier_name: "",
    category: "food",
    order_date: todayInputValue(),
    total_amount: "",
    notes: "",
    is_paid: false,
  });
  const inputClassName =
    "h-10 rounded-md border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-[#FFF7E9] placeholder:text-[#8F7762] focus-visible:ring-[#D6A85F]/35";

  useEffect(() => {
    if (!open || suppliers.length > 0 || supplierLoading) return;

    setSupplierLoading(true);
    fetch(
      `/api/v1/owner/organization/restaurants/${branchId}/purchasing/suppliers`,
    )
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            body.error ?? tFinance("spending.suppliersLoadFailed"),
          );
        setSuppliers((body.suppliers ?? []) as Supplier[]);
      })
      .catch((loadError) => {
        toast.error(
          loadError instanceof Error
            ? loadError.message
            : tFinance("spending.suppliersLoadFailed"),
        );
      })
      .finally(() => setSupplierLoading(false));
  }, [branchId, open, supplierLoading, suppliers.length, tFinance]);

  const resetForm = () => {
    setForm({
      supplier_id: "",
      supplier_name: "",
      category: "food",
      order_date: todayInputValue(),
      total_amount: "",
      notes: "",
      is_paid: false,
    });
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) resetForm();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const totalAmount = Number(form.total_amount);
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      setError(tPurchasing("validation.invalidAmount"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/v1/owner/organization/restaurants/${branchId}/purchasing/orders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: form.supplier_id || null,
            supplier_name: form.supplier_id ? null : form.supplier_name || null,
            category: form.category,
            order_date: form.order_date,
            total_amount: totalAmount,
            currency,
            notes: form.notes || null,
            is_paid: form.is_paid,
          }),
        },
      );

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? tPurchasing("createFailed"));

      if (body.order) {
        onCreated?.(body.order as BranchFinanceRecentPurchase);
      }
      toast.success(
        tFinance("spending.purchaseOrderSaved", { branch: branchName }),
      );
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
      <Button type="button" className={className} onClick={() => setOpen(true)}>
        <PackagePlus className="h-4 w-4" />
        {label ?? tFinance("spending.addPurchaseOrderTitle")}
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[92svh] overflow-y-auto rounded-lg border-[#F1DCC4]/14 bg-[#17110C] p-0 text-[#FFF7E9] shadow-2xl shadow-black/40 sm:max-w-xl">
          <div className="border-b border-[#F1DCC4]/10 bg-[#FFF7E9]/6 px-5 py-4">
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[#FFF7E9]">
                {tFinance("spending.addPurchaseOrderTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#CDBAA3]">
                {tFinance("spending.purchaseOrderDialogHint", {
                  branch: branchName,
                })}
              </DialogDescription>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#D8C6AF]">
                  {tPurchasing("fields.savedSupplier")}
                </Label>
                <Select
                  value={form.supplier_id || "manual"}
                  onValueChange={(supplierId) => {
                    const selected = suppliers.find(
                      (supplier) => supplier.id === supplierId,
                    );
                    setForm((current) => ({
                      ...current,
                      supplier_id: supplierId === "manual" ? "" : supplierId,
                      supplier_name:
                        supplierId === "manual"
                          ? current.supplier_name
                          : (selected?.name ?? current.supplier_name),
                    }));
                  }}
                >
                  <SelectTrigger className={`${inputClassName} w-full`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-[#F1DCC4]/14 bg-[#201812] text-[#FFF7E9]">
                    <SelectItem value="manual">
                      {tPurchasing("fields.savedSupplierPlaceholder")}
                    </SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#D8C6AF]">
                  {tPurchasing("fields.supplierName")}
                </Label>
                <Input
                  value={form.supplier_name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      supplier_name: event.target.value,
                    }))
                  }
                  disabled={Boolean(form.supplier_id)}
                  className={inputClassName}
                  placeholder={tPurchasing("fields.supplierNamePlaceholder")}
                />
              </div>
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
                    {purchaseCategoryValues.map((category) => (
                      <SelectItem key={category} value={category}>
                        {tPurchasing(`categories.${category}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#D8C6AF]">
                  {tPurchasing("fields.orderDate")}
                </Label>
                <Input
                  type="date"
                  value={form.order_date}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      order_date: event.target.value,
                    }))
                  }
                  required
                  className={inputClassName}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#D8C6AF]">
                  {tPurchasing("fields.totalAmount")}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.total_amount}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      total_amount: event.target.value,
                    }))
                  }
                  required
                  className={inputClassName}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-[#D8C6AF]">
                {tPurchasing("fields.notes")}
              </Label>
              <Textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                rows={3}
                className="min-h-20 resize-none rounded-md border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-[#FFF7E9] placeholder:text-[#8F7762] focus-visible:ring-[#D6A85F]/35"
                placeholder={tPurchasing("fields.notesPlaceholder")}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-md border border-[#F1DCC4]/12 bg-[#FFF7E9]/6 px-3 py-3 text-sm text-[#FFF7E9]">
              <Checkbox
                checked={form.is_paid}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    is_paid: checked === true,
                  }))
                }
                className="border-[#E9C27B]/60 data-[state=checked]:border-[#E9C27B] data-[state=checked]:bg-[#E9C27B] data-[state=checked]:text-[#20150C]"
              />
              {tPurchasing("fields.markAsPaid")}
            </label>

            {error ? <p className="text-xs text-[#F2B36F]">{error}</p> : null}

            <DialogFooter className="gap-2 border-t border-[#F1DCC4]/10 pt-4">
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
                className="rounded-md bg-[#E9C27B] text-[#20150C] hover:bg-[#FFD991]"
              >
                <PackagePlus className="h-4 w-4" />
                {saving ? tPurchasing("saving") : tPurchasing("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
