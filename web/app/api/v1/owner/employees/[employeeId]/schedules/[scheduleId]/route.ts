import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { logger } from '@/lib/logger';
import { USER_ROLES, UserRole } from '@/lib/constants';

const paramsSchema = z.object({
  employeeId: z.string().uuid("Invalid Employee ID format"),
  scheduleId: z.string().uuid("Invalid Schedule ID format"),
});

const updateScheduleSchema = z.object({
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD").optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM or HH:MM:SS").optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time must be HH:MM or HH:MM:SS").optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: "At least one field (work_date, start_time, end_time) must be provided for update.",
});


export async function PATCH(req: NextRequest, { params }: { params: { employeeId: string, scheduleId: string } }) {
  const callingUser: AuthUser | null = await getUserFromRequest();

  if (!callingUser || !callingUser.restaurantId || !callingUser.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const paramsValidation = paramsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'Invalid Employee or Schedule ID format', details: paramsValidation.error.flatten() }, { status: 400 });
  }
  const { employeeId, scheduleId } = paramsValidation.data;

  // Authorization: Only Owner or Manager can update schedules
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as UserRole)) {
    await logger.warn('schedule-id-api-patch-auth', `User ${callingUser.userId} (role ${callingUser.role}) tried to update schedule ${scheduleId} for employee ${employeeId} without permission.`,
      callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = updateScheduleSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid request body', details: validationResult.error.flatten() }, { status: 400 });
  }

  const updatePayload = { ...validationResult.data, updated_at: new Date().toISOString() };

  try {
    // Verify the schedule belongs to the specified employee and restaurant before updating
    const { data: existingSchedule, error: fetchError } = await supabaseAdmin
      .from('schedules')
      .select('id')
      .eq('id', scheduleId)
      .eq('employee_id', employeeId)
      .eq('restaurant_id', callingUser.restaurantId)
      .single();

    if (fetchError || !existingSchedule) {
      await logger.error('schedule-id-api-patch-fetch', `Schedule ${scheduleId} not found for employee ${employeeId} and restaurant ${callingUser.restaurantId}.`, {
        error: fetchError?.message, scheduleId, employeeId, restaurantId: callingUser.restaurantId
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Schedule not found or does not belong to this employee/restaurant' }, { status: 404 });
    }

    const { data: updatedSchedule, error: updateError } = await supabaseAdmin
      .from('schedules')
      .update(updatePayload)
      .eq('id', scheduleId)
      // Redundant checks, but good for safety, already verified above.
      // .eq('employee_id', employeeId)
      // .eq('restaurant_id', callingUser.restaurantId)
      .select()
      .single();

    if (updateError) {
      await logger.error('schedule-id-api-patch-update', `Error updating schedule ${scheduleId}`, {
        error: updateError.message, scheduleId, employeeId, restaurantId: callingUser.restaurantId, payload: updatePayload
      }, callingUser.restaurantId, callingUser.userId);
       if (updateError.code === '23505') { // Unique violation (employee_id, work_date)
        return NextResponse.json({ error: 'Failed to update schedule: Conflicts with an existing schedule for this employee on the new date.', details: updateError.message }, { status: 409 });
      }
      return NextResponse.json({ error: 'Failed to update schedule', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedSchedule, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error('schedule-id-api-patch-catch', `Unexpected error updating schedule ${scheduleId}`, {
        error: errorMessage, scheduleId, employeeId, restaurantId: callingUser.restaurantId
      }, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest, { params }: { params: { employeeId: string, scheduleId: string } }) {
  const callingUser: AuthUser | null = await getUserFromRequest();

  if (!callingUser || !callingUser.restaurantId || !callingUser.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const paramsValidation = paramsSchema.safeParse(params);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'Invalid Employee or Schedule ID format', details: paramsValidation.error.flatten() }, { status: 400 });
  }
  const { employeeId, scheduleId } = paramsValidation.data;

  // Authorization: Only Owner or Manager can delete schedules
  if (![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as UserRole)) {
     await logger.warn('schedule-id-api-delete-auth', `User ${callingUser.userId} (role ${callingUser.role}) tried to delete schedule ${scheduleId} for employee ${employeeId} without permission.`,
      callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }

  try {
    // Verify the schedule belongs to the specified employee and restaurant before deleting
    // This also implicitly checks if employeeId and scheduleId are valid UUIDs due to paramsValidation
    const { error: deleteError, count } = await supabaseAdmin
      .from('schedules')
      .delete({ count: 'exact' }) // Ensures we know if a row was actually deleted
      .eq('id', scheduleId)
      .eq('employee_id', employeeId)
      .eq('restaurant_id', callingUser.restaurantId);

    if (deleteError) {
      await logger.error('schedule-id-api-delete-error', `Error deleting schedule ${scheduleId}`, {
        error: deleteError.message, scheduleId, employeeId, restaurantId: callingUser.restaurantId
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Failed to delete schedule', details: deleteError.message }, { status: 500 });
    }

    if (count === 0) {
      await logger.warn('schedule-id-api-delete-notfound', `Schedule ${scheduleId} not found for deletion under employee ${employeeId} / restaurant ${callingUser.restaurantId}.`,
        {scheduleId, employeeId, restaurantId: callingUser.restaurantId}, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Schedule not found or does not belong to this employee/restaurant' }, { status: 404 });
    }

    return NextResponse.json(null, { status: 204 }); // Successfully deleted, no content to return

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
     await logger.error('schedule-id-api-delete-catch', `Unexpected error deleting schedule ${scheduleId}`, {
        error: errorMessage, scheduleId, employeeId, restaurantId: callingUser.restaurantId
      }, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'An unexpected error occurred', details: errorMessage }, { status: 500 });
  }
}
