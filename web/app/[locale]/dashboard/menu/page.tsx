import CategoryList from "../../../../components/CategoryList"; // Adjust path as needed
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Mocked/Placeholder function - replace with actual implementation
async function getCurrentRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  console.log("searchParams received by getCurrentRestaurantId:", searchParams);
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  return "mock-restaurant-id-123"; // Replace with actual logic
}

// Define types for better clarity, mirroring expected Supabase structure
interface MenuItem {
  id: string;
  name_ja: string | null;
  name_en: string | null;
  name_vi: string | null;
  available: boolean;
  position: number;
  // Add other menu item fields if necessary
}

export interface Category {
  id: string;
  name: string; // Assuming name is a simple string for now, or adapt if it's an object like {en: "Name", ja: "名前"}
  position: number;
  menu_items: MenuItem[];
  // Add other category fields if necessary
}

interface MenuPageProps {
  params: { locale: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function MenuPage({ params, searchParams }: MenuPageProps) {
  const supabase = createServerActionClient({ cookies });
  const restaurantId = await getCurrentRestaurantId(searchParams);

  if (!restaurantId) {
    return <div>Error: Restaurant could not be determined. Ensure 'restaurantId' query param is set for now.</div>;
  }

  const { data: categories, error } = await supabase
    .from("categories")
    .select(`
      id,
      name,
      position,
      menu_items (
        id,
        name_ja,
        name_en,
        name_vi,
        available,
        position
      )
    `)
    .eq("restaurant_id", restaurantId)
    .order("position", { ascending: true })
    .order("position", { referencedTable: "menu_items", ascending: true });

  if (error) {
    console.error("Error fetching categories and menu items:", error);
    return <div>Error loading menu data: {error.message}</div>;
  }

  if (!categories) {
    return <div>No categories found for this restaurant.</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Menu Management</h1>
      <CategoryList initialCategories={categories as Category[]} locale={params.locale} restaurantId={restaurantId} />
    </div>
  );
}
