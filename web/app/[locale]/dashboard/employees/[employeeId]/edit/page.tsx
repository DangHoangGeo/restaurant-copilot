import EmployeeForm from "../../../../../../components/EmployeeForm"; // Adjust path
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for edit employee page. Defaulting to mock ID.");
  return "mock-restaurant-id-123"; // Fallback for now
}

// Interface for the data passed to EmployeeForm as initialData
export interface EmployeeFormData {
  id: string; // Employee ID
  role: "chef" | "server" | "cashier" | "manager" | string;
  user_id: string; // The actual user_id foreign key
  users: { // From the joined 'users' table
    email: string | null; // Only email is needed for prefilling, name is display-only on list
  } | null;
}

interface EditEmployeePageProps {
  params: { locale: string; employeeId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component for async operations
async function EditEmployeeFormLoader({ params, searchParams }: EditEmployeePageProps) {
  const supabase = createServerActionClient({ cookies });
  const { locale, employeeId } = params;
  const restaurantId = await getRestaurantId(searchParams);

  if (!restaurantId) {
    return <div className="text-red-600 p-4">Error: Restaurant ID is required. Please ensure &apos;restaurantId&apos; is in the URL query parameters.</div>;
  }
  if (!employeeId) {
    return <div className="text-red-600 p-4">Error: Employee ID is required.</div>;
  }

  // Fetch existing employee data
  const { data: employeeData, error } = await supabase
    .from("employees")
    .select(`
      id,
      role,
      user_id,
      users (email)
    `)
    .eq("id", employeeId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (error) {
    console.error("Error fetching employee for editing:", error);
    return <div className="text-red-600 p-4">Error loading employee data: {error.message}.</div>;
  }

  if (!employeeData) {
    return <div className="text-red-600 p-4">Employee not found or does not belong to this restaurant.</div>;
  }

  return <EmployeeForm initialData={{
    ...employeeData,
    users: Array.isArray(employeeData.users) ? employeeData.users[0] : employeeData.users
  } as EmployeeFormData} restaurantId={restaurantId} locale={locale} />;
}


export default async function EditEmployeePage({ params, searchParams }: EditEmployeePageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Edit Employee</h1>
      <Suspense fallback={<div className="text-center py-10 text-lg">Loading employee details...</div>}>
        <EditEmployeeFormLoader params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
