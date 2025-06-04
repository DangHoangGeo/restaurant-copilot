import TableForm from "../../../../../components/TableForm"; // Adjust path as needed
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for new table page. Defaulting to mock ID.");
  return "mock-restaurant-id-123"; // Fallback for now
}

interface NewTablePageProps {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component to handle async fetching of restaurantId and rendering TableForm
async function TableFormLoader({ searchParams, locale }: { searchParams: NewTablePageProps['searchParams'], locale: string }) {
  const restaurantId = await getRestaurantId(searchParams);

  if (!restaurantId) {
    return <div className="text-red-600 p-4">Error: Restaurant ID is required to create a new table. Please ensure 'restaurantId' is in the URL query parameters.</div>;
  }

  return <TableForm restaurantId={restaurantId} locale={locale} />;
}

export default async function NewTablePage({ params, searchParams }: NewTablePageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Create New Table</h1>
      <Suspense fallback={<div className="text-center py-10">Loading form...</div>}>
        <TableFormLoader searchParams={searchParams} locale={params.locale} />
      </Suspense>
    </div>
  );
}
