// This type is for the `initialData` prop in MenuItemForm,
// representing a menu item fetched from the backend.
export interface MenuItem {
  id: string;
  name_en: string;
  name_ja?: string;
  name_vi?: string;
  description_en?: string;
  description_ja?: string;
  description_vi?: string;
  price: number;
  tags?: string[]; // Tags for the item, e.g., "vegan", "spicy"
  position?: number; // Position for sorting in the menu
  stock_level?: number; // Stock level for the item
  image_url?: string; // URL of the image
  category_id: string;
  available?: boolean;
  weekdayVisibility?: number[]; // Array of numbers (1-7 for Mon-Sun)
  // Toppings and sizes are added via intersection in MenuItemFormProps,
  // as their structure (ToppingData, MenuItemSizeData) is defined within MenuItemForm's Zod schemas.
}
