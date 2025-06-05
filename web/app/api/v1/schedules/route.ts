import { createRouteHandlerClient, SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Zod schema for creating a new schedule entry
// Ensure weekday convention matches client (e.g., 0=Sun, 1=Mon... or 1=Mon, 7=Sun)
const createScheduleSchema = z.object({
  employee_id: z.string().uuid("Invalid employee ID format."),
  restaurant_id: z.string().uuid("Invalid restaurant ID format."),
  weekday: z.number().min(0, "Weekday must be between 0 (Sunday) and 6 (Saturday).").max(6, "Weekday must be between 0 (Sunday) and 6 (Saturday)."), // Assuming 0=Sun, 6=Sat
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format. Use HH:mm."),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format. Use HH:mm."),
}).refine(data => {
    // Validate end_time is after start_time
    const [startHour, startMinute] = data.start_time.split(':').map(Number);
    const [endHour, endMinute] = data.end_time.split(':').map(Number);
    return endHour > startHour || (endHour === startHour && endMinute > startMinute);
}, {
    message: "End time must be after start time.",
    path: ["end_time"], // Path to field causing the error
});


// Placeholder for getting restaurant_id from user session or JWT
async function getRestaurantIdFromSession(supabase: SupabaseClient): Promise<string | null> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    console.error("Session error for schedule create:", sessionError);
    return null;
  }
  return session.user?.user_metadata?.restaurant_id || "mock-restaurant-id-123"; // Replace with actual logic
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });

  try {
    const userRestaurantId = await getRestaurantIdFromSession(supabase);
    if (!userRestaurantId) {
      return NextResponse.json({ error: 'Unauthorized or restaurant ID not found in session.' }, { status: 401 });
    }

    const reqJson = await req.json();
    const validation = createScheduleSchema.safeParse(reqJson);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
    }

    const newScheduleData = validation.data;

    // Ensure the restaurant_id in the payload matches the user's session restaurant_id for security
    if (newScheduleData.restaurant_id !== userRestaurantId) {
      return NextResponse.json({ error: 'Forbidden. Mismatch in restaurant ID.' }, { status: 403 });
    }

    // Optional: Verify employee belongs to the restaurant before inserting schedule
    // This adds an extra DB call but can prevent orphaned schedule entries if employee_id is arbitrary
    const { data: employeeCheck, error: employeeCheckError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', newScheduleData.employee_id)
        .eq('restaurant_id', userRestaurantId)
        .single();

    if (employeeCheckError || !employeeCheck) {
        return NextResponse.json({ error: 'Employee not found in this restaurant or validation error.' }, { status: 404 });
    }


    const { data: createdSchedule, error: insertError } = await supabase
      .from("schedules")
      .insert(newScheduleData)
      .select() // Return the created record
      .single(); // Expecting a single record to be created and returned

    if (insertError) {
      console.error('Error inserting schedule:', insertError);
      // Could be a duplicate if (employee_id, weekday, start_time) has a unique constraint
      if (insertError.code === '23505') { // Unique violation
          return NextResponse.json({ error: 'This shift overlaps with an existing shift for this employee on this day or violates a unique constraint.' }, { status: 409 });
      }
      return NextResponse.json({ error: `Failed to create schedule: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json(createdSchedule, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in create schedule API:', error);
    if ((error as Error).name === 'SyntaxError') { // Handle JSON parsing error
        return NextResponse.json({ error: 'Invalid JSON format in request body.' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}
