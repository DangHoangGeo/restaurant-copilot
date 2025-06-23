import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { logger } from '@/lib/logger';
import { USER_ROLES, UserRole } from '@/lib/constants';

// Helper to get start and end dates of an ISO week (YYYY-WW)
function getWeekDateRange(year: number, weekNumber: number): { startDate: string, endDate: string } {
  // January 1st of the year
  const firstDayOfYear = new Date(year, 0, 1);
  // Day of the week for Jan 1st (0 for Sunday, 1 for Monday, ...)
  const dayOfWeekJan1st = firstDayOfYear.getDay();

  // Calculate days to first Monday. If Jan 1st is Monday, daysToFirstMonday is 0.
  // If Jan 1st is Sunday (0), daysToFirstMonday is 1. If Jan 1st is Saturday (6), daysToFirstMonday is 2.
  let daysToFirstMonday = (8 - dayOfWeekJan1st) % 7;
  if (dayOfWeekJan1st === 0) daysToFirstMonday = 1; // Sunday adjustment for ISO week
  if (dayOfWeekJan1st === 1) daysToFirstMonday = 0; // Monday is already the first day

  // The first day of the first ISO week
  const firstDayOfFirstWeek = new Date(year, 0, 1 + daysToFirstMonday);

  // Calculate the start date of the target week
  const startDate = new Date(firstDayOfFirstWeek.valueOf());
  startDate.setDate(firstDayOfFirstWeek.getDate() + (weekNumber - 1) * 7);

  // Calculate the end date of the target week
  const endDate = new Date(startDate.valueOf());
  endDate.setDate(startDate.getDate() + 6);

  // Format to YYYY-MM-DD string
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}


const scheduleQuerySchema = z.object({
  // Standard ISO 8601 week format: YYYY-W## (e.g., 2023-W01 or 2023-W52)
  week: z.string().regex(/^\d{4}-W([1-9]|[1-4]\d|5[0-3])$/, "Week must be in YYYY-W## format (e.g., 2023-W01)"),
});

const createScheduleSchema = z.object({
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM or HH:MM:SS"),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM or HH:MM:SS"),
});

const createSchedulesPayloadSchema = z.array(createScheduleSchema);


