import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest'; // Adjust path if necessary

// Zod schema for creating a new schedule entry
const createScheduleSchema = z.object({
  employee_id: z.string().uuid("Invalid employee ID format."),
  restaurant_id: z.string().uuid("Invalid restaurant ID format."), // Keep for payload validation
  weekday: z.number().min(0).max(6), // Assuming 0=Sun, 6=Sat
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time format. Use HH:mm."),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time format. Use HH:mm."),
}).refine(data => {
    const [startHour, startMinute] = data.start_time.split(':').map(Number);
    const [endHour, endMinute] = data.end_time.split(':').map(Number);
    return endHour > startHour || (endHour === startHour && endMinute > startMinute);
}, {
    message: "End time must be after start time.",
    path: ["end_time"],
});

// The local getRestaurantIdFromSession function has been removed.

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID.' }, { status: 401 });
  }

  try {
    const reqJson = await req.json();
    const validation = createScheduleSchema.safeParse(reqJson);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
    }

    const newScheduleData = validation.data;

    // CRITICAL: Ensure the restaurant_id in the payload matches the user's session restaurant_id
    if (newScheduleData.restaurant_id !== user.restaurantId) {
      return NextResponse.json({ error: 'Forbidden: Mismatch in restaurant ID. Cannot create schedule for another restaurant.' }, { status: 403 });
    }

    // Verify employee belongs to the user's restaurant
    const { data: employeeCheck, error: employeeCheckError } = await supabase
        .from('employees')
        .select('id')
        .eq('id', newScheduleData.employee_id)
        .eq('restaurant_id', user.restaurantId) // Use user.restaurantId from session
        .single();

    if (employeeCheckError || !employeeCheck) {
        // Consider providing different messages based on employeeCheckError (e.g. DB error) vs !employeeCheck (not found)
        return NextResponse.json({ error: 'Employee not found in your restaurant or error validating employee.' }, { status: 404 });
    }

    // Insert the schedule; newScheduleData already contains restaurant_id which is now validated
    // against the user's session and confirmed that the employee belongs to this restaurant.
    const { data: createdSchedule, error: insertError } = await supabase
      .from("schedules")
      .insert(newScheduleData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting schedule:', insertError);
      if (insertError.code === '23505') { // Unique constraint violation (e.g., duplicate schedule)
          return NextResponse.json({ error: 'This shift overlaps with an existing shift or violates a constraint.' }, { status: 409 });
      }
      return NextResponse.json({ error: `Failed to create schedule: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json(createdSchedule, { status: 201 });

  } catch (error) {
    console.error('Unexpected error in create schedule API:', error);
    // Handle potential JSON parsing errors if req.json() fails
    if (error instanceof SyntaxError && (error as any).body === true) { // Next.js might wrap SyntaxError
        return NextResponse.json({ error: 'Invalid JSON format in request body.' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}
