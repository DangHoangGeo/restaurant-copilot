import MenuItemForm from "../../../../../../../../components/MenuItemForm"; // Adjust path
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
// For this page, restaurantId is expected to be in searchParams
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for edit menu item page.");
  return null;
}

interface EditMenuItemPageProps {
  params: { locale: string; categoryId: string; itemId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component to handle async fetching and rendering
async function EditMenuItemFormLoader({ params, searchParams }: EditMenuItemPageProps) {
  const supabase = createServerActionClient({ cookies });
  const { locale, categoryId, itemId } = params;
  const restaurantId = await getRestaurantId(searchParams);

  if (!restaurantId) {
    return <div>Error: Restaurant ID is required to edit a menu item. Please ensure 'restaurantId' is in the URL query parameters.</div>;
  }
  if (!categoryId || !itemId) {
    return <div>Error: Category ID and Item ID are required.</div>
  }

  const { data: item, error } = await supabase
    .from("menu_items")
    .select("*") // Select all fields, or specify needed ones for the form
    .eq("id", itemId)
    .eq("restaurant_id", restaurantId) // Ensure it belongs to the correct restaurant
    .eq("category_id", categoryId) // Ensure it belongs to the correct category
    .single();

  if (error) {
    console.error("Error fetching menu item for editing:", error);
    return <div>Error loading menu item data: {error.message}. Ensure it exists and belongs to the specified restaurant/category.</div>;
  }

  if (!item) {
    return <div>Menu item not found.</div>;
  }

  return <MenuItemForm initialItemData={item} restaurantId={restaurantId} categoryId={categoryId} locale={locale} />;
}


export default async function EditMenuItemPage({ params, searchParams }: EditMenuItemPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Edit Menu Item</h1>
      <Suspense fallback={<div>Loading item details...</div>}>
        <EditMenuItemFormLoader params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
