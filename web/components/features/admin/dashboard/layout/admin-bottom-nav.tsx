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
  BadgePercent,
  CircleDollarSign,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { useRestaurantSettings } from '@/contexts/RestaurantContext';
import { cn } from '@/lib/utils';
import { buildBranchPath } from '@/lib/branch-paths';
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
  const branchId = typeof params.branchId === 'string' ? params.branchId : null;
  const { needsOnboarding } = useRestaurantSettings();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navItems: NavItem[] = [];
  const moreItems: ActionItem[] = [
    { icon: ClipboardList, labelKey: 'admin_sidebar_menu_management', href: '/branch/menu' },
    { icon: TableSimpleIcon, labelKey: 'admin_sidebar_table_qr_management', href: '/branch/tables' },
    { icon: BarChartBig, labelKey: 'admin_sidebar_reports_analytics', href: '/branch/reports' },
    { icon: ShoppingCart, labelKey: 'admin_sidebar_purchasing', href: '/branch/purchasing' },
    { icon: BadgePercent, labelKey: 'admin_sidebar_promotions', href: '/branch/promotions' },
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
      { icon: UserCog, labelKey: 'bottom_nav_people', href: '/branch/employees' },
      { icon: CircleDollarSign, labelKey: 'bottom_nav_money', href: '/branch/finance' },
    );
  }

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#AB6E3C]/10 bg-[#FAF3EA]/95 backdrop-blur lg:hidden dark:border-[#AB6E3C]/15 dark:bg-[#170F0C]/95"
        role="navigation"
        aria-label={t('bottom_nav_aria_label')}
      >
        <ul className="flex justify-around">
          {navItems.map(({ icon: Icon, labelKey, href, exact }) => {
            const fullHref = href.startsWith('/branch')
              ? buildBranchPath(locale, branchId, href.replace(/^\/branch\/?/, ''))
              : `/${locale}${href}`;
            const isActive = exact ? pathname === fullHref : pathname.startsWith(fullHref);

            return (
              <li key={href} className="flex-1">
                <Link
                  href={fullHref}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-medium',
                    isActive ? 'text-[#2E2117] dark:text-[#F7F1E9]' : 'text-[#8B6E5A] hover:text-[#AB6E3C] dark:text-[#B89078] dark:hover:text-[#F7F1E9]'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-xl',
                      isActive ? 'bg-[#AB6E3C] text-white' : 'bg-[#AB6E3C]/10 text-[#AB6E3C] dark:bg-[#AB6E3C]/15'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
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
                className="flex min-h-16 w-full flex-col items-center justify-center py-2 text-xs text-[#8B6E5A] hover:text-[#AB6E3C] dark:text-[#B89078] dark:hover:text-[#F7F1E9]"
                aria-label={t('bottom_nav_more')}
              >
                <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-xl bg-[#AB6E3C]/10 text-[#AB6E3C] dark:bg-[#AB6E3C]/15">
                  <MoreHorizontal className="h-4 w-4" />
                </div>
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
                href={
                  href.startsWith('/branch')
                    ? buildBranchPath(locale, branchId, href.replace(/^\/branch\/?/, ''))
                    : `/${locale}${href}`
                }
                onClick={() => setIsMoreOpen(false)}
                className="flex min-h-11 items-center gap-3 rounded-xl border border-[#AB6E3C]/15 bg-[#FEFAF6] px-3 py-2 text-sm font-medium text-[#2E2117] hover:bg-[#F5EAD8] dark:border-[#AB6E3C]/20 dark:bg-[#251810] dark:text-[#F7F1E9] dark:hover:bg-[#2B1A10]"
              >
                <Icon className="h-4 w-4 text-[#AB6E3C]" />
                <span>{t(labelKey)}</span>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
