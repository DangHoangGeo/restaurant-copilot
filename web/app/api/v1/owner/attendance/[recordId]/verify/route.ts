import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { logger } from '@/lib/logger';
import { USER_ROLES } from '@/lib/constants';

const paramsSchema = z.object({
  recordId: z.string().uuid("Invalid Attendance Record ID format"),
});

// Optional: If notes were to be added. For now, no body is expected.
// const verifyAttendanceBodySchema = z.object({
//   notes: z.string().optional(),
// });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  const callingUser: AuthUser | null = await getUserFromRequest();

  if (!callingUser || !callingUser.userId || !callingUser.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: User session not found or incomplete.' }, { status: 401 });
  }

  const resolvedParams = await params;
  const paramsValidation = paramsSchema.safeParse(resolvedParams);
  if (!paramsValidation.success) {
    return NextResponse.json({ error: 'Invalid Attendance Record ID format', details: paramsValidation.error.flatten() }, { status: 400 });
  }
  const { recordId } = paramsValidation.data;

  // Authorization: Only Owner or Manager can verify attendance
  if (!callingUser.role || ![USER_ROLES.OWNER, USER_ROLES.MANAGER].includes(callingUser.role as 'owner' | 'manager')) {
    await logger.warn('attendance-verify-auth-denied', `User ${callingUser.userId} (role ${callingUser.role}) attempted to verify attendance record ${recordId} without permission.`,
      {}, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'Forbidden: Insufficient permissions to verify attendance.' }, { status: 403 });
  }

  // Optional: Parse body if notes were allowed
  // let body = {};
  // try {
  //   const reqBody = await req.json();
  //   if (reqBody && Object.keys(reqBody).length > 0) { // Check if body is not empty
  //     const validationResult = verifyAttendanceBodySchema.safeParse(reqBody);
  //     if (!validationResult.success) {
  //       return NextResponse.json({ error: 'Invalid request body for notes', details: validationResult.error.flatten() }, { status: 400 });
  //     }
  //     body = validationResult.data;
  //   }
  // } catch (error) {
  //   // Ignore error if body is empty/not JSON, as it's optional
  // }

  const updatePayload = {
    status: 'checked',
    verified_by: callingUser.userId,
    verified_at: new Date().toISOString(),
    // ...(body.notes && { notes: body.notes }), // Include notes if they were part of the schema and body
  };

  try {
    // Ensure the record to be verified belongs to the calling user's restaurant.
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('attendance_records')
      .select('id, restaurant_id')
      .eq('id', recordId)
      .maybeSingle(); // Use maybeSingle to check existence

    if (fetchError) {
      await logger.error('attendance-verify-fetch-error', `Error fetching attendance record ${recordId} for verification.`,
        { error: fetchError.message, recordId, restaurantId: callingUser.restaurantId }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Database error while fetching record.', details: fetchError.message }, { status: 500 });
    }

    if (!existingRecord) {
      return NextResponse.json({ error: 'Attendance record not found.' }, { status: 404 });
    }

    if (existingRecord.restaurant_id !== callingUser.restaurantId) {
      await logger.warn('attendance-verify-wrong-restaurant', `User ${callingUser.userId} attempted to verify record ${recordId} belonging to another restaurant.`,
        { targetRestaurantId: existingRecord.restaurant_id }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Forbidden: Record does not belong to your restaurant.' }, { status: 403 });
    }

    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('attendance_records')
      .update(updatePayload)
      .eq('id', recordId)
      // .eq('restaurant_id', callingUser.restaurantId) // Already confirmed above
      .select('*')
      .single();

    if (updateError) {
      await logger.error('attendance-verify-update-error', `Error verifying attendance record ${recordId}.`, {
        error: updateError.message, recordId, restaurantId: callingUser.restaurantId, payload: updatePayload,
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Failed to verify attendance record.', details: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updatedRecord, { status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error('attendance-verify-catch', `Unexpected error verifying attendance record ${recordId}.`, {
        error: errorMessage, recordId, restaurantId: callingUser.restaurantId,
      }, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'An unexpected error occurred during verification.', details: errorMessage }, { status: 500 });
  }
}
