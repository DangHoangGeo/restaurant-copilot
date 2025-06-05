**Step 1: Implement `ProtectedLayout` Component**

**Goal:** Create a layout component that checks for user authentication and redirects to login if the user is not authenticated. This aligns with Req 4.1.

**File to Create:** `/web/components/layout/protected-layout.tsx`

**Key Logic/Data Requirements:**
*   Access Supabase session/user state.
*   Use `next/navigation` for redirection (`useRouter` or `redirect`).
*   If using `SessionContextProvider`, this component might be simpler, just ensuring it's wrapped correctly. For this instruction, let's assume a direct check.

**Mockup Code to Adapt:** The mockup doesn't have a direct `ProtectedLayout`, but the concept is in `AdminLayout` being shown only for admin views.

**Adaptation Instructions for Copilot:**

1.  **Create the file** `/web/components/layout/protected-layout.tsx`.
2.  **Make it a Client Component** (`'use client'`) as it will use hooks for auth state and redirection.
3.  **Import necessary hooks:**
    *   `useUser`, `useSessionContext` from `@supabase/auth-helpers-react` (or `useSession` from `next-auth` if you switched, but docs point to Supabase).
    *   `useRouter` from `next/navigation`.
    *   `useEffect` and `ReactNode` from `react`.
    *   A loading spinner component (e.g., from shadcn/ui or a simple one).
4.  **Implement the logic:**
    *   Get `session`, `isLoading` from `useSessionContext()`.
    *   Get `user` from `useUser()`.
    *   If `isLoading`, show a loader.
    *   `useEffect`: If not `isLoading` and no `session` (or no `user`), redirect to the login page (e.g., `/{locale}/login`). Ensure the redirect URL includes the current locale.
    *   If authenticated, render `children`.

```tsx
// Copilot, create/update this file: /web/components/layout/protected-layout.tsx
'use client';

import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { usePathname, useParams } from 'next/navigation'; // To get locale
import { Loader2 } from 'lucide-react'; // shadcn/ui often uses lucide-react for loaders

interface ProtectedLayoutProps {
  children: ReactNode;
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  const session = useSession();
  const supabase = useSupabaseClient(); // Not strictly needed here if session is enough
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = params.locale || 'en'; // Default locale or get from params

  // Track loading state manually if useSession doesn't provide it directly or if initial check is slow
  // For @supabase/auth-helpers-react, session being null initially might mean loading or not logged in.
  // A more robust way might involve checking user state after session is potentially loaded.
  // However, for simplicity, if session is null and it's not the initial render pass, redirect.
  
  // A simple isLoading state based on session being null initially.
  // This might need refinement based on your specific Supabase helper setup.
  const isLoading = session === undefined; // Or a more explicit loading state from your auth context

  useEffect(() => {
    if (!isLoading && !session) {
      // Construct the login path with the current locale
      const loginPath = `/${locale}/login`;
      // Optionally, add a redirect query param to return to the current page after login
      const redirectTo = pathname;
      router.push(`${loginPath}?redirect=${encodeURIComponent(redirectTo)}`);
    }
  }, [session, isLoading, router, locale, pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[--brand-color]" />
        {/* Or your app's full page loader */}
      </div>
    );
  }

  if (!session) {
    // This case might be hit briefly before redirect, or if useEffect hasn't run.
    // Showing loader is safer until redirect fully happens.
     return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[--brand-color]" />
      </div>
    );
  }

  return <>{children}</>;
}
```

**Verification Points:**
*   Accessing any `/dashboard/...` route without being logged in should redirect to `/{locale}/login`.
*   While checking auth, a loader should be visible.
*   Once logged in, the children of `ProtectedLayout` should render.

---

**Step 2: Implement `AdminHeader` Component**

**Goal:** Create the header for the admin dashboard.

**File to Create:** `/web/components/layout/admin-header.tsx`

