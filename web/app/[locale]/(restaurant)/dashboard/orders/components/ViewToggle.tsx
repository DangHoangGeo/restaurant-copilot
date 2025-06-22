"use client";

import { Button } from "@/components/ui/button";
import { Grid3X3, List, Eye } from "lucide-react";
import { useTranslations } from "next-intl";

interface ViewToggleProps {
  viewType: "items" | "orders" | "grid";
  onViewTypeChange: (viewType: "items" | "orders" | "grid") => void;
}

export function ViewToggle({ viewType, onViewTypeChange }: ViewToggleProps) {
  const t = useTranslations("owner.orders");

  return (
    <div className="flex space-x-2 mb-6">
      <Button
        variant={viewType === "grid" ? "default" : "outline"}
        onClick={() => onViewTypeChange("grid")}
      >
        <Grid3X3 className="h-4 w-4 mr-2" />
        {t('gridView')}
      </Button>
      <Button
        variant={viewType === "items" ? "default" : "outline"}
        onClick={() => onViewTypeChange("items")}
      >
        <List className="h-4 w-4 mr-2" />
        {t('listView')}
      </Button>
      <Button
        variant={viewType === "orders" ? "default" : "outline"}
        onClick={() => onViewTypeChange("orders")}
      >
        <Eye className="h-4 w-4 mr-2" />
        {t('orderView')}
      </Button>
    </div>
  );
}
