// GET /api/v1/owner/organization/employees
//
// Returns all employees across all branches the calling member has access to.
// Requires the 'employees' permission.
//
// Response:
//   { employees: OrgEmployee[], total_count: number }
//
// Each employee row includes:
//   employee_id, user_id, name, email, job_title,
//   restaurant_id, restaurant_name, restaurant_subdomain

import { NextResponse } from 'next/server';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import {
  buildAuthorizationService,
  requireOrgContext,
  requirePermission,
} from '@/lib/server/authorization/service';
import { listOrganizationEmployees } from '@/lib/server/organizations/queries';

export async function GET() {
  const ctx = await resolveOrgContext();
  const ctxError = requireOrgContext(ctx);
  if (ctxError) return ctxError;

  const authz = buildAuthorizationService(ctx);
  const permError = requirePermission(authz, 'employees');
  if (permError) return permError;

  const employees = await listOrganizationEmployees(ctx!.accessibleRestaurantIds);

  return NextResponse.json({
    employees,
    total_count: employees.length,
  });
}
