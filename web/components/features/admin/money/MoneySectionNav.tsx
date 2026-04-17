"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FileText, ShoppingCart, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface MoneySectionNavProps {
  locale: string;
  financeHref?: string;
  purchasingHref?: string;
  promotionsHref?: string;
}

export function MoneySectionNav({
  locale,
  financeHref = "/dashboard/finance",
  purchasingHref = "/dashboard/purchasing",
  promotionsHref = "/dashboard/promotions",
}: MoneySectionNavProps) {
  const pathname = usePathname();
  const t = useTranslations("owner.dashboard");
  const items = [
    {
      href: financeHref,
      labelKey: "admin_sidebar_finance",
      icon: FileText,
    },
    {
      href: purchasingHref,
      labelKey: "admin_sidebar_purchasing",
      icon: ShoppingCart,
    },
    {
      href: promotionsHref,
      labelKey: "admin_sidebar_promotions",
      icon: Tag,
    },
  ] as const;

  return (
    <div className="space-y-2">
      <div className="px-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("nav_group_money")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("money_section_hint")}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {items.map(({ href, labelKey, icon: Icon }) => {
          const fullHref = `/${locale}${href}`;
          const isActive = pathname.startsWith(fullHref);

          return (
            <Link
              key={href}
              href={fullHref}
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{t(labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