export async function GET(req: NextRequest, { params }: { params: { employeeId: string } }) {
  const callingUser: AuthUser | null = await getUserFromRequest();
  const { employeeId } = params;
  const { searchParams } = new URL(req.url);

  if (!callingUser || !callingUser.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!employeeId) {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
  }

  const weekParam = searchParams.get('week');
  if (!weekParam) {
    return NextResponse.json({ error: 'Week query parameter (YYYY-W##) is required' }, { status: 400 });
  }

  const weekValidation = scheduleQuerySchema.safeParse({ week: weekParam });
  if (!weekValidation.success) {
    return NextResponse.json({ error: "Invalid week format. Use YYYY-W## (e.g., 2023-W01)", details: weekValidation.error.flatten() }, { status: 400 });
  }

  // Extract year and week number from the validated weekParam
  const [yearStr, weekNumStr] = weekParam.substring(0,4) === weekParam.split('-W')[0] ? weekParam.split('-W') : weekParam.split('-w') ;
  const year = parseInt(yearStr, 10);
  const weekNum = parseInt(weekNumStr, 10);

  // Redundant check as regex handles it, but good for clarity if regex changes
  if (isNaN(year) || isNaN(weekNum) || weekNum < 1 || weekNum > 53) {
      return NextResponse.json({ error: "Invalid year or week number parsed. Must be YYYY-W##." }, { status: 400 });
  }

  const { startDate, endDate } = getWeekDateRange(year, weekNum);

  try {
    // Authorization check: Ensure the employee belongs to the calling user's restaurant.
    // RLS policies ("Tenant can SELECT schedules" and "Employee can SELECT their own schedules")
    // will handle the actual data filtering. This is an upfront check.
    const { data: employeeRestaurantCheck, error: employeeRestaurantCheckError } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('id', employeeId)
        .eq('restaurant_id', callingUser.restaurantId)
        .maybeSingle(); // Use maybeSingle to avoid error if employeeId is invalid (e.g. not UUID)

    if (employeeRestaurantCheckError) {
        await logger.error('schedules-api-get-employee-check-fail', `DB error checking employee ${employeeId} for restaurant ${callingUser.restaurantId}`,
            { error: employeeRestaurantCheckError.message, employeeId, restaurantId: callingUser.restaurantId }, callingUser.restaurantId, callingUser.userId);
        return NextResponse.json({ error: 'Error verifying employee association with restaurant' }, { status: 500 });
    }
    if (!employeeRestaurantCheck) { // If employeeId is valid UUID but not found in this restaurant
        await logger.warn('schedules-api-get-employee-not-found', `Employee ${employeeId} not found in restaurant ${callingUser.restaurantId} during schedule GET.`,
            { employeeId, restaurantId: callingUser.restaurantId }, callingUser.restaurantId, callingUser.userId);
        return NextResponse.json({ error: 'Employee not found in this restaurant' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('schedules')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('restaurant_id', callingUser.restaurantId) // Defensive check, RLS should also cover
      .gte('work_date', startDate)
      .lte('work_date', endDate)
      .order('work_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      await logger.error('schedules-api-get', `Error fetching schedules for employee ${employeeId}`, {
        error: error.message, employeeId, restaurantId: callingUser.restaurantId, week: weekParam
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Failed to fetch schedules', details: error.message }, { status: 500 });
    }
    return NextResponse.json(data || [], { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error('schedules-api-get-catch', `Unexpected error fetching schedules for employee ${employeeId}`, {
        error: errorMessage, employeeId, restaurantId: callingUser.restaurantId, week: weekParam
      }, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { employeeId: string } }) {
  const callingUser: AuthUser | null = await getUserFromRequest();
  const { employeeId } = params;

  if (!callingUser || !callingUser.restaurantId || !callingUser.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!employeeId) {
    return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
  }

  // Authorization: Only Owner or Manager can create schedules
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as UserRole)) {
    await logger.warn('schedules-api-post-auth', `User ${callingUser.userId} with role ${callingUser.role} tried to create schedules for employee ${employeeId} without permission.`,
      callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = createSchedulesPayloadSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid request body', details: validationResult.error.flatten() }, { status: 400 });
  }

  const schedulesToCreate = validationResult.data;

  if (schedulesToCreate.length === 0) {
    return NextResponse.json({ error: 'No schedule data provided' }, { status: 400 });
  }

  try {
    // Check if employee belongs to the restaurant
    const { data: employeeData, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('id', employeeId)
      .eq('restaurant_id', callingUser.restaurantId)
      .single();

    if (employeeError || !employeeData) {
      await logger.error('schedules-api-post-employee-check', `Employee ${employeeId} not found for restaurant ${callingUser.restaurantId} when creating schedule.`, {
         error: employeeError?.message, employeeId, restaurantId: callingUser.restaurantId
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Employee not found or not part of this restaurant' }, { status: 404 });
    }

    const recordsToInsert = schedulesToCreate.map(sch => ({
      restaurant_id: callingUser.restaurantId,
      employee_id: employeeId,
      work_date: sch.work_date,
      start_time: sch.start_time,
      end_time: sch.end_time,
      created_by: callingUser.userId, // from the current session user
      // updated_at will default to now() by db
    }));

    const { data: createdSchedules, error: insertError } = await supabaseAdmin
      .from('schedules')
      .insert(recordsToInsert)
      .select();

    if (insertError) {
      await logger.error('schedules-api-post-insert', `Error inserting schedules for employee ${employeeId}`, {
        error: insertError.message, employeeId, restaurantId: callingUser.restaurantId, count: recordsToInsert.length,
      }, callingUser.restaurantId, callingUser.userId);
      // Check for unique constraint violation (schedules_unique_per_day)
      if (insertError.code === '23505') { // Unique violation
        return NextResponse.json({ error: 'Failed to create schedules: One or more schedules conflict with existing entries (same employee, same day).', details: insertError.message }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to create schedules', details: insertError.message }, { status: 500 });
    }

    return NextResponse.json(createdSchedules, { status: 201 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error('schedules-api-post-catch', `Unexpected error creating schedules for employee ${employeeId}`, {
        error: errorMessage, employeeId, restaurantId: callingUser.restaurantId
      }, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}