**Key Logic/Data Requirements:**
*   Props: `toggleSidebar` function, `restaurantSettings` (for potential branding, though mockup doesn't use it much in header besides user avatar/name potentially).
*   Current page title (derived from `currentViewName` in mockup, should use `usePathname` and map to translated titles).
*   Theme toggle functionality.
*   Language switcher functionality.
*   User dropdown menu (Profile, Settings, Logout).

**Mockup Code to Adapt:** Extract `AdminHeader` function from the mockup.

**Adaptation Instructions for Copilot:**

1.  **Create the file** `/web/components/layout/admin-header.tsx`.
2.  **Make it a Client Component** (`'use client'`) due to interactive elements like theme toggle, language switcher, and user dropdown.
3.  **Import necessary components/hooks:**
    *   `Button` from `@/components/ui/button`.
    *   `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` from `@/components/ui/dropdown-menu`.
    *   `Icon` helper (from mockup, or use Lucide icons directly).
    *   `Menu`, `Moon`, `Sun`, `ChevronDown`, `User`, `Settings`, `LogOut` from `lucide-react`.
    *   `useTheme` from `next-themes`.
    *   `LanguageSwitcher` component (to be created/adapted).
    *   `useTranslations` from `next-intl`.
    *   `usePathname`, `useRouter` from `next/navigation`.
    *   Supabase client for logout: `useSupabaseClient` from `@supabase/auth-helpers-react`.
4.  **Adapt JSX:**
    *   Replace mockup's `Button` with shadcn's `Button`.
    *   Replace mockup's dropdown with shadcn's `DropdownMenu`.
    *   The `h1` for the page title should dynamically get the title based on the current route or a prop.
    *   Implement logout functionality using `supabase.auth.signOut()`.
    *   Profile/Settings links in dropdown should use `next/link`.

```tsx
// Copilot, create/update this file: /web/components/layout/admin-header.tsx
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
import { Menu as MenuIcon, Moon, Sun, ChevronDown, User, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { LanguageSwitcher } from '@/components/common/language-switcher'; // We'll adapt this later
import { usePathname, useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

// This mapping should ideally live in a config or be more dynamic
const viewNameMap = {
  '/dashboard': 'admin.sidebar.dashboard',
  '/dashboard/settings': 'admin.sidebar.restaurant_settings',
  '/dashboard/menu': 'admin.sidebar.menu_management',
  '/dashboard/tables': 'admin.sidebar.table_qr_management',
  '/dashboard/employees': 'admin.sidebar.employees_schedules',
  '/dashboard/bookings': 'admin.sidebar.bookings_preorders',
  '/dashboard/reports': 'admin.sidebar.reports_analytics',
  // Add other routes as needed
};

interface AdminHeaderProps {
  toggleSidebar: () => void;
  // restaurantSettings: { name: string; logoUrl: string; /* ... other relevant settings */ }; // If needed
}

export function AdminHeader({ toggleSidebar }: AdminHeaderProps) {
  const { theme, setTheme } = useTheme();
  const t = useTranslations('AdminLayout'); // Namespace for admin layout strings
  const tNav = useTranslations('AdminNav'); // For page titles
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const supabase = useSupabaseClient();
  const locale = params.locale as string || 'en';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/login`); // Redirect to login page after logout
  };

  // Determine current page title based on pathname
  // Remove locale from pathname for matching
  const basePath = pathname.replace(`/${locale}`, '');
  let currentPageTitleKey = viewNameMap[basePath] || 'admin.dashboard.title'; // Default title
   if (basePath.startsWith('/dashboard/menu/') && basePath !== '/dashboard/menu') {
    currentPageTitleKey = 'admin.sidebar.menu_management';
  } else if (basePath.startsWith('/dashboard/tables/') && basePath !== '/dashboard/tables') {
    currentPageTitleKey = 'admin.sidebar.table_qr_management';
  } else if (basePath.startsWith('/dashboard/employees/') && basePath !== '/dashboard/employees') {
    currentPageTitleKey = 'admin.sidebar.employees_schedules';
  }
  // Add more specific checks for sub-pages if needed


  return (
    <header className="bg-card dark:bg-slate-800 shadow-sm sticky top-0 z-30 border-b">
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
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={t('theme.toggle_aria_label')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t('theme.toggle_label')}</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center px-2 sm:px-3">
                {/* Replace with actual user avatar if available */}
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-0 sm:mr-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="hidden sm:inline text-sm font-medium">
                  {/* Replace with actual user name if available */}
                  {t('user_menu.admin_user_placeholder')}
                </span>
                <ChevronDown className="ml-0 sm:ml-1 h-4 w-4 text-muted-foreground hidden sm:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('user_menu.my_account_label')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href={`/${locale}/dashboard/profile`} passHref legacyBehavior>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a><User className="mr-2 h-4 w-4" /> {t('user_menu.profile_link')}</a>
                </DropdownMenuItem>
              </Link>
              <Link href={`/${locale}/dashboard/settings`} passHref legacyBehavior>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a><SettingsIcon className="mr-2 h-4 w-4" /> {t('user_menu.settings_link')}</a>
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
```

**Verification Points:**
*   Header displays correctly.
*   Page title changes based on the current route.
*   Theme toggle works.
*   Language switcher (once implemented) works.
*   User dropdown opens, links navigate correctly (placeholder for now), logout works.
*   Sidebar toggle button functions (will be connected in `DashboardLayout`).

---

**Step 3: Implement `LanguageSwitcher` Component**

**Goal:** Create the language switcher component to be used in headers.

**File to Create:** `/web/components/common/language-switcher.tsx`

**Key Logic/Data Requirements:**
*   Uses `next-intl` for translations of language names.
*   Uses `next/navigation` (`useRouter`, `usePathname`, `useParams`) to switch locales while preserving the current path and query parameters.
*   Displays flags (can be emojis or small images).

**Mockup Code to Adapt:** Extract `LanguageSwitcher` function from the mockup.

**Adaptation Instructions for Copilot:**

1.  **Create the file** `/web/components/common/language-switcher.tsx`.
2.  **Make it a Client Component** (`'use client'`).
3.  **Import necessary components/hooks:**
    *   `Button` from `@/components/ui/button`.
    *   `DropdownMenu`, etc., from `@/components/ui/dropdown-menu`.
    *   `ChevronDown` from `lucide-react`.
    *   `useRouter`, `usePathname`, `useParams` from `next/navigation`.
    *   `useLocale`, `useTranslations` from `next-intl`.
    *   Your project's i18n config (e.g., `locales` array from `i18n.ts`).

```tsx
// Copilot, create/update this file: /web/components/common/language-switcher.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { locales, localeDetails } from '@/config/i18n.config'; // Assuming you have this config

export function LanguageSwitcher({ preserveQuery = true }: { preserveQuery?: boolean }) {
  const router = useRouter();
  const currentPathname = usePathname();
  const currentParams = useParams();
  const currentLocale = useLocale();
  const t = useTranslations('Common');

  const switchLocale = (newLocale: string) => {
    // Remove current locale from pathname
    let newPathname = currentPathname;
    if (currentPathname.startsWith(`/${currentLocale}`)) {
      newPathname = currentPathname.substring(`/${currentLocale}`.length) || '/';
    }
    
    // Preserve search params if preserveQuery is true
    const search = preserveQuery && typeof window !== 'undefined' ? window.location.search : '';
    router.push(`/${newLocale}${newPathname}${search}`);
    router.refresh(); // Recommended by Next.js docs for locale changes to re-render server components
  };

  const selectedLocaleDetail = localeDetails.find(l => l.code === currentLocale) || localeDetails[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center px-2 sm:px-3" aria-label={t('language_switcher.toggle_label')}>
          <span className="mr-1 sm:mr-2 text-lg">{selectedLocaleDetail.flag}</span>
          <span className="hidden sm:inline text-sm">{selectedLocaleDetail.name}</span>
          <ChevronDown size={16} className="ml-1 h-4 w-4 text-muted-foreground hidden sm:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {localeDetails.map(localeDetail => (
          <DropdownMenuItem
            key={localeDetail.code}
            onClick={() => switchLocale(localeDetail.code)}
            className="cursor-pointer"
            disabled={currentLocale === localeDetail.code}
          >
            <span className="mr-2 text-lg">{localeDetail.flag}</span> {localeDetail.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```
*Create a config file for i18n details:*
```typescript
// Copilot, create this file: /config/i18n.config.ts
export const locales = ['en', 'ja', 'vi'] as const;
export const defaultLocale = 'en';

export const localeDetails: { code: typeof locales[number]; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
];
```

**Verification Points:**
*   Switcher displays current language and flag.
*   Dropdown shows other available languages.
*   Selecting a new language changes the URL locale prefix and re-renders the page with new translations.
*   Path and query parameters are preserved.

---

**Step 4: Implement `AdminSidebar` Component**

**Goal:** Create the main navigation sidebar for the admin dashboard.

**File to Create:** `/web/components/layout/admin-sidebar.tsx`

**Key Logic/Data Requirements:**
*   Props: `restaurantSettings` (for logo, name), `isOpen`, `setIsOpen` (for mobile toggle).
*   Navigation items with icons and labels.
*   Active state highlighting for current page.
*   Links to customer site and logout.

**Mockup Code to Adapt:** Extract `AdminSidebar` function from the mockup.

**Adaptation Instructions for Copilot:**

1.  **Create the file** `/web/components/layout/admin-sidebar.tsx`.
2.  **Make it a Client Component** (`'use client'`) as it manages its own open/close state for mobile and uses `usePathname`.
3.  **Import necessary components/hooks:**
    *   `Button` from `@/components/ui/button`.
    *   Lucide icons as used in the mockup.
    *   `Link` from `next/link`.
    *   `usePathname`, `useParams` from `next/navigation`.
    *   `useTranslations` from `next-intl`.
    *   `useState` for mobile sidebar state if not passed as prop from layout.
    *   `FEATURE_FLAGS` from `/config/feature-flags.ts`.
4.  **Adapt JSX:**
    *   `NavItem` should be a sub-component or a mapped element.
    *   Use `Link` for navigation.
    *   `currentView === viewName` logic should use `pathname` from `usePathname()` to check active routes. Compare against paths like `/{locale}/dashboard`, `/{locale}/dashboard/settings`.
    *   Dynamically generate `href` for `NavItem`s using the current `locale`.
    *   The "View Customer Site" link should ideally go to `https://{subdomain}.yourdomain.com/{locale}/customer`.

```tsx
// Copilot, create/update this file: /web/components/layout/admin-sidebar.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Home, Settings, ClipboardList, TableIcon as TableSimpleIcon, UserCog, BarChartBig, Eye, LogOut, X,
  Palette, BookUser // From mockup
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FEATURE_FLAGS } from '@/config/feature-flags';
import { cn } from '@/lib/utils'; // For shadcn class merging

interface AdminSidebarProps {
  restaurantSettings: { name: string; logoUrl: string | null; subdomain?: string }; // Add subdomain
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const navItemsConfig = [
  { icon: Home, labelKey: 'admin.sidebar.dashboard', href: '/dashboard', exact: true },
  { icon: Settings, labelKey: 'admin.sidebar.restaurant_settings', href: '/dashboard/settings' },
  { icon: ClipboardList, labelKey: 'admin.sidebar.menu_management', href: '/dashboard/menu' },
  { icon: TableSimpleIcon, labelKey: 'admin.sidebar.table_qr_management', href: '/dashboard/tables' },
  { icon: UserCog, labelKey: 'admin.sidebar.employees_schedules', href: '/dashboard/employees' },
  { icon: BookUser, labelKey: 'admin.sidebar.bookings_preorders', href: '/dashboard/bookings', featureFlag: FEATURE_FLAGS.tableBooking },
  { icon: BarChartBig, labelKey: 'admin.sidebar.reports_analytics', href: '/dashboard/reports' },
];

const utilityNavItemsConfig = [
   { icon: Palette, labelKey: 'admin.sidebar.design_system', href: '/dashboard/design-system' }, // Example, if you keep it
];


export function AdminSidebar({ restaurantSettings, isOpen, setIsOpen }: AdminSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const t = useTranslations('AdminNav'); // Using a specific namespace for nav items
  const locale = params.locale as string || 'en';

  const NavItem = ({ icon: IconComponent, labelKey, href, exact = false, isUtility = false }) => {
    const fullHref = `/${locale}${href}`;
    // Active state logic: exact match or startsWith for parent routes
    const isActive = exact ? pathname === fullHref : pathname.startsWith(fullHref);

    return (
      <Link href={fullHref} passHref legacyBehavior>
        <a
          onClick={() => { if (isOpen && window.innerWidth < 1024) setIsOpen(false); }}
          className={cn(
            "flex items-center w-full px-3 py-2.5 text-sm rounded-lg transition-colors duration-150 ease-in-out group",
            isActive
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            isUtility ? 'font-normal' : 'font-medium'
          )}
          aria-current={isActive ? "page" : undefined}
        >
          <IconComponent className={cn("mr-3 h-5 w-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
          <span>{t(labelKey)}</span>
        </a>
      </Link>
    );
  };
  
  // Construct customer site URL
  const customerSiteUrl = restaurantSettings.subdomain 
    ? `https://${restaurantSettings.subdomain}.${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'shop-copilot.com'}/${locale}/customer` // Replace with actual root domain
    : `/${locale}/customer`; // Fallback if subdomain logic isn't fully ready

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen flex flex-col",
          isOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b flex-shrink-0">
          <Link href={`/${locale}/dashboard`} className="flex items-center" onClick={() => setIsOpen(false)}>
            {restaurantSettings.logoUrl ? (
              <Image src={restaurantSettings.logoUrl} alt={`${restaurantSettings.name} Logo`} width={32} height={32} className="h-8 w-8 rounded-md mr-2 object-contain bg-muted p-0.5" />
            ) : (
              <div className="h-8 w-8 rounded-md mr-2 bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                {restaurantSettings.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-lg font-semibold text-foreground truncate" title={restaurantSettings.name}>
              {restaurantSettings.name || t('default_restaurant_name')}
            </span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="lg:hidden" aria-label={t('sidebar.close_aria_label')}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="p-3 space-y-1.5 flex-grow overflow-y-auto">
          {navItemsConfig.map(item => 
            (item.featureFlag === undefined || item.featureFlag === true) && <NavItem key={item.href} {...item} />
          )}
          
          {utilityNavItemsConfig.length > 0 && <hr className="my-3" />}
          {utilityNavItemsConfig.map(item => 
            (item.featureFlag === undefined || item.featureFlag === true) && <NavItem key={item.href} {...item} isUtility />
          )}
        </nav>
        <div className="p-3 mt-auto flex-shrink-0 border-t space-y-1.5">
          <a
            href={customerSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-150 ease-in-out text-muted-foreground hover:bg-muted hover:text-foreground group"
          >
            <Eye className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-foreground" />
            <span>{t('admin.sidebar.view_customer_site')}</span>
          </a>
          {/* Logout button is in AdminHeader for better UX, but can be duplicated here if desired */}
          {/* <NavItem icon={LogOut} labelKey="admin.sidebar.logout" href="/logout" /> */}
        </div>
      </aside>
      {isOpen && <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setIsOpen(false)}></div>}
    </>
  );
}
```

**Verification Points:**
*   Sidebar displays restaurant logo and name.
*   Navigation items link to correct dashboard pages (e.g., `/{locale}/dashboard/settings`).
*   Active navigation item is highlighted correctly.
*   Sidebar is responsive and toggles correctly on mobile.
*   Feature-flagged items (like Bookings) are shown/hidden based on `FEATURE_FLAGS`.
*   "View Customer Site" links to the correct customer-facing URL.

---

**Step 5: Implement Admin Dashboard Layout (`DashboardLayout`)**

**Goal:** Create the main layout structure for all admin dashboard pages, combining the header, sidebar, and content area.

**File to Create/Modify:** `/web/app/[locale]/dashboard/layout.tsx`

**Key Logic/Data Requirements:**
*   Integrates `ProtectedLayout`, `AdminHeader`, and `AdminSidebar`.
*   Manages the `isSidebarOpen` state for mobile.
*   Fetches `restaurantSettings` (name, logo, subdomain) server-side to pass to header and sidebar. Your `04_admin-dashboard.md` mentions a helper `getCurrentRestaurantId(searchParams)` and then fetching settings. For a layout, it's better to get this from a higher-level context or a server-side utility that uses request headers (for subdomain).

**Mockup Code to Adapt:** The `AdminLayout` function from the mockup.

**Adaptation Instructions for Copilot:**

1.  **Modify the file** `/web/app/[locale]/dashboard/layout.tsx`.
2.  This will be a **Server Component** by default, but it will render client components like `AdminHeader` and `AdminSidebarWrapper` (which will manage state).
3.  **Fetch `restaurantSettings`**: Use a server-side helper function to get the current restaurant's settings based on the subdomain (extracted from `headers()`).
    *   Example: `const restaurantSettings = await getRestaurantSettingsFromRequest(req);`
4.  **Manage Sidebar State**: The `isSidebarOpen` state needs to be managed by a client component. Create a wrapper `AdminLayoutClient` for this.

```tsx
// Copilot, create/update this file: /web/app/[locale]/dashboard/layout.tsx
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { AdminLayoutClient } from './admin-layout-client'; // New client component wrapper
// You'll need a server-side function to get restaurant settings
import { getRestaurantSettingsFromSubdomain } from '@/lib/server/restaurant-settings'; // Example path
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { unstable_setRequestLocale } from 'next-intl/server';


export async function generateMetadata({ params: { locale } }: { params: { locale: string }}) {
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return {
    title: t('admin_dashboard_title'), // e.g., "Admin Dashboard - Shop Copilot"
  };
}


export default async function DashboardLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  unstable_setRequestLocale(locale); // For static rendering with dynamic segments

  const host = headers().get("host") || "";
  // Robust subdomain extraction (consider www, root domain, etc.)
  let subdomain = null;
  const parts = host.split('.');
  // Assuming root domain is like yourdomain.com (2 parts) or app.yourdomain.com (3 parts for root app)
  // And tenant subdomains are like tenant.yourdomain.com (3 parts)
  // This logic needs to be robust based on your actual domain structure.
  const rootDomainParts = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'shop-copilot.com').split('.').length;
  if (parts.length > rootDomainParts) {
      subdomain = parts[0];
  }

  if (!subdomain) {
    // This scenario should ideally be handled by middleware redirecting to a selection page or main app.
    // For now, if no subdomain and trying to access dashboard layout directly, it's an issue.
    console.error("DashboardLayout: Subdomain could not be determined from host:", host);
    // Potentially redirect to a "select your restaurant" page or an error.
    // For now, let's assume middleware handles this and this layout is only hit for valid subdomains.
    // If it's critical for this layout to have a subdomain, you might call notFound() or redirect.
  }
  
  // Fetch restaurant settings based on subdomain.
  // This function would query your 'restaurants' table.
  const restaurantSettings = subdomain 
    ? await getRestaurantSettingsFromSubdomain(subdomain) 
    : null;

  if (!restaurantSettings && subdomain) { // If subdomain exists but no settings found
    console.warn(`No restaurant settings found for subdomain: ${subdomain}`);
    // return notFound(); // Or redirect to an error page or the main app page
    // For mockup purposes, using fallback if live data fetching fails:
    const MOCK_RESTAURANT_INFO_FALLBACK = {
      name: "Fallback Restaurant",
      logoUrl: null,
      subdomain: subdomain || "test",
      primaryColor: '#3B82F6', // Default Tailwind blue
    };
    return (
      <ProtectedLayout>
        <AdminLayoutClient restaurantSettings={MOCK_RESTAURANT_INFO_FALLBACK}>
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-destructive">Restaurant Configuration Error</h1>
            <p className="text-muted-foreground">Could not load settings for subdomain: {subdomain}. Displaying with fallback.</p>
            {children}
          </div>
        </AdminLayoutClient>
      </ProtectedLayout>
    );
  }
  
  if (!restaurantSettings && !subdomain) {
     // This case implies accessing dashboard on root domain, which should be disallowed by middleware or handled differently
     // For now, providing a generic state.
    const GENERIC_ADMIN_SETTINGS = {
        name: "Admin Panel",
        logoUrl: null,
        subdomain: "admin", // Placeholder
        primaryColor: '#3B82F6',
      };
    return (
        <ProtectedLayout>
            <AdminLayoutClient restaurantSettings={GENERIC_ADMIN_SETTINGS}>
                 <div className="p-8 text-center">
                    <h1 className="text-xl font-semibold text-destructive">Error: No Restaurant Context</h1>
                    <p className="text-muted-foreground">This dashboard requires a restaurant subdomain.</p>
                    {/* {children} Render children anyway or an error component */}
                </div>
            </AdminLayoutClient>
        </ProtectedLayout>
    );
  }


  return (
    <ProtectedLayout>
      <AdminLayoutClient restaurantSettings={restaurantSettings}>
        {children}
      </AdminLayoutClient>
    </ProtectedLayout>
  );
}
```

```tsx
// Copilot, create this new file: /web/app/[locale]/dashboard/admin-layout-client.tsx
'use client';

import { useState, ReactNode } from 'react';
import { AdminHeader } from '@/components/layout/admin-header';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { cn } from '@/lib/utils';

interface AdminLayoutClientProps {
  children: ReactNode;
  restaurantSettings: { name: string; logoUrl: string | null; subdomain?: string; primaryColor?: string; }; // Matched to AdminSidebar/Header
}

export function AdminLayoutClient({ children, restaurantSettings }: AdminLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className={cn("flex h-screen bg-background text-foreground", restaurantSettings.primaryColor ? `theme-${restaurantSettings.subdomain}` : '')}>
       {/* Inject dynamic theme variables if needed, or handle in ThemeProvider */}
      <style jsx global>{`
        ${restaurantSettings.primaryColor && restaurantSettings.subdomain ? `
          .theme-${restaurantSettings.subdomain} {
            --brand-color: ${restaurantSettings.primaryColor};
            --primary: ${restaurantSettings.primaryColor}; /* For shadcn if you map it */
            /* Potentially more theme vars */
          }
        ` : ''}
      `}</style>
      <AdminSidebar
        restaurantSettings={restaurantSettings}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader toggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```
*Create a server-side helper for restaurant settings (example structure):*
```typescript
// Copilot, create this file: /lib/server/restaurant-settings.ts (or similar path)
import 'server-only'; // Ensures this is only run on the server
import { createClient } from '@/utils/supabase/server'; // Your server-side Supabase client

export async function getRestaurantSettingsFromSubdomain(subdomain: string) {
  if (!subdomain) return null;
  
  const supabase = createClient(); // Server component client
  try {
    const { data: restaurant, error } = await supabase
      .from('restaurants') // Ensure this table exists as per your schema docs
      .select('name, logo_url, subdomain, brand_color, default_language') // Add other fields needed
      .eq('subdomain', subdomain)
      .single();

    if (error) {
      console.error(`Error fetching restaurant by subdomain ${subdomain}:`, error.message);
      return null;
    }
    if (!restaurant) {
      return null;
    }
    return {
        name: restaurant.name,
        logoUrl: restaurant.logo_url,
        subdomain: restaurant.subdomain,
        primaryColor: restaurant.brand_color || '#3B82F6', // Fallback color
        defaultLocale: restaurant.default_language || 'en',
        // ... other settings
    };
  } catch (e) {
    console.error(`Exception fetching restaurant by subdomain ${subdomain}:`, e);
    return null;
  }
}
```
*Ensure your `.env.local` (or Vercel env vars) has `NEXT_PUBLIC_ROOT_DOMAIN` (e.g., `NEXT_PUBLIC_ROOT_DOMAIN=shop-copilot.com` or `localhost:3000` for local dev).*

**Verification Points:**
*   The overall admin layout renders correctly with header, sidebar, and content area.
*   Sidebar toggle works on mobile.
*   `ProtectedLayout` correctly gates access.
*   Restaurant name and logo (if available) are shown in the sidebar, fetched based on the subdomain.
*   The `--brand-color` CSS variable is correctly set if `primaryColor` is available from settings.

---
