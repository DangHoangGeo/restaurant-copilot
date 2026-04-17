import { notFound, redirect } from 'next/navigation';
import { ProtectedLayout } from '@/components/ProtectedLayout';
import { ControlShell } from '@/components/features/admin/control/control-shell';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { resolveFounderControlContext } from '@/lib/server/control/access';
import { buildAuthorizationService } from '@/lib/server/authorization/service';

export default async function ControlLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const [{ locale }, user, controlContext] = await Promise.all([
    params,
    getUserFromRequest(),
    resolveFounderControlContext(),
  ]);

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (!controlContext) {
    notFound();
  }

  if (controlContext.organization.approval_status !== 'approved') {
    const status = controlContext.organization.approval_status;
    const org = controlContext.organization.public_subdomain || controlContext.organization.slug;
    redirect(`/${locale}/signup/pending-approval?status=${status}&org=${encodeURIComponent(org)}`);
  }

  const initialUser = {
    id: user.userId,
    name: '',
    email: user.email ?? '',
    role: user.role ?? '',
    restaurantId: user.restaurantId ?? '',
    subdomain: user.subdomain ?? '',
    restaurant: user.restaurantSettings
      ? {
          id: user.restaurantSettings.id,
          name: user.restaurantSettings.name,
          subdomain: user.restaurantSettings.subdomain,
          logoUrl: user.restaurantSettings.logoUrl ?? undefined,
          brandColor: user.restaurantSettings.primaryColor,
          defaultLanguage: user.restaurantSettings.defaultLocale,
          onboarded: user.restaurantSettings.onboarded,
        }
      : null,
  };

  const authz = buildAuthorizationService(controlContext);
  const accessControls = {
    restaurants: authz?.can('restaurant_settings') ?? false,
    people: authz?.can('employees') ?? false,
    finance: authz ? authz.can('finance_exports') || authz.can('reports') : false,
    settings: authz?.canChangeOrgSettings() ?? false,
  };

  return (
    <ProtectedLayout initialUser={initialUser}>
      <ControlShell
        locale={locale}
        organizationName={controlContext.organization.name}
        userEmail={user.email ?? ''}
        accessControls={accessControls}
      >
        {children}
      </ControlShell>
    </ProtectedLayout>
  );
}
