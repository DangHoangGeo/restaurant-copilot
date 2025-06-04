import TableForm from "../../../../../../components/TableForm"; // Adjust path as needed
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for edit table page. Defaulting to mock ID.");
  return "mock-restaurant-id-123"; // Fallback for now
}

export interface TableData { // Exporting for use in TableForm if needed, though props are defined there
  id: string;
  name: string;
  position_x: number | null;
  position_y: number | null;
  // Add other fields if your table has more, e.g., qr_code
}

interface EditTablePageProps {
  params: { locale: string; tableId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component to handle async fetching and rendering
async function EditTableFormLoader({ params, searchParams }: EditTablePageProps) {
  const supabase = createServerActionClient({ cookies });
  const { locale, tableId } = params;
  const restaurantId = await getRestaurantId(searchParams);

  if (!restaurantId) {
    return <div className="text-red-600 p-4">Error: Restaurant ID is required to edit a table. Please ensure &apos;restaurantId&apos; is in the URL query parameters.</div>;
  }

  const { data: table, error } = await supabase
    .from("tables")
    .select("id, name, position_x, position_y") // Fields needed for the form
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId) // Ensure we fetch for the correct restaurant
    .single();

  if (error) {
    console.error("Error fetching table for editing:", error);
    return <div className="text-red-600 p-4">Error loading table data: {error.message}. Ensure the table exists and belongs to the specified restaurant.</div>;
  }

  if (!table) {
    return <div className="text-red-600 p-4">Table not found.</div>;
  }

  return <TableForm initialData={table as TableData} restaurantId={restaurantId} locale={locale} />;
}

export default async function EditTablePage({ params, searchParams }: EditTablePageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Edit Table</h1>
      <Suspense fallback={<div className="text-center py-10">Loading table details...</div>}>
        <EditTableFormLoader params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
