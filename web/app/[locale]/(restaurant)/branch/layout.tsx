import { ProtectedLayout } from '@/components/ProtectedLayout';
import { AdminLayoutClient } from './admin-layout-client';
import { getTranslations } from 'next-intl/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { redirect } from 'next/navigation';
import { resolveFounderControlContext } from '@/lib/server/control/access';

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'owner.dashboard' });
  return {
    title: t('metadata.admin_dashboard_title'),
  };
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [user, resolvedParams, founderContext] = await Promise.all([
    getUserFromRequest(),
    params,
    resolveFounderControlContext(),
  ]);
  const locale = resolvedParams.locale || 'en';

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const restaurantSettings = user.restaurantSettings;
  const tCommon = await getTranslations({ locale, namespace: 'common.layout_errors' });

  // Build the initialUser shape expected by ProtectedLayout so it can pre-populate
  // the client-side auth context without a separate API call.
  const initialUser = {
    id: user.userId,
    name: '',
    email: user.email ?? '',
    role: user.role ?? '',
    restaurantId: user.restaurantId ?? '',
    subdomain: user.subdomain ?? '',
    restaurant: restaurantSettings
      ? {
          id: restaurantSettings.id,
          name: restaurantSettings.name,
          subdomain: restaurantSettings.subdomain,
          logoUrl: restaurantSettings.logoUrl ?? undefined,
          brandColor: restaurantSettings.primaryColor,
          defaultLanguage: restaurantSettings.defaultLocale,
          onboarded: restaurantSettings.onboarded,
        }
      : null,
  };

  const ownerControlHref =
    founderContext && founderContext.member.role !== 'accountant_readonly'
      ? `/${locale}/control/restaurants`
      : null;

  if (!restaurantSettings && user.subdomain) {
    const MOCK_RESTAURANT_INFO_FALLBACK = {
      name: tCommon('fallbackRestaurantName'),
      logoUrl: null,
      subdomain: user.subdomain,
      primaryColor: '#3B82F6',
    } as const;
    return (
      <ProtectedLayout initialUser={initialUser}>
        <AdminLayoutClient
          locale={locale}
          restaurantSettings={MOCK_RESTAURANT_INFO_FALLBACK}
          ownerControlHref={ownerControlHref}
        >
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-destructive">{tCommon('configurationErrorTitle')}</h1>
            <p className="text-muted-foreground">{tCommon('configurationErrorDescription', { subdomain: user.subdomain })}</p>
          </div>
        </AdminLayoutClient>
      </ProtectedLayout>
    );
  }

  if (!restaurantSettings && !user.subdomain) {
    const GENERIC_ADMIN_SETTINGS = {
      name: tCommon('adminPanelTitle'),
      logoUrl: null,
      subdomain: 'admin',
      primaryColor: '#3B82F6',
    } as const;
    return (
      <ProtectedLayout initialUser={initialUser}>
        <AdminLayoutClient
          locale={locale}
          restaurantSettings={GENERIC_ADMIN_SETTINGS}
          ownerControlHref={ownerControlHref}
        >
          <div className="p-8 text-center">
            <h1 className="text-xl font-semibold text-destructive">{tCommon('noRestaurantContextTitle')}</h1>
            <p className="text-muted-foreground">{tCommon('noRestaurantContextDescription')}</p>
          </div>
        </AdminLayoutClient>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout initialUser={initialUser}>
      <AdminLayoutClient
        locale={locale}
        restaurantSettings={restaurantSettings!}
        ownerControlHref={ownerControlHref}
      >
        {children}
      </AdminLayoutClient>
    </ProtectedLayout>
  );
}
