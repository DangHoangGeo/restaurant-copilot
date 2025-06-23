import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { logger } from '@/lib/logger';

const scanSchema = z.object({
  employee_id: z.string().uuid("Invalid Employee ID format"),
  qrToken: z.string().min(1, "QR Token cannot be empty"), // For now, assume qrToken is the employee_id
});

// Helper to get current date in YYYY-MM-DD format
const getCurrentDate = () => new Date().toISOString().split('T')[0];

export async function POST(req: NextRequest) {
  const callingUser: AuthUser | null = await getUserFromRequest();

  if (!callingUser || !callingUser.userId || !callingUser.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: User session not found or incomplete.' }, { status: 401 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = scanSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json({ error: 'Invalid request body', details: validationResult.error.flatten() }, { status: 400 });
  }

  const { employee_id, qrToken } = validationResult.data;

  // Simplified QR Token validation: For this subtask, qrToken must match employee_id
  if (qrToken !== employee_id) {
    await logger.warn('attendance-scan-invalid-qr', `Invalid QR token for employee ${employee_id}. Token: ${qrToken}`,
      {}, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'Invalid QR token.' }, { status: 403 });
  }

  try {
    // Verify that the calling user is the employee they claim to be scanning for
    // and that this employee belongs to the user's current restaurant context
    const { data: employeeSelfCheck, error: employeeSelfCheckError } = await supabaseAdmin
      .from('employees')
      .select('id, user_id, restaurant_id')
      .eq('id', employee_id) // employee_id from the request body
      .eq('user_id', callingUser.userId) // callingUser.userId from the session
      .eq('restaurant_id', callingUser.restaurantId) // ensure employee is part of the same restaurant
      .single();

    if (employeeSelfCheckError || !employeeSelfCheck) {
      await logger.warn('attendance-scan-auth-failed', `User ${callingUser.userId} attempted to scan for employee ${employee_id} without authorization or employee not found.`,
        { employeeIdInBody: employee_id, error: employeeSelfCheckError?.message }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Forbidden: You can only scan for yourself, or employee not found in your restaurant.' }, { status: 403 });
    }

    const work_date = getCurrentDate();
    const currentTime = new Date().toISOString();

    // Check for an existing attendance record for this employee and work_date
    const { data: existingRecord, error: fetchRecordError } = await supabaseAdmin
      .from('attendance_records')
      .select('id, check_in_time, check_out_time, employee_id, work_date')
      .eq('employee_id', employee_id)
      .eq('work_date', work_date)
      .eq('restaurant_id', callingUser.restaurantId) // ensure record is within the same restaurant
      .maybeSingle(); // Use maybeSingle as record might not exist

    if (fetchRecordError) {
      await logger.error('attendance-scan-fetch-existing', `Error fetching existing attendance record for employee ${employee_id}, date ${work_date}`, {
        error: fetchRecordError.message, employeeId: employee_id, workDate: work_date, restaurantId: callingUser.restaurantId,
      }, callingUser.restaurantId, callingUser.userId);
      return NextResponse.json({ error: 'Failed to retrieve existing attendance data.', details: fetchRecordError.message }, { status: 500 });
    }

    if (!existingRecord) {
      // No record exists: Create a new one (Check-In)
      const { data: newRecord, error: createError } = await supabaseAdmin
        .from('attendance_records')
        .insert({
          employee_id: employee_id,
          restaurant_id: callingUser.restaurantId,
          work_date: work_date,
          check_in_time: currentTime,
          status: 'recorded', // Default status
        })
        .select('*')
        .single();

      if (createError) {
        await logger.error('attendance-scan-check-in-error', `Error creating check-in record for employee ${employee_id}`, {
          error: createError.message, employeeId: employee_id, workDate: work_date, restaurantId: callingUser.restaurantId,
        }, callingUser.restaurantId, callingUser.userId);
        return NextResponse.json({ error: 'Failed to record check-in.', details: createError.message }, { status: 500 });
      }
      return NextResponse.json({ message: 'Checked-in successfully.', record: newRecord }, { status: 201 });

    } else if (existingRecord && !existingRecord.check_out_time) {
      // Record exists with check_in_time but no check_out_time: Update with Check-Out
      const checkInTime = new Date(existingRecord.check_in_time);
      const checkOutTime = new Date(currentTime);
      const hoursWorked = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60); // Hours

      const { data: updatedRecord, error: updateError } = await supabaseAdmin
        .from('attendance_records')
        .update({
          check_out_time: currentTime,
          hours_worked: parseFloat(hoursWorked.toFixed(2)), // Store as numeric, rounded to 2 decimal places
          // status remains 'recorded' until verified by manager
        })
        .eq('id', existingRecord.id)
        .select('*')
        .single();

      if (updateError) {
         await logger.error('attendance-scan-check-out-error', `Error creating check-out record for employee ${employee_id}`, {
          error: updateError.message, recordId: existingRecord.id, restaurantId: callingUser.restaurantId,
        }, callingUser.restaurantId, callingUser.userId);
        return NextResponse.json({ error: 'Failed to record check-out.', details: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ message: 'Checked-out successfully.', record: updatedRecord }, { status: 200 });

    } else {
      // Record exists with both check_in_time and check_out_time
      return NextResponse.json({ message: 'Already checked-out for the day.', record: existingRecord }, { status: 409 }); // 409 Conflict
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await logger.error('attendance-scan-catch', `Unexpected error during attendance scan for employee ${employee_id}`, {
        error: errorMessage, employeeIdAttempted: employee_id, restaurantId: callingUser.restaurantId,
      }, callingUser.restaurantId, callingUser.userId);
    return NextResponse.json({ error: 'An unexpected error occurred during scan process.', details: errorMessage }, { status: 500 });
  }
}
