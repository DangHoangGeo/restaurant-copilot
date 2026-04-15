import { createRouteHandlerClient, SupabaseClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';

// Zod schema for updating a schedule entry (all fields optional)
const updateScheduleSchema = z.object({
  weekday: z.number().min(0).max(6).optional(), // Assuming 0=Sun, 6=Sat
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time. Use HH:mm.").optional(),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time. Use HH:mm.").optional(),
}).partial().refine(data => {
    // If both start_time and end_time are provided, validate end_time is after start_time
    if (data.start_time && data.end_time) {
        const [startHour, startMinute] = data.start_time.split(':').map(Number);
        const [endHour, endMinute] = data.end_time.split(':').map(Number);
        return endHour > startHour || (endHour === startHour && endMinute > startMinute);
    }
    // If only one is provided, or neither, this specific validation passes
    return true;
}, {
    message: "End time must be after start time if both are specified.",
    path: ["end_time"],
});



// PATCH handler for updating a schedule
export async function PATCH(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const scheduleId = req.nextUrl.searchParams.get("scheduleId") || "";

  if (!scheduleId) {
    return NextResponse.json({ error: 'Schedule ID is required.' }, { status: 400 });
  }

  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const userRestaurantId = user.restaurantId;

    const reqJson = await req.json();
    const validation = updateScheduleSchema.safeParse(reqJson);

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid input.', details: validation.error.flatten() }, { status: 400 });
    }

    const scheduleUpdateData = validation.data;

    if (Object.keys(scheduleUpdateData).length === 0) {
        return NextResponse.json({ error: 'No fields to update provided.' }, { status: 400 });
    }

    // Before updating, ensure the schedule entry belongs to the user's restaurant
    // This is mainly for confirming existence and ownership before an update. RLS handles actual write protection.
    const { data: existingSchedule, error: fetchError } = await supabase
      .from("schedules")
      .select("id")
      .eq("id", scheduleId)
      .eq("restaurant_id", userRestaurantId) // Crucial check
      .single();

    if (fetchError || !existingSchedule) {
      return NextResponse.json({ error: 'Schedule not found or not authorized to update.' }, { status: 404 });
    }

    const { data: updatedSchedule, error: updateError } = await supabase
      .from("schedules")
      .update(scheduleUpdateData)
      .eq("id", scheduleId)
      // No need to eq restaurant_id here again if RLS is solid, but doesn't hurt for clarity if RLS is bypassed by service key.
      // However, for user-level operations, relying on RLS is standard. The check above confirms ownership.
      .select()
      .single();

    if (updateError) {
      console.error('Error updating schedule:', updateError);
      if (updateError.code === '23505') { // Unique violation
          return NextResponse.json({ error: 'This update would cause an overlap or violate a unique constraint.' }, { status: 409 });
      }
      return NextResponse.json({ error: `Failed to update schedule: ${updateError.message}` }, { status: 500 });
    }

    return NextResponse.json(updatedSchedule, { status: 200 });

  } catch (error) {
    console.error('Unexpected error in update schedule API:', error);
    if ((error as Error).name === 'SyntaxError') { // Handle JSON parsing error
      return NextResponse.json({ error: 'Invalid JSON format in request body.' }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}


// DELETE handler for removing a schedule
export async function DELETE(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies });
  const scheduleId = req.nextUrl.searchParams.get("scheduleId") || "";

  if (!scheduleId) {
    return NextResponse.json({ error: 'Schedule ID is required.' }, { status: 400 });
  }

  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }
    const userRestaurantId = user.restaurantId;

    // Perform delete, ensuring the schedule belongs to the user's restaurant
    const { error: deleteError, count } = await supabase
      .from("schedules")
      .delete({ count: 'exact' })
      .eq("id", scheduleId)
      .eq("restaurant_id", userRestaurantId); // RLS is primary, this is defense-in-depth

    if (deleteError) {
      console.error('Error deleting schedule:', deleteError);
      return NextResponse.json({ error: `Failed to delete schedule: ${deleteError.message}` }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Schedule not found or not authorized to delete.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Schedule deleted successfully.' }, { status: 200 }); // Or 204 No Content

  } catch (error) {
    console.error('Unexpected error in delete schedule API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'An unexpected error occurred.', details: errorMessage }, { status: 500 });
  }
}
