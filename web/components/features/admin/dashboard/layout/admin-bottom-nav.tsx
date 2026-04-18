'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import {
  Home,
  List,
  UserCog,
  BarChartBig,
  MoreHorizontal,
  ClipboardList,
  TableIcon as TableSimpleIcon,
  ShoppingCart,
  LucideIcon,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { useRestaurantSettings } from '@/contexts/RestaurantContext';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  href: string;
  exact?: boolean;
}

interface ActionItem {
  icon: LucideIcon;
  labelKey: string;
  href: string;
}

export function AdminBottomNav() {
  const pathname = usePathname();
  const params = useParams();
  const t = useTranslations('owner.dashboard');
  const locale = (params.locale as string) || 'en';
  const { needsOnboarding } = useRestaurantSettings();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navItems: NavItem[] = [];
  const moreItems: ActionItem[] = [
    { icon: ClipboardList, labelKey: 'admin_sidebar_menu_management', href: '/branch/menu' },
    { icon: TableSimpleIcon, labelKey: 'admin_sidebar_table_qr_management', href: '/branch/tables' },
    { icon: BarChartBig, labelKey: 'admin_sidebar_reports_analytics', href: '/branch/reports' },
    { icon: ShoppingCart, labelKey: 'admin_sidebar_purchasing', href: '/branch/purchasing' },
  ];

  if (needsOnboarding && FEATURE_FLAGS.onboarding) {
    navItems.push({
      icon: Sparkles,
      labelKey: 'admin_sidebar_onboarding',
      href: '/control/onboarding',
    });
  } else {
    navItems.push(
      { icon: Home, labelKey: 'admin_sidebar_dashboard', href: '/branch', exact: true },
      { icon: List, labelKey: 'admin_sidebar_orders', href: '/branch/orders' },
      { icon: BarChartBig, labelKey: 'admin_sidebar_reports_analytics', href: '/branch/reports' },
      { icon: UserCog, labelKey: 'bottom_nav_people', href: '/branch/employees' },
    );
  }

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-card border-t lg:hidden"
        role="navigation"
        aria-label={t('bottom_nav_aria_label')}
      >
        <ul className="flex justify-around">
          {navItems.map(({ icon: Icon, labelKey, href, exact }) => {
            const fullHref = `/${locale}${href}`;
            const isActive = exact ? pathname === fullHref : pathname.startsWith(fullHref);

            return (
              <li key={href} className="flex-1">
                <Link
                  href={fullHref}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center py-2 text-xs',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="mb-0.5 h-5 w-5" />
                  <span className="text-xs leading-tight">{t(labelKey)}</span>
                </Link>
              </li>
            );
          })}

          {!(needsOnboarding && FEATURE_FLAGS.onboarding) && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setIsMoreOpen(true)}
                className="flex min-h-16 w-full flex-col items-center justify-center py-2 text-xs text-muted-foreground hover:text-foreground"
                aria-label={t('bottom_nav_more')}
              >
                <MoreHorizontal className="mb-0.5 h-5 w-5" />
                <span className="text-xs leading-tight">{t('bottom_nav_more')}</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      <Dialog open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('bottom_nav_more_title')}</DialogTitle>
            <DialogDescription>{t('bottom_nav_more_description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {moreItems.map(({ icon: Icon, labelKey, href }) => (
              <Link
                key={href}
                href={`/${locale}${href}`}
                onClick={() => setIsMoreOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{t(labelKey)}</span>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
