'use client';

import Link from 'next/link';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Building2,
  CircleDollarSign,
  ChevronLeft,
  LogOut,
  LayoutGrid,
  Menu,
  Settings,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ControlShellProps {
  children: ReactNode;
  locale: string;
  organizationName: string;
  userEmail: string;
  accessControls: {
    restaurants: boolean;
    people: boolean;
    finance: boolean;
    settings: boolean;
  };
}

interface ControlNavItem {
  href: string;
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
  requiredAccess?: keyof ControlShellProps['accessControls'];
}

const CONTROL_NAV_ITEMS: ControlNavItem[] = [
  {
    href: '/control/overview',
    icon: LayoutGrid,
    labelKey: 'nav.overview',
  },
  {
    href: '/control/restaurants',
    icon: Building2,
    labelKey: 'nav.restaurants',
    requiredAccess: 'restaurants',
  },
  {
    href: '/control/people',
    icon: ShieldCheck,
    labelKey: 'nav.people',
    requiredAccess: 'people',
  },
  {
    href: '/control/finance',
    icon: CircleDollarSign,
    labelKey: 'nav.finance',
    requiredAccess: 'finance',
  },
  {
    href: '/control/settings',
    icon: Settings,
    labelKey: 'nav.settings',
    requiredAccess: 'settings',
  },
];

const SIDEBAR_STORAGE_KEY = 'owner-control-sidebar-open';

export function ControlShell({
  children,
  locale,
  organizationName,
  userEmail,
  accessControls,
}: ControlShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('owner.control');
  const tDashboard = useTranslations('owner.dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = CONTROL_NAV_ITEMS.filter(
    ({ requiredAccess }) => !requiredAccess || accessControls[requiredAccess]
  );

  useEffect(() => {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (storedValue === 'false') {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarOpen));
  }, [sidebarOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } finally {
      router.push(`/${locale}/login`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-foreground">
      <button
        type="button"
        onClick={() => setSidebarOpen((current) => !current)}
        className={cn(
          'fixed top-5 z-50 hidden h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:bg-slate-50 lg:flex',
          sidebarOpen ? 'left-[244px]' : 'left-4'
        )}
        aria-label={sidebarOpen ? 'Hide navigation' : 'Show navigation'}
      >
        {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden w-[288px] shrink-0 border-r border-slate-200 bg-white transition-transform duration-300 lg:flex lg:flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-screen flex-col px-5 py-5">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                <Building2 className="h-3.5 w-3.5" />
                {t('eyebrow')}
              </div>
              <h1 className="text-lg font-semibold text-slate-900">
                {organizationName}
              </h1>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            {navItems.map(({ href, icon: Icon, labelKey }) => {
              const fullHref = `/${locale}${href}`;
              const isActive = pathname.startsWith(fullHref);

              return (
                <Link
                  key={href}
                  href={fullHref}
                  className={cn(
                    'flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(labelKey)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {userEmail}
                </p>
                <p className="text-xs text-slate-500">
                  {tDashboard('user_menu.my_account_label')}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <Link
                href={`/${locale}/control/profile`}
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <User className="h-4 w-4" />
                <span>{tDashboard('user_menu.profile_link')}</span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                className="flex min-h-11 w-full items-center justify-start gap-2 rounded-2xl px-3 text-sm font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>{tDashboard('user_menu.logout_button')}</span>
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          'min-w-0 flex-1 transition-[padding] duration-300',
          sidebarOpen ? 'lg:pl-[288px]' : 'lg:pl-0'
        )}
      >
        <main className="mx-auto max-w-7xl px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              {organizationName}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-2xl border-slate-200 bg-white shadow-sm"
                >
                  <User className="h-4 w-4 text-slate-600" />
                  <span className="sr-only">
                    {tDashboard('user_menu.my_account_label')}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>{tDashboard('user_menu.my_account_label')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link href={`/${locale}/control/profile`} passHref legacyBehavior>
                  <DropdownMenuItem asChild className="cursor-pointer">
                    <a>
                      <User className="mr-2 h-4 w-4" />
                      {tDashboard('user_menu.profile_link')}
                    </a>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600 dark:text-red-400 dark:focus:bg-red-900/50 dark:focus:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {tDashboard('user_menu.logout_button')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur lg:hidden">
        <ul
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${Math.max(navItems.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {navItems.map(({ href, icon: Icon, labelKey }) => {
            const fullHref = `/${locale}${href}`;
            const isActive = pathname.startsWith(fullHref);

            return (
              <li key={href}>
                <Link
                  href={fullHref}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium',
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl',
                      isActive ? 'bg-foreground text-background' : 'bg-muted'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-center leading-tight">
                    {t(labelKey)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
