import CategoryForm from "../../../../../../components/CategoryForm"; // Adjust path as needed
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
// For this page, restaurantId is expected to be in searchParams
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for edit category page.");
  return null; // Or throw an error / redirect
}

interface EditCategoryPageProps {
  params: { locale: string; categoryId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component to handle async fetching and rendering
async function EditCategoryFormLoader({ params, searchParams }: EditCategoryPageProps) {
  const supabase = createServerActionClient({ cookies });
  const { locale, categoryId } = params;
  const restaurantId = await getRestaurantId(searchParams);

  if (!restaurantId) {
    return <div>Error: Restaurant ID is required to edit a category. Please ensure &apos;restaurantId&apos; is in the URL query parameters.</div>;
  }

  const { data: category, error } = await supabase
    .from("categories")
    .select("id, name, position") // Adjust fields as needed by the form
    .eq("id", categoryId)
    .eq("restaurant_id", restaurantId) // Ensure we fetch for the correct restaurant
    .single();

  if (error) {
    console.error("Error fetching category for editing:", error);
    return <div>Error loading category data: {error.message}. Ensure the category exists and belongs to the specified restaurant.</div>;
  }

  if (!category) {
    return <div>Category not found.</div>;
  }

  return <CategoryForm initialData={category} restaurantId={restaurantId} locale={locale} />;
}

export default async function EditCategoryPage({ params, searchParams }: EditCategoryPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Edit Category</h1>
      <Suspense fallback={<div>Loading category details...</div>}>
        <EditCategoryFormLoader params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
