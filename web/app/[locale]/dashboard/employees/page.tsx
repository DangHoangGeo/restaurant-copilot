import EmployeeList from "../../../../../components/EmployeeList"; // Adjust path
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for employees page. Defaulting to mock ID.");
  return "mock-restaurant-id-123"; // Fallback for now
}

// Define EmployeeWithUser interface
// Mirrors the structure of the data fetched, including the nested users table
export interface EmployeeWithUser {
  id: string; // Employee ID
  role: "chef" | "server" | "cashier" | "manager" | string; // Employee role
  users: { // From the joined 'users' table
    id: string; // User ID (this is employees.user_id)
    name: string | null;
    email: string | null;
  } | null; // users can be null if the join finds no matching user (though ideally user_id should always link to a valid user)
}

interface EmployeesPageProps {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component for async operations
async function EmployeeListLoader({ params, searchParams }: EmployeesPageProps) {
  const supabase = createServerActionClient({ cookies });
  const restaurantId = await getRestaurantId(searchParams);
  const { locale } = params;

  if (!restaurantId) {
    return <div className="text-red-600 p-4">Error: Restaurant ID is required. Please ensure 'restaurantId' is in the URL query parameters.</div>;
  }

  // Fetch employees and their related user information
  // Note: Supabase automatically joins based on foreign key `user_id` in `employees` table referencing `id` in `users` table.
  // The select query `users(id, name, email)` fetches these specific fields from the related user.
  const { data: employees, error } = await supabase
    .from("employees")
    .select(`
      id,
      role,
      users (
        id,
        name,
        email
      )
    `)
    .eq("restaurant_id", restaurantId);

  if (error) {
    console.error("Error fetching employees:", error);
    return <div className="text-red-600 p-4">Error loading employees: {error.message}</div>;
  }

  if (!employees) {
    return <div className="text-gray-600 p-4">No employees found for this restaurant.</div>;
  }

  return <EmployeeList initialEmployees={employees as EmployeeWithUser[]} locale={locale} restaurantId={restaurantId} />;
}

export default async function EmployeesPage({ params, searchParams }: EmployeesPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Employee Directory</h1>
      <Suspense fallback={<div className="text-center py-10 text-lg">Loading employees...</div>}>
        <EmployeeListLoader params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
