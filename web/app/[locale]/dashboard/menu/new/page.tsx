import CategoryForm from "../../../../../components/CategoryForm"; // Adjust path as needed
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
// For this page, restaurantId is expected to be in searchParams
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  // In a real scenario, you might try to get it from session or other context if not in query
  console.warn("restaurantId not found in searchParams for new category page.");
  return null;
}

interface NewCategoryPageProps {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component to handle async fetching of restaurantId and rendering CategoryForm
async function CategoryFormLoader({ searchParams, locale }: { searchParams: NewCategoryPageProps['searchParams'], locale: string }) {
  const restaurantId = await getRestaurantId(searchParams);

  if (!restaurantId) {
    return <div>Error: Restaurant ID is required to create a new category. Please ensure &apos;restaurantId&apos; is in the URL query parameters.</div>;
  }

  return <CategoryForm restaurantId={restaurantId} locale={locale} />;
}


export default async function NewCategoryPage({ params, searchParams }: NewCategoryPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Create New Category</h1>
      <Suspense fallback={<div>Loading form...</div>}>
        <CategoryFormLoader searchParams={searchParams} locale={params.locale} />
      </Suspense>
    </div>
  );
}
