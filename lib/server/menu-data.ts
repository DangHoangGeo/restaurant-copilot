import { db } from "@/lib/db";
import { categories as dbCategories, menuItems as dbMenuItems, categoryTranslations, menuItemTranslations } from "@/lib/db/schema";
import { eq, and, asc, or, isNull } from "drizzle-orm";
import { getLocaleName } from "@/lib/utils/locale"; // Assuming this utility for flattening names

// Define expected return structure for MenuClientContent
interface MenuItemClientData {
  id: string;
  name: string; // Localized
  description?: string; // Localized
  price: number;
  imageUrl?: string | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  available: boolean;
  weekdayVisibility?: number[] | null; // 0 (Sun) - 6 (Sat)
  // currencyCode should come from restaurant settings on client
}

interface CategoryClientData {
  id: string;
  name: string; // Localized
  items: MenuItemClientData[];
}

// Helper to get current day's visibility filter for menu items
// This needs to match how weekday_visibility is stored (e.g., array of numbers [0,1,2,3,4,5,6])
const getItemVisibilityCondition = (todayWeekday: number) => {
  // Check if weekdayVisibility is NULL (visible all days) OR contains todayWeekday
  // This depends on your Drizzle version and how you query JSON arrays.
  // For now, let's assume a simplified direct array check if possible, or fetch all and filter in JS.
  // A more robust SQL way might involve json_contains or similar, specific to your DB.
  // As a fallback, if direct array contains is hard, we might filter in JS after fetching.
  // For this example, we'll construct a condition that tries to match.
  // This is a placeholder, actual Drizzle syntax for JSON array contains might differ or not be direct.
  // return or(
  //   isNull(dbMenuItems.weekdayVisibility),
  //   sql`${dbMenuItems.weekdayVisibility} @> ${JSON.stringify([todayWeekday])}` // Example for PostgreSQL like syntax
  // );
  // Given Drizzle's current capabilities, it's often easier to filter in code after fetching if complex JSON ops are needed.
  // For simplicity, let's assume for now that we fetch items and filter weekday visibility in JS code.
  return undefined; // No direct SQL condition, will filter later
};


export async function getMenuDataForRestaurant(
  restaurantId: string,
  locale: string,
  todayWeekday: number // 0 (Sun) - 6 (Sat)
): Promise<CategoryClientData[]> {
  try {
    const categoriesWithItems = await db.query.dbCategories.findMany({
      where: and(
        eq(dbCategories.restaurantId, restaurantId),
        eq(dbCategories.isActive, true) // Only active categories
      ),
      orderBy: [asc(dbCategories.displayOrder), asc(dbCategories.createdAt)],
      with: {
        translations: {
            columns: { lang: true, name: true, description: true }
        },
        menuItems: {
          where: eq(dbMenuItems.available, true), // Only available items
          orderBy: [asc(dbMenuItems.displayOrder), asc(dbMenuItems.createdAt)],
          with: {
            translations: {
                columns: { lang: true, name: true, description: true }
            },
            // reviews: { columns: { rating: true } } // If calculating avgRating here
          },
        },
      },
    });

    const result: CategoryClientData[] = categoriesWithItems.map(category => {
      const categoryName = getLocaleName(category.translations, locale, 'name') || category.name_default || `Category ${category.id}`;

      const filteredItems = category.menuItems
        .filter(item => {
          // Filter by weekday_visibility
          if (item.weekdayVisibility && item.weekdayVisibility.length > 0) {
            return item.weekdayVisibility.includes(todayWeekday);
          }
          return true; // No restriction means visible all days
        })
        .map(item => {
          const itemName = getLocaleName(item.translations, locale, 'name') || item.name_default || `Item ${item.id}`;
          const itemDescription = getLocaleName(item.translations, locale, 'description') || item.description_default;

          // Placeholder for averageRating and totalReviews - this would typically involve another query or aggregation
          const averageRating = item.averageRating; // Assuming this field exists and is updated
          const totalReviews = item.reviewCount; // Assuming this field exists

          return {
            id: item.id,
            name: itemName,
            description: itemDescription || undefined,
            price: item.price,
            imageUrl: item.imageUrl,
            available: item.available, // Should always be true due to query filter, but good to include
            weekdayVisibility: item.weekdayVisibility,
            averageRating: averageRating,
            totalReviews: totalReviews,
          };
        });

      return {
        id: category.id,
        name: categoryName,
        items: filteredItems,
      };
    }).filter(category => category.items.length > 0); // Only return categories with visible items

    return result;

  } catch (error) {
    console.error("Error fetching menu data for restaurant:", restaurantId, error);
    return []; // Return empty array on error
  }
}
