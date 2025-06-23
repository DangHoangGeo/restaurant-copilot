import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { logger } from '@/lib/logger';
import { USER_ROLES } from '@/lib/constants';

// Helper to get start and end dates of a YYYY-MM month
function getMonthDateRange(year: number, month: number): { startDate: string, endDate: string } {
  const startDate = new Date(year, month - 1, 1); // month is 0-indexed in Date constructor
  const endDate = new Date(year, month, 0); // 0 day of next month gives last day of current month

  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}

const paramsSchema = z.object({
  employeeId: z.string().uuid("Invalid Employee ID format"),
});

const querySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format (e.g., 2023-09)"),
});


export async function GET(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const callingUser: AuthUser | null = await getUserFromRequest();
  const { searchParams } = new URL(req.url);

  if (!callingUser || !callingUser.userId || !callingUser.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedParams = await params;
  const paramsValidation = paramsSchema.safeParse(resolvedParams);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'Invalid Employee ID format', details: paramsValidation.error.flatten() }, { status: 400 });
  }
  const { employeeId } = paramsValidation.data;

  const monthParam = searchParams.get('month');
  if (!monthParam) {
    return NextResponse.json({ error: 'Month query parameter (YYYY-MM) is required' }, { status: 400 });
  }
  const queryValidation = querySchema.safeParse({ month: monthParam });
  if (!queryValidation.success) {
    return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM.', details: queryValidation.error.flatten() }, { status: 400 });
  }

  const [yearStr, monthStr] = monthParam.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  const { startDate, endDate } = getMonthDateRange(year, month);

  try {
    // Authorization:
    // 1. Owner/Manager can access any employee's attendance in their restaurant.
    // 2. Employee can access their own attendance records.
    // RLS policies are primary ("Tenant can manage attendance_records", "Employee can SELECT their own attendance_records").
    // This upfront check ensures the employee (if not owner/manager) is the one requesting,
    // and that the targeted employee belongs to the restaurant.

    let isOwnerOrManager = false;
    if (callingUser.role) {
      isOwnerOrManager = [USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as 'owner' | 'manager');
    }

    // Check if the target employeeId belongs to the callingUser's restaurant
    const { data: employeeRestaurantCheck, error: employeeCheckError } = await supabaseAdmin
      .from('employees')
      .select('id, user_id')
      .eq('id', employeeId)
      .eq('restaurant_id', callingUser.restaurantId)
      .maybeSingle();

    if (employeeCheckError) {
      await logger.error('attendance-records-get-emp-check-err', `Error checking employee ${employeeId} for restaurant ${callingUser.restaurantId}`,
        { error: employeeCheckError.message }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Error verifying employee information.' }, { status: 500 });
    }
    if (!employeeRestaurantCheck) {
      await logger.warn('attendance-records-get-emp-not-found', `Employee ${employeeId} not found in restaurant ${callingUser.restaurantId}.`,
        {}, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Employee not found in this restaurant.' }, { status: 404 });
    }

    // If not owner/manager, ensure the calling user is the employee whose records are being requested
    if (!isOwnerOrManager && employeeRestaurantCheck.user_id !== callingUser.userId) {
      await logger.warn('attendance-records-get-auth-denied', `User ${callingUser.userId} (role ${callingUser.role}) attempted to access attendance for employee ${employeeId} without permission.`,
        {}, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Forbidden: You can only access your own attendance records.' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('restaurant_id', callingUser.restaurantId) // RLS should also enforce this
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: true });

    if (error) {
      await logger.error('attendance-records-get-fetch-err', `Error fetching attendance for employee ${employeeId}, month ${monthParam}`, {
        error: error.message, employeeId, restaurantId: callingUser.restaurantId, month: monthParam,
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Failed to fetch attendance records', details: error.message }, { status: 500 });
    }

    return NextResponse.json(data || [], { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error('attendance-records-get-catch', `Unexpected error fetching attendance for emp ${employeeId}, month ${monthParam}`, {
        error: errorMessage, employeeId, restaurantId: callingUser.restaurantId, month: monthParam,
      }, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}
