"use client";

import MenuItemCard from "./MenuItemCard";
// Assume MenuItem and RestaurantSettings types are defined elsewhere and imported
// For now, defining placeholders:
interface MenuItemData {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
  averageRating?: number | null;
  totalReviews?: number | null;
  available: boolean;
  weekdayVisibility?: number[] | null; // 0 (Sun) - 6 (Sat)
  // currencyCode?: string;
}

interface CategoryData {
  id: string;
  name: string; // Should be localized before passing
  items: MenuItemData[];
}

interface CategorySectionProps {
  category: CategoryData;
  todayWeekday: number; // 0 (Sunday) to 6 (Saturday)
  restaurantPrimaryColor: string;
  restaurantSecondaryColor?: string;
}

export default function CategorySection({
  category,
  todayWeekday,
  restaurantPrimaryColor,
  restaurantSecondaryColor,
}: CategorySectionProps) {
  const visibleItems = category.items.filter((item) => {
    if (!item.available) {
      return false;
    }
    if (
      item.weekdayVisibility &&
      item.weekdayVisibility.length > 0 &&
      !item.weekdayVisibility.includes(todayWeekday)
    ) {
      return false;
    }
    return true;
  });

  if (visibleItems.length === 0) {
    return null; // Don't render the section if no items are visible
  }

  return (
    <section id={`category-${category.id}`} className="py-6 md:py-8">
      <h2
        className="text-2xl md:text-3xl font-bold mb-6"
        style={{ color: restaurantPrimaryColor }}
      >
        {category.name}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {visibleItems.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            restaurantPrimaryColor={restaurantPrimaryColor}
            restaurantSecondaryColor={restaurantSecondaryColor}
          />
        ))}
      </div>
    </section>
  );
}
