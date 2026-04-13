"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  Download,
  ChevronDown,
  ChevronUp,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PurchaseOrder, Supplier } from "@/lib/server/purchasing/types";
import { AddPurchaseOrderForm } from "./AddPurchaseOrderForm";

interface PurchaseOrderListProps {
  initialOrders: PurchaseOrder[];
  suppliers: Supplier[];
  restaurantCurrency: string;
  monthStart: string;
  monthEnd: string;
  canWrite: boolean;
}

const STATUS_ICON = {
  pending:   <Clock   className="h-4 w-4 text-yellow-500" />,
  received:  <CheckCircle2 className="h-4 w-4 text-green-500" />,
  cancelled: <XCircle className="h-4 w-4 text-muted-foreground" />,
};

export function PurchaseOrderList({
  initialOrders,
  suppliers,
  restaurantCurrency,
  monthStart,
  monthEnd,
  canWrite,
}: PurchaseOrderListProps) {
  const t = useTranslations("owner.purchasing");
  const [orders, setOrders] = useState<PurchaseOrder[]>(initialOrders);
  const [showForm, setShowForm] = useState(false);

  const handleOrderCreated = (order: PurchaseOrder) => {
    setOrders((prev) => [order, ...prev]);
    setShowForm(false);
  };

  const handleMarkPaid = async (orderId: string) => {
    const res = await fetch(`/api/v1/owner/purchasing/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_paid: true }),
    });
    if (res.ok) {
      const { order } = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
    }
  };

  const handleMarkReceived = async (orderId: string) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const res = await fetch(`/api/v1/owner/purchasing/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "received", received_date: today }),
    });
    if (res.ok) {
      const { order } = await res.json();
      setOrders((prev) => prev.map((o) => (o.id === orderId ? order : o)));
    }
  };

  const handleDelete = async (orderId: string) => {
    const res = await fetch(`/api/v1/owner/purchasing/orders/${orderId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: restaurantCurrency || "JPY",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Header + Add button */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("tabs.orders")}
        </h2>
        <div className="flex items-center gap-2">
          <a
            href={`/api/v1/owner/purchasing/export?type=orders&from_date=${monthStart}&to_date=${monthEnd}`}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" />
            {t("exportOrders")}
          </a>
          {canWrite && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              {showForm ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {t("addOrder")}
            </button>
          )}
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <AddPurchaseOrderForm
          onCreated={handleOrderCreated}
          onCancel={() => setShowForm(false)}
          suppliers={suppliers}
        />
      )}

      {/* Empty state */}
      {orders.length === 0 && !showForm && (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          <ShoppingCart className="h-8 w-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("noOrders")}</p>
        </div>
      )}

      {/* Order cards */}
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          formatAmount={formatAmount}
          onMarkPaid={() => handleMarkPaid(order.id)}
          onMarkReceived={() => handleMarkReceived(order.id)}
          onDelete={() => handleDelete(order.id)}
          t={t}
          canWrite={canWrite}
        />
      ))}
    </div>
  );
}

// ─── Order Card ───────────────────────────────────────────

interface OrderCardProps {
  order: PurchaseOrder;
  formatAmount: (n: number) => string;
  onMarkPaid: () => void;
  onMarkReceived: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslations>;
  canWrite: boolean;
}

function OrderCard({ order, formatAmount, onMarkPaid, onMarkReceived, onDelete, t, canWrite }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        order.status === "cancelled" && "opacity-60"
      )}
    >
      {/* Main row */}
      <button
        className="w-full flex items-start gap-3 p-4 text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="mt-0.5">
          {STATUS_ICON[order.status as keyof typeof STATUS_ICON]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm truncate">
              {order.supplier_name ?? t("unknownSupplier")}
            </span>
            <span className="font-semibold text-sm shrink-0">
              {formatAmount(order.total_amount)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">{order.order_date}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground capitalize">{order.category}</span>
            {order.is_paid ? (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <Banknote className="h-3 w-3" />
                {t("paid")}
              </span>
            ) : (
              <span className="text-xs text-yellow-600 font-medium">{t("unpaid")}</span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 pb-4 space-y-3">
          {order.notes && (
            <p className="text-xs text-muted-foreground pt-3">{order.notes}</p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {canWrite && order.status === "pending" && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkReceived();
                }}
                className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors font-medium"
              >
                {t("markReceived")}
              </button>
            )}
            {canWrite && !order.is_paid && order.status !== "cancelled" && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkPaid();
                }}
                className="text-xs px-3 py-1.5 rounded-lg border hover:bg-muted transition-colors font-medium"
              >
                {t("markPaid")}
              </button>
            )}
            {canWrite && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete();
                }}
                className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("delete")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
