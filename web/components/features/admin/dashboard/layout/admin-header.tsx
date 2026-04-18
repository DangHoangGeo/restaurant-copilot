'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu as MenuIcon, Moon, Sun, ChevronDown, User, LogOut, ArrowLeft } from 'lucide-react';
import { useTheme } from 'next-themes';
import { LanguageSwitcher } from '@/components/common/language-switcher';
import { usePathname, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

// This mapping should ideally live in a config file
const viewNameMap: Record<string, string> = {
  '/branch': 'admin_sidebar_dashboard',
  '/branch/homepage': 'admin_sidebar_homepage_management',
  '/branch/settings': 'admin_sidebar_restaurant_settings',
  '/branch/menu': 'admin_sidebar_menu_management',
  '/branch/tables': 'admin_sidebar_table_qr_management',
  '/branch/employees': 'admin_sidebar_employees_schedules',
  '/branch/bookings': 'admin_sidebar_bookings_preorders',
  '/branch/reports': 'admin_sidebar_reports_analytics',
  '/branch/purchasing': 'admin_sidebar_purchasing',
  '/branch/finance': 'admin_sidebar_finance',
  '/branch/promotions': 'admin_sidebar_promotions',
  '/branch/branches': 'admin_sidebar_branches',
  '/branch/organization': 'admin_sidebar_organization',
  '/branch/profile': 'admin_sidebar_profile',
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
  const t = useTranslations('owner.dashboard');
  const tNav = useTranslations('owner.dashboard');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string || 'en';

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('Logout failed:', data.error || 'Unknown error');
        // Still attempt to redirect even if API call fails
      }
      
      // Redirect to login page
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error('Logout request failed:', error);
      // Redirect anyway in case of network error
      router.push(`/${locale}/login`);
    }
  };

  // Determine current page title based on pathname
  // Remove locale from pathname for matching
  const basePath = pathname.replace(`/${locale}`, '');
  let currentPageTitleKey = viewNameMap[basePath];

  // Handle dynamic routes
  if (!currentPageTitleKey) {
    if (basePath.startsWith('/branch/menu/')) {
      currentPageTitleKey = 'admin_sidebar_menu_management';
    } else if (basePath.startsWith('/branch/tables/')) {
      currentPageTitleKey = 'admin_sidebar_table_qr_management';
    } else if (basePath.startsWith('/branch/employees/')) {
      currentPageTitleKey = 'admin_sidebar_employees_schedules';
    }
  }

  // Fallback to dashboard if no match found
  if (!currentPageTitleKey) {
    currentPageTitleKey = 'admin_sidebar_dashboard';
  }

  return (
    <header 
      className="bg-card dark:bg-slate-800 shadow-sm sticky top-0 z-50 border-b"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)'
      }}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="lg:hidden mr-2"
            aria-label={t('sidebar.toggle_aria_label')}
          >
            <MenuIcon className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">
            {tNav(currentPageTitleKey)}
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3">
          {ownerControlHref ? (
            <>
              <Button asChild variant="outline" size="icon" className="rounded-xl md:hidden">
                <Link href={ownerControlHref} aria-label="Back to owner">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="hidden rounded-xl md:inline-flex">
                <Link href={ownerControlHref}>
                  <ArrowLeft className="h-4 w-4" />
                  Back to owner
                </Link>
              </Button>
            </>
          ) : null}
          <LanguageSwitcher currentLocale={currentLocale} onLocaleChange={onLocaleChange} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={tCommon('theme.toggle_aria_label')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{tCommon('theme.toggle_label')}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center px-2 sm:px-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-0 sm:mr-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {t('user_menu.admin_user_placeholder')}
                </span>
                <ChevronDown className="ml-0 sm:ml-1 h-4 w-4 text-muted-foreground hidden sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('user_menu.my_account_label')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href={`/${locale}/branch/profile`} passHref legacyBehavior>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a><User className="mr-2 h-4 w-4" /> {t('user_menu.profile_link')}</a>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400 cursor-pointer focus:bg-red-50 dark:focus:bg-red-900/50 focus:text-red-600 dark:focus:text-red-400">
                <LogOut className="mr-2 h-4 w-4" /> {t('user_menu.logout_button')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
