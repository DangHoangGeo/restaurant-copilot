"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Banknote, CheckCircle, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";

interface PayrollRecord {
  id: string;
  employee_id: string;
  employee_name: string | null;
  pay_period_start: string;
  pay_period_end: string;
  total_hours: number;
  hourly_rate: number | null;
  base_pay: number | null;
  bonus: number;
  bonus_reason: string | null;
  deductions: number;
  total_pay: number | null;
  currency: string;
  status: string;
  notes: string | null;
  approved_at: string | null;
  paid_at: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
  approved: { label: "Approved", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  paid: { label: "Paid", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

function formatCurrency(amount: number | null, currency: string): string {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function formatPeriod(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  if (s.getMonth() === e.getMonth()) {
    return s.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return `${s.toLocaleDateString("en-US", { month: "short" })} – ${e.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
}

function getMonthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}
export default function PayrollDashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [bonus, setBonus] = useState("");
  const [bonusReason, setBonusReason] = useState("");
  const [deductions, setDeductions] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const from = getMonthStart(year, month);
      const res = await fetch(`/api/v1/owner/payroll?period_start=${from}`);
      const data = await res.json();
      setRecords(data.records ?? []);
    } catch {
      toast.error("Failed to load payroll records");
    } finally {
      setIsLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const openEdit = (record: PayrollRecord) => {
    setEditingRecord(record);
    setBonus(String(record.bonus));
    setBonusReason(record.bonus_reason ?? "");
    setDeductions(String(record.deductions));
  };

  const handleUpdate = async (status?: "approved" | "paid") => {
    if (!editingRecord) return;
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = {
        bonus: parseFloat(bonus) || 0,
        bonus_reason: bonusReason || undefined,
        deductions: parseFloat(deductions) || 0,
      };
      if (status) body.status = status;

      const res = await fetch(`/api/v1/owner/payroll/${editingRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update payroll");
      toast.success(status ? `Payroll ${status}` : "Payroll updated");
      setEditingRecord(null);
      fetchRecords();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update payroll");
    } finally {
      setIsSaving(false);
    }
  };

  const totalPaid = records.filter(r => r.status === "paid").reduce((s, r) => s + (r.total_pay ?? 0), 0);
  const totalPending = records.filter(r => r.status !== "paid").reduce((s, r) => s + (r.total_pay ?? 0), 0);
  const currency = records[0]?.currency ?? "JPY";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payroll</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[120px] text-center">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-xl">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Pending payment</p>
              <p className="text-xl font-bold mt-0.5">{formatCurrency(totalPending, currency)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-xl bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <p className="text-xs text-green-700 dark:text-green-300">Paid this month</p>
              <p className="text-xl font-bold text-green-800 dark:text-green-200 mt-0.5">{formatCurrency(totalPaid, currency)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-muted-foreground">
          <Banknote className="h-10 w-10 opacity-30" />
          <p className="text-sm">No payroll records for this month</p>
          <p className="text-xs">Records are created when attendance is approved and payroll is calculated.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.draft;
            return (
              <Card key={r.id} className="rounded-xl">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{r.employee_name ?? "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{formatPeriod(r.pay_period_start, r.pay_period_end)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Hours</p>
                      <p className="font-semibold">{r.total_hours.toFixed(1)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Base</p>
                      <p className="font-semibold">{formatCurrency(r.base_pay, r.currency)}</p>
                    </div>
                    <div className={`rounded-lg p-2 text-center ${r.bonus > 0 ? "bg-blue-50 dark:bg-blue-950" : "bg-muted/50"}`}>
                      <p className="text-xs text-muted-foreground">Bonus</p>
                      <p className={`font-semibold ${r.bonus > 0 ? "text-blue-700 dark:text-blue-300" : ""}`}>
                        {formatCurrency(r.bonus, r.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t">
                    <div>
                      <span className="text-xs text-muted-foreground">Total: </span>
                      <span className="font-bold text-sm">{formatCurrency(r.total_pay, r.currency)}</span>
                    </div>
                    {r.status !== "paid" && (
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                        Edit & Approve
                      </Button>
                    )}
                    {r.status === "paid" && r.paid_at && (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span className="text-xs">Paid {new Date(r.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => { if (!open) setEditingRecord(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust & Approve Payroll</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4 pt-2">
              <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employee</span>
                  <span className="font-medium">{editingRecord.employee_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base pay</span>
                  <span className="font-medium">{formatCurrency(editingRecord.base_pay, editingRecord.currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hours worked</span>
                  <span className="font-medium">{editingRecord.total_hours.toFixed(2)} h</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonus-amount">Bonus</Label>
                <Input
                  id="bonus-amount"
                  type="number"
                  min="0"
                  step="100"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonus-reason">Bonus reason (optional)</Label>
                <Input
                  id="bonus-reason"
                  value={bonusReason}
                  onChange={(e) => setBonusReason(e.target.value)}
                  placeholder="e.g. Performance bonus, holiday pay..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deductions">Deductions</Label>
                <Input
                  id="deductions"
                  type="number"
                  min="0"
                  step="100"
                  value={deductions}
                  onChange={(e) => setDeductions(e.target.value)}
                  placeholder="0"
                />
              </div>

              {/* Preview total */}
              <div className="bg-primary/5 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm font-medium">Total Pay</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(
                    (editingRecord.base_pay ?? 0) + (parseFloat(bonus) || 0) - (parseFloat(deductions) || 0),
                    editingRecord.currency
                  )}
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => handleUpdate()} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Draft
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleUpdate("approved")}
                  disabled={isSaving || editingRecord.status === "approved"}
                >
                  Approve
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleUpdate("paid")}
                  disabled={isSaving}
                >
                  Mark Paid
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
