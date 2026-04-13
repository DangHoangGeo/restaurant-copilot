// GET  /api/v1/owner/employees/[employeeId]/qr-credential
//   Returns the active QR credential token for an employee.
//   Only owner or manager roles may read credential tokens.
//
// POST /api/v1/owner/employees/[employeeId]/qr-credential
//   Issues a new credential (or rotates the existing one) for an employee.
//   Old credential is deactivated immediately.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { USER_ROLES } from '@/lib/constants';
import { getActiveCredential, rotateCredential } from '@/lib/server/attendance/service';

const paramsSchema = z.object({
  employeeId: z.string().uuid('Invalid employee ID'),
});

async function resolveParams(params: Promise<{ employeeId: string }>) {
  const resolved = await params;
  const parsed = paramsSchema.safeParse(resolved);
  if (!parsed.success) return { error: parsed.error.flatten(), data: null };
  return { error: null, data: parsed.data };
}

function isManagerOrOwner(role: string | null | undefined): boolean {
  return [USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(role as 'owner' | 'manager');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isManagerOrOwner(user.role)) {
    return NextResponse.json({ error: 'Forbidden: managers and owners only' }, { status: 403 });
  }

  const { error: paramError, data } = await resolveParams(params);
  if (paramError) {
    return NextResponse.json({ error: 'Invalid employee ID', details: paramError }, { status: 400 });
  }

  try {
    const credential = await getActiveCredential(data!.employeeId, user.restaurantId);
    if (!credential) {
      return NextResponse.json({ credential: null }, { status: 200 });
    }
    return NextResponse.json({
      credential: {
        id: credential.id,
        employee_id: credential.employee_id,
        token: credential.token,
        is_active: credential.is_active,
        issued_at: credential.issued_at,
        expires_at: credential.expires_at,
      },
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to fetch credential';
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const user = await getUserFromRequest();
  if (!user?.restaurantId || !user.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isManagerOrOwner(user.role)) {
    return NextResponse.json({ error: 'Forbidden: managers and owners only' }, { status: 403 });
  }

  const { error: paramError, data } = await resolveParams(params);
  if (paramError) {
    return NextResponse.json({ error: 'Invalid employee ID', details: paramError }, { status: 400 });
  }

  try {
    const credential = await rotateCredential(data!.employeeId, user.restaurantId, user.userId);
    return NextResponse.json({
      credential: {
        id: credential.id,
        employee_id: credential.employee_id,
        token: credential.token,
        is_active: credential.is_active,
        issued_at: credential.issued_at,
        expires_at: credential.expires_at,
      },
    }, { status: 201 });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const msg = err instanceof Error ? err.message : 'Failed to issue QR credential';
    return NextResponse.json({ error: msg }, { status });
  }
}
