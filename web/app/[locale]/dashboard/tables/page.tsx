import TableList from "../../../../components/TableList"; // Adjust path as needed
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for tables page. Defaulting to mock ID.");
  return "mock-restaurant-id-123"; // Fallback for now
}

export interface Table {
  id: string;
  name: string;
  // position_x?: number | null; // Uncomment if these fields exist and are needed
  // position_y?: number | null;
  // Add any other fields your table object might have
}

interface TablesPageProps {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

async function TableListLoader({ params, searchParams }: TablesPageProps) {
  const supabase = createServerActionClient({ cookies });
  const restaurantId = await getRestaurantId(searchParams);
  const { locale } = params;

  if (!restaurantId) {
    return <div>Error: Restaurant ID is required to view tables. Please ensure 'restaurantId' is in the URL query parameters.</div>;
  }

  const { data: tables, error } = await supabase
    .from("tables")
    .select("id, name") // Add position_x, position_y if they are to be displayed
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching tables:", error);
    return <div>Error loading tables: {error.message}</div>;
  }

  if (!tables) {
    return <div>No tables found for this restaurant.</div>;
  }

  return <TableList initialTables={tables as Table[]} locale={locale} restaurantId={restaurantId} />;
}


export default async function TablesPage({ params, searchParams }: TablesPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Restaurant Tables</h1>
      <Suspense fallback={<div>Loading tables...</div>}>
        <TableListLoader params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
