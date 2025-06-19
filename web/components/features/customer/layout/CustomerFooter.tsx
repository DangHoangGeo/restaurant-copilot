"use client";
import React from "react";
import { useTranslations } from "next-intl";
import type { RestaurantSettings } from "@/shared/types/customer";
import Link from "next/link";

interface CustomerFooterProps {
  restaurantSettings: RestaurantSettings;
}

export function CustomerFooter({ restaurantSettings }: CustomerFooterProps) {
  const t = useTranslations("common");
  return (
    <footer className="bg-slate-100 dark:bg-slate-800 py-8 text-center">
      <p className="text-slate-600 dark:text-slate-400 text-sm">
        &copy; {new Date().getFullYear()} {restaurantSettings.name}.{" "}
        {t("all_rights_reserved")}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        {t("powered_by")} <Link target="_blank" href="https://coorder.ai">coorder.ai</Link>
      </p>
    </footer>
  );
}
