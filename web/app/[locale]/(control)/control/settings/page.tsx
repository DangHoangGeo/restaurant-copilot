import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ControlSettingsContent } from "./control-settings-content";
import { buildAuthorizationService } from "@/lib/server/authorization/service";
import { getOrganizationBillingSummary } from "@/lib/server/billing/subscriptions";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { buildRootControlSectionUrl } from "@/lib/server/organizations/root-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const JOB_TITLES = [
  "manager",
  "chef",
  "server",
  "cashier",
  "part_time",
] as const;

async function getOrganizationRoleRates(params: {
  organizationId: string;
  currency: string;
}) {
  const { data } = await supabaseAdmin
    .from("organization_role_pay_rates")
    .select("job_title, hourly_rate, currency")
    .eq("organization_id", params.organizationId);

  const stored = new Map((data ?? []).map((row) => [row.job_title, row]));

  return JOB_TITLES.map((jobTitle) => {
    const row = stored.get(jobTitle);
    return {
      job_title: jobTitle,
      hourly_rate: row ? Number(row.hourly_rate) : null,
      currency: row?.currency ?? params.currency,
    };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.settings" });
  return { title: t("control.title") };
}

export default async function ControlSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const ctx = await resolveFounderControlContext();
  if (!ctx) {
    notFound();
  }

  const authz = buildAuthorizationService(ctx);
  const canEdit = authz?.canChangeOrgSettings() ?? false;
  const org = ctx.organization;
  const [billing, roleRates] = await Promise.all([
    getOrganizationBillingSummary(org.id),
    getOrganizationRoleRates({
      organizationId: org.id,
      currency: org.currency,
    }),
  ]);
  const publicHomeUrl = org.public_subdomain
    ? buildRootControlSectionUrl(locale, "/", org.public_subdomain)
    : null;
  const publicDomain = org.public_subdomain
    ? new URL(publicHomeUrl!).host
    : null;

  return (
    <ControlSettingsContent
      initial={{
        name: org.name,
        timezone: org.timezone,
        currency: org.currency,
        country: org.country ?? "JP",
        logo_url: org.logo_url ?? null,
        brand_color: org.brand_color ?? null,
        description_en: org.description_en ?? null,
        description_ja: org.description_ja ?? null,
        description_vi: org.description_vi ?? null,
        address: org.address ?? null,
        phone: org.phone ?? null,
        email: org.email ?? null,
      }}
      billing={billing}
      canEdit={canEdit}
      publicDomain={publicDomain}
      publicHomeUrl={publicHomeUrl}
      roleRates={roleRates}
    />
  );
}
