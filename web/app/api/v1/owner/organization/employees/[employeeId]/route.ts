import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildAuthorizationService,
  requireOrgContext,
  requirePermission,
} from "@/lib/server/authorization/service";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  job_title: z
    .enum(["manager", "chef", "server", "cashier", "part_time"])
    .optional(),
  gender: z.string().max(80).optional().nullable(),
  phone: z.string().max(80).optional().nullable(),
  contact_email: z
    .string()
    .email()
    .max(200)
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  facebook_url: z
    .string()
    .url()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
  bank_name: z.string().max(160).optional().nullable(),
  bank_branch_name: z.string().max(160).optional().nullable(),
  bank_account_type: z.string().max(80).optional().nullable(),
  bank_account_number: z.string().max(120).optional().nullable(),
  bank_account_holder: z.string().max(160).optional().nullable(),
  tax_social_number: z.string().max(120).optional().nullable(),
  insurance_number: z.string().max(120).optional().nullable(),
});

const profileKeys = [
  "gender",
  "phone",
  "contact_email",
  "address",
  "facebook_url",
  "bank_name",
  "bank_branch_name",
  "bank_account_type",
  "bank_account_number",
  "bank_account_holder",
  "tax_social_number",
  "insurance_number",
] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  const permError = requirePermission(authz, "employees");
  if (permError) return permError;

  const { employeeId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateEmployeeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const hasProfileUpdate = profileKeys.some((key) =>
    Object.prototype.hasOwnProperty.call(parsed.data, key),
  );

  if (!parsed.data.name && !parsed.data.job_title && !hasProfileUpdate) {
    return NextResponse.json(
      { error: "No update fields provided" },
      { status: 400 },
    );
  }

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from("employees")
    .select("id, user_id, restaurant_id")
    .eq("id", employeeId)
    .maybeSingle();

  if (employeeError || !employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  if (
    !ctx!.accessibleRestaurantIds.includes(employee.restaurant_id as string)
  ) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (parsed.data.name) {
    const { error } = await supabaseAdmin
      .from("users")
      .update({
        name: parsed.data.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employee.user_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update employee name" },
        { status: 500 },
      );
    }
  }

  if (parsed.data.job_title) {
    const { error } = await supabaseAdmin
      .from("employees")
      .update({
        role: parsed.data.job_title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", employeeId)
      .eq("restaurant_id", employee.restaurant_id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to update employee role" },
        { status: 500 },
      );
    }
  }

  if (hasProfileUpdate) {
    const profileUpdate = Object.fromEntries(
      profileKeys
        .filter((key) => Object.prototype.hasOwnProperty.call(parsed.data, key))
        .map((key) => {
          const value = parsed.data[key];
          return [key, value === "" ? null : value];
        }),
    );

    const { error } = await supabaseAdmin
      .from("employee_private_profiles")
      .upsert(
        {
          employee_id: employeeId,
          restaurant_id: employee.restaurant_id,
          ...profileUpdate,
          updated_by: ctx!.member.user_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "employee_id" },
      );

    if (error) {
      return NextResponse.json(
        { error: "Failed to update employee profile" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ success: true });
}
