import EmployeeForm from "../../../../../components/EmployeeForm"; // Adjust path
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for new employee page. Defaulting to mock ID.");
  return "mock-restaurant-id-123"; // Fallback for now
}

interface NewEmployeePageProps {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component to handle async fetching of restaurantId
async function EmployeeFormLoader({ searchParams, locale }: { searchParams: NewEmployeePageProps['searchParams'], locale: string }) {
  const restaurantId = await getRestaurantId(searchParams);

  if (!restaurantId) {
    return <div className="text-red-600 p-4">Error: Restaurant ID is required. Please ensure 'restaurantId' is in the URL query parameters.</div>;
  }

  return <EmployeeForm restaurantId={restaurantId} locale={locale} />;
}

export default async function NewEmployeePage({ params, searchParams }: NewEmployeePageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Add New Employee</h1>
      <Suspense fallback={<div className="text-center py-10 text-lg">Loading form...</div>}>
        <EmployeeFormLoader searchParams={searchParams} locale={params.locale} />
      </Suspense>
    </div>
  );
}
