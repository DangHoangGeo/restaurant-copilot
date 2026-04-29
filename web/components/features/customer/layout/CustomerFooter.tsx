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
    <footer className="border-t border-[#f1dcc4]/10 bg-[#14100b] py-8 text-center">
      <p className="text-sm text-[#c9b7a0]">
        &copy; {new Date().getFullYear()} {restaurantSettings.name}.{" "}
        {t("all_rights_reserved")}
      </p>
      <p className="mt-1 text-xs text-[#c9b7a0]/70">
        {t("powered_by")} <Link target="_blank" href="https://coorder.ai">coorder.ai</Link>
      </p>
    </footer>
  );
}
