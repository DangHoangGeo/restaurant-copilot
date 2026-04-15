"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Package, Plus, Edit2, Trash2, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface InventoryItem {
  id: string;
  restaurant_id: string;
  menu_item_id: string | null;
  stock_level: number;
  threshold: number;
  created_at: string;
  updated_at: string;
}

interface InventoryClientContentProps {
  initialItems: InventoryItem[];
  canWrite: boolean;
  locale: string;
}

type SortField = "name" | "stock" | "threshold";
type SortOrder = "asc" | "desc";

export function InventoryClientContent({
  initialItems,
  canWrite,
  locale,
}: InventoryClientContentProps) {
  const t = useTranslations("owner.inventory");
  const { toast } = useToast();

  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<SortField>("stock");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const [formData, setFormData] = useState({
    stock_level: 0,
    threshold: 0,
  });

  // Calculate stats
  const totalItems = items.length;
  const lowStockItems = items.filter((item) => item.stock_level < item.threshold);
  const outOfStockItems = items.filter((item) => item.stock_level === 0);

  // Sort items
  const sortedItems = [...items].sort((a, b) => {
    let aVal: number;
    let bVal: number;

    switch (sortField) {
      case "stock":
        aVal = a.stock_level;
        bVal = b.stock_level;
        break;
      case "threshold":
        aVal = a.threshold;
        bVal = b.threshold;
        break;
      case "name":
      default:
        // For now, sort by stock_level as we don't have name field
        aVal = a.stock_level;
        bVal = b.stock_level;
    }

    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  const getStatusBadge = (item: InventoryItem) => {
    if (item.stock_level === 0) {
      return {
        label: t("status.outOfStock"),
        color: "bg-red-100 text-red-800",
        icon: AlertCircle,
      };
    }
    if (item.stock_level < item.threshold) {
      return {
        label: t("status.low"),
        color: "bg-amber-100 text-amber-800",
        icon: AlertTriangle,
      };
    }
    return {
      label: t("status.ok"),
      color: "bg-green-100 text-green-800",
      icon: null,
    };
  };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        stock_level: item.stock_level,
        threshold: item.threshold,
      });
    } else {
      setEditingItem(null);
      setFormData({
        stock_level: 0,
        threshold: 5,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      stock_level: 0,
      threshold: 5,
    });
  };

  const handleSave = useCallback(async () => {
    if (formData.stock_level < 0 || formData.threshold < 0) {
      toast({
        title: t("validation.invalidValues"),
        description: t("validation.nonNegative"),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (editingItem) {
        // Update existing item
        const response = await fetch(
          `/api/v1/owner/inventory/${editingItem.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formData),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to update inventory item");
        }

        const data = await response.json();
        setItems(items.map((item) => (item.id === editingItem.id ? data.data.item : item)));
        toast({
          title: t("successUpdate"),
          variant: "default",
        });
      } else {
        // Create new item
        const response = await fetch("/api/v1/owner/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error("Failed to create inventory item");
        }

        const data = await response.json();
        setItems([data.data.item, ...items]);
        toast({
          title: t("successCreate"),
          variant: "default",
        });
      }

      handleCloseDialog();
    } catch (error) {
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("errorUnknown"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [editingItem, formData, items, t, toast]);

  const handleDelete = useCallback(
    async (item: InventoryItem) => {
      if (!window.confirm(t("confirmDelete"))) return;

      setIsDeleting(true);
      try {
        const response = await fetch(`/api/v1/owner/inventory/${item.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete inventory item");
        }

        setItems(items.filter((i) => i.id !== item.id));
        toast({
          title: t("successDelete"),
          variant: "default",
        });
      } catch (error) {
        toast({
          title: t("error"),
          description: error instanceof Error ? error.message : t("errorUnknown"),
          variant: "destructive",
        });
      } finally {
        setIsDeleting(false);
      }
    },
    [items, t, toast]
  );

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{t("pageTitle")}</h1>
              <p className="text-xs text-muted-foreground">{t("pageDescription")}</p>
            </div>
          </div>
          {canWrite && (
            <Button
              onClick={() => handleOpenDialog()}
              className="gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" />
              {t("addItem")}
            </Button>
          )}
        </div>

        {/* Low stock alert banner */}
        {lowStockItems.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">{t("lowStockAlert.title")}</h3>
              <p className="text-sm text-amber-800">
                {t("lowStockAlert.description", { count: lowStockItems.length })}
              </p>
            </div>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("stats.totalItems")}</span>
            </div>
            <p className="text-2xl font-semibold">{totalItems}</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">{t("stats.lowStock")}</span>
            </div>
            <p className="text-2xl font-semibold text-amber-600">{lowStockItems.length}</p>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">{t("stats.outOfStock")}</span>
            </div>
            <p className="text-2xl font-semibold text-red-600">{outOfStockItems.length}</p>
          </div>
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 sm:p-12 flex flex-col items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">{t("empty.title")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("empty.description")}</p>
            {canWrite && (
              <Button onClick={() => handleOpenDialog()} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                {t("addItem")}
              </Button>
            )}
          </div>
        ) : (
          /* Items table */
          <div className="rounded-lg border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs font-medium text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("table.id")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("table.stock")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("table.threshold")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("table.status")}
                    </th>
                    {canWrite && (
                      <th className="px-4 py-3 text-right font-semibold">
                        {t("table.actions")}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sortedItems.map((item) => {
                    const status = getStatusBadge(item);
                    const StatusIcon = status.icon;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {item.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{item.stock_level}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {item.threshold}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {StatusIcon && (
                              <StatusIcon className="h-4 w-4" />
                            )}
                            <span
                              className={cn(
                                "px-2 py-1 rounded-full text-xs font-medium",
                                status.color
                              )}
                            >
                              {status.label}
                            </span>
                          </div>
                        </td>
                        {canWrite && (
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenDialog(item)}
                                className="gap-2"
                              >
                                <Edit2 className="h-4 w-4" />
                                <span className="hidden sm:inline">{t("edit")}</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item)}
                                disabled={isDeleting}
                                className="gap-2 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline">{t("delete")}</span>
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      {canWrite && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? t("dialog.editTitle") : t("dialog.addTitle")}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? t("dialog.editDescription") : t("dialog.addDescription")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="stock_level">{t("fields.stock")}</Label>
                <Input
                  id="stock_level"
                  type="number"
                  min="0"
                  value={formData.stock_level}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stock_level: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">{t("fields.threshold")}</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  value={formData.threshold}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      threshold: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                disabled={isLoading}
              >
                {t("cancel")}
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? t("saving") : t("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
