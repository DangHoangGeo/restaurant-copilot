import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAuthorizationService,
  requireOrgContext,
} from "@/lib/server/authorization/service";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const JOB_TITLES = [
  "manager",
  "chef",
  "server",
  "cashier",
  "part_time",
] as const;

const rolePayRateSchema = z.object({
  rates: z.array(
    z.object({
      job_title: z.enum(JOB_TITLES),
      hourly_rate: z.number().min(0),
      currency: z.string().length(3).optional(),
    }),
  ),
});

export async function GET() {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  const canRead =
    authz?.can("employees") ||
    authz?.can("finance_exports") ||
    authz?.can("organization_settings") ||
    false;
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("organization_role_pay_rates")
    .select("job_title, hourly_rate, currency")
    .eq("organization_id", ctx!.organization.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch company role pay rates" },
      { status: 500 },
    );
  }

  const stored = new Map((data ?? []).map((row) => [row.job_title, row]));
  const currency = ctx!.organization.currency ?? "JPY";

  const rates = JOB_TITLES.map((title) => {
    const row = stored.get(title);
    return {
      job_title: title,
      hourly_rate: row ? Number(row.hourly_rate) : null,
      currency: row?.currency ?? currency,
    };
  });

  return NextResponse.json({ rates, currency });
}

export async function PATCH(req: NextRequest) {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  const canManageRates =
    authz?.can("employees") || authz?.can("organization_settings") || false;
  if (!canManageRates) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = rolePayRateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const rows = parsed.data.rates.map((rate) => ({
    organization_id: ctx!.organization.id,
    job_title: rate.job_title,
    hourly_rate: rate.hourly_rate,
    currency: rate.currency ?? ctx!.organization.currency ?? "JPY",
    updated_at: new Date().toISOString(),
    updated_by: ctx!.member.user_id,
  }));

  const { error } = await supabaseAdmin
    .from("organization_role_pay_rates")
    .upsert(rows, { onConflict: "organization_id,job_title" });

  if (error) {
    return NextResponse.json(
      { error: "Failed to save company role pay rates" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
