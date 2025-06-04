import MenuItemForm from "../../../../../../../components/MenuItemForm"; // Adjust path
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
// For this page, restaurantId is expected to be in searchParams
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for new menu item page.");
  return null;
}

interface NewMenuItemPageProps {
  params: { locale: string; categoryId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component to handle async fetching of restaurantId and rendering MenuItemForm
async function MenuItemFormLoader({ params, searchParams }: NewMenuItemPageProps) {
  const restaurantId = await getRestaurantId(searchParams);
  const { locale, categoryId } = params;

  if (!restaurantId) {
    return <div>Error: Restaurant ID is required to create a new menu item. Please ensure 'restaurantId' is in the URL query parameters.</div>;
  }
  if (!categoryId) {
    return <div>Error: Category ID is required.</div>;
  }

  return <MenuItemForm restaurantId={restaurantId} categoryId={categoryId} locale={locale} />;
}

export default async function NewMenuItemPage({ params, searchParams }: NewMenuItemPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Create New Menu Item</h1>
      <Suspense fallback={<div>Loading form...</div>}>
        <MenuItemFormLoader params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
