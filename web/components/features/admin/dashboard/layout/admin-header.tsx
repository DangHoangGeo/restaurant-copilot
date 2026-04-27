"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu as MenuIcon,
  Moon,
  Sun,
  ChevronDown,
  User,
  LogOut,
  ArrowLeft,
} from "lucide-react";
import { useTheme } from "next-themes";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { usePathname, useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { buildBranchPath, normalizeBranchPathname } from "@/lib/branch-paths";

// This mapping should ideally live in a config file
const viewNameMap: Record<string, string> = {
  "/branch": "admin_sidebar_dashboard",
  "/branch/orders": "admin_sidebar_orders",
  "/branch/homepage": "admin_sidebar_homepage_management",
  "/branch/settings": "admin_sidebar_restaurant_settings",
  "/branch/menu": "admin_sidebar_menu_management",
  "/branch/tables": "admin_sidebar_table_qr_management",
  "/branch/employees": "admin_sidebar_employees_schedules",
  "/branch/bookings": "admin_sidebar_bookings_preorders",
  "/branch/reports": "admin_sidebar_reports_analytics",
  "/branch/purchasing": "admin_sidebar_purchasing",
  "/branch/finance": "admin_sidebar_finance",
  "/branch/promotions": "admin_sidebar_promotions",
  "/branch/staff": "admin_sidebar_staff",
  "/branch/branches": "admin_sidebar_branches",
  "/branch/organization": "admin_sidebar_organization",
  "/branch/profile": "admin_sidebar_profile",
};

interface AdminHeaderProps {
  toggleSidebar: () => void;
  restaurantSettings?: {
    name: string;
    logoUrl?: string | null;
  };
  currentLocale: string;
  onLocaleChange: (locale: string) => void;
  ownerControlHref?: string | null;
}

export function AdminHeader({
  toggleSidebar,
  currentLocale,
  onLocaleChange,
  ownerControlHref,
}: AdminHeaderProps) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations("owner.dashboard");
  const tNav = useTranslations("owner.dashboard");
  const tCommon = useTranslations("common");
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const locale = (params.locale as string) || "en";
  const branchId = typeof params.branchId === "string" ? params.branchId : null;

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Logout failed:", data.error || "Unknown error");
        // Still attempt to redirect even if API call fails
      }

      // Redirect to login page
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error("Logout request failed:", error);
      // Redirect anyway in case of network error
      router.push(`/${locale}/login`);
    }
  };

  // Determine current page title based on pathname
  const basePath = normalizeBranchPathname(pathname, locale, branchId);
  let currentPageTitleKey = viewNameMap[basePath];

  // Handle dynamic routes
  if (!currentPageTitleKey) {
    if (basePath.startsWith("/branch/menu/")) {
      currentPageTitleKey = "admin_sidebar_menu_management";
    } else if (basePath.startsWith("/branch/tables/")) {
      currentPageTitleKey = "admin_sidebar_table_qr_management";
    } else if (basePath.startsWith("/branch/employees/")) {
      currentPageTitleKey = "admin_sidebar_employees_schedules";
    }
  }

  // Fallback to dashboard if no match found
  if (!currentPageTitleKey) {
    currentPageTitleKey = "admin_sidebar_dashboard";
  }

  return (
    <header
      className="sticky top-0 z-50 border-b border-[#AB6E3C]/10 bg-[#FAF3EA]/85 shadow-sm backdrop-blur-md dark:border-[#AB6E3C]/15 dark:bg-[#170F0C]/85"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="mr-2 h-10 w-10 rounded-full text-[#8B6E5A] hover:bg-[#F5EAD8] hover:text-[#AB6E3C] dark:text-[#B89078] dark:hover:bg-[#251810] dark:hover:text-[#AB6E3C] lg:hidden"
            aria-label={t("sidebar.toggle_aria_label")}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <h1 className="truncate text-lg font-semibold text-[#2E2117] sm:text-xl dark:text-[#F7F1E9]">
            {tNav(currentPageTitleKey)}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher
            currentLocale={currentLocale}
            onLocaleChange={onLocaleChange}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="h-10 w-10 rounded-full text-[#8B6E5A] hover:bg-[#F5EAD8] hover:text-[#AB6E3C] dark:text-[#B89078] dark:hover:bg-[#251810] dark:hover:text-[#AB6E3C]"
            aria-label={tCommon("theme.toggle_aria_label")}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{tCommon("theme.toggle_label")}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex h-10 items-center rounded-full px-2 text-[#8B6E5A] hover:bg-[#F5EAD8] hover:text-[#AB6E3C] sm:px-3 dark:text-[#B89078] dark:hover:bg-[#251810] dark:hover:text-[#AB6E3C]"
              >
                <div className="mr-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#AB6E3C]/10 sm:mr-2">
                  <User className="h-4 w-4 text-[#AB6E3C]" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {t("user_menu.my_account_label")}
                </span>
                <ChevronDown className="ml-0 sm:ml-1 h-4 w-4 text-muted-foreground hidden sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                {t("user_menu.my_account_label")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={buildBranchPath(locale, branchId, "profile")}>
                  <User className="mr-2 h-4 w-4" />{" "}
                  {t("user_menu.profile_link")}
                </Link>
              </DropdownMenuItem>
              {ownerControlHref ? (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link
                    href={ownerControlHref}
                    aria-label={t("owner_control_back_aria_label")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />{" "}
                    {t("owner_control_back_label")}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 dark:text-red-400 cursor-pointer focus:bg-red-50 dark:focus:bg-red-900/50 focus:text-red-600 dark:focus:text-red-400"
              >
                <LogOut className="mr-2 h-4 w-4" />{" "}
                {t("user_menu.logout_button")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
