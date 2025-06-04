import ScheduleCalendar from '@/components/ScheduleCalendar';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
async function getRestaurantId(searchParams: { [key:string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for schedule page. Defaulting to mock ID.");
  return "mock-restaurant-id-123"; // Fallback for now
}

export interface Shift {
  id: string;
  weekday: number; // 0 (Sun) to 6 (Sat) or 1 (Mon) to 7 (Sun) - ensure consistency
  start_time: string; // HH:mm format
  end_time: string; // HH:mm format
  employee_id: string; // Foreign key
  restaurant_id: string; // Foreign key
}

interface SchedulePageProps {
  params: { locale: string; employeeId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component for async data fetching
async function ScheduleLoader({ params, searchParams }: SchedulePageProps) {
  const supabase = createServerActionClient({ cookies });
  const { locale, employeeId } = params;
  const restaurantId = await getRestaurantId(searchParams);

  if (!restaurantId) {
    return <div className="text-red-600 p-4">Error: Restaurant ID is required. Please ensure &apos;restaurantId&apos; is in the URL query parameters.</div>;
  }
  if (!employeeId) {
    return <div className="text-red-600 p-4">Error: Employee ID is required.</div>;
  }

  // Fetch employee's name
  const { data: empData, error: empError } = await supabase
    .from("employees")
    .select("users!inner(name)") // Ensure 'users' is joined correctly
    .eq("id", employeeId)
    .eq("restaurant_id", restaurantId) // Ensure employee belongs to current restaurant
    .single();

  if (empError) {
    console.error("Error fetching employee name:", empError);
    return <div className="text-red-600 p-4">Error loading employee data: {empError.message}.</div>;
  }
  if (!empData || !empData.users || !empData.users[0].name) {
    return <div className="text-red-600 p-4">Employee not found or name is missing.</div>;
  }
  const employeeName = empData.users[0].name;

  // Fetch existing shifts for this employee at this restaurant
  const { data: shifts, error: shiftsError } = await supabase
    .from("schedules")
    .select("id, weekday, start_time, end_time, employee_id, restaurant_id")
    .eq("employee_id", employeeId)
    .eq("restaurant_id", restaurantId); // Also scope by restaurant_id for security/consistency

  if (shiftsError) {
    console.error("Error fetching shifts:", shiftsError);
    return <div className="text-red-600 p-4">Error loading schedule data: {shiftsError.message}.</div>;
  }

  return (
    <ScheduleCalendar
      employeeId={employeeId}
      employeeName={employeeName}
      initialShifts={shifts as Shift[] || []}
      restaurantId={restaurantId}
      locale={locale}
    />
  );
}

export default async function EmployeeSchedulePage({ params, searchParams }: SchedulePageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div className="text-center py-10 text-lg">Loading schedule...</div>}>
        <ScheduleLoader params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
