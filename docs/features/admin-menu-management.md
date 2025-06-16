# Admin Menu Management

## Summary

The Admin Menu Management feature allows administrators to comprehensively manage their restaurant's menu. This includes creating, viewing, updating, deleting, and organizing menu items and categories. It also supports drag-and-drop reordering for both categories and items within categories. The feature incorporates multi-lingual support for item names and descriptions, and leverages AI for translation and description generation.

## How it works technically

### Frontend

The frontend is built using Next.js and React, with Zustand for state management implicitly (based on typical project structure, though not explicitly seen in these files) and React Hook Form for managing form state and validation.

- **Main Page (`web/app/[locale]/dashboard/menu/page.tsx`):**
    - Server-side component responsible for fetching initial menu data (categories with their items) for the restaurant.
    - Handles localization setup using `next-intl`.
    - Passes initial data to `MenuClientContent`.
- **Client Content (`web/app/[locale]/dashboard/menu/menu-client-content.tsx`):**
    - Main client-side component for rendering the menu management interface.
    - Implements drag-and-drop functionality for categories and menu items using `@hello-pangea/dnd`.
    - Manages modals for creating/editing categories and menu items.
    - Handles API calls for CRUD operations and reordering.
    - Integrates AI translation and description generation features.
    - Uses `getLocalizedText` utility for displaying text in the current locale.
- **Category Form (`web/components/features/admin/menu/CategoryForm.tsx`):**
    - (Note: This specific file `CategoryForm.tsx` seems to be an older or alternative version. `MenuClientContent.tsx` has its own inline `CategoryModal` component that uses `categoryForm` from `useForm`.)
    - The form used within `MenuClientContent` for creating and editing categories.
    - Handles form submission and calls API endpoints for categories.
    - Includes fields for category name (EN, JA, VI) and position (though position is mainly handled by D&D).
- **Menu Item Form (`web/components/features/admin/menu/MenuItemForm.tsx`):**
    - A comprehensive form for creating and editing menu items.
    - Used within a dialog in `MenuClientContent.tsx`.
    - Fields include:
        - Name (EN, JA, VI)
        - Description (EN, JA, VI)
        - Price (disabled if sizes are present)
        - Category selection
        - Image upload (with compression using `browser-image-compression`) and preview
        - Stock level
        - Availability (boolean toggle)
        - Weekday visibility (using `WeekdaySelector`)
        - Toppings (name, price, position - can be added dynamically)
        - Sizes (size key, name, price, position - can be added dynamically, includes predefined S,M,L option)
    - Supports AI translation for names and AI description generation.
    - Handles form submission and calls the `onSave` prop (which in turn calls API endpoints).
- **Weekday Selector (`web/components/features/admin/menu/WeekdaySelector.tsx`):**
    - A reusable component to select days of the week for menu item availability.

### Backend (API Routes)

The backend API is built using Next.js API routes. It uses Supabase for database interactions, with `supabaseAdmin` client for direct database access, bypassing RLS where necessary for administrative tasks. User authentication and restaurant ownership are checked for relevant operations.

- **Categories:**
    - `POST /api/v1/owner/categories` (`web/app/api/v1/owner/categories/route.ts`): Creates a new category. Requires authenticated user with a `restaurantId`. Validates input using Zod schema.
    - `GET /api/v1/owner/categories?restaurantId={id}` (`web/app/api/v1/owner/categories/route.ts`): Fetches all categories for a given `restaurantId`, including their menu items, toppings, and sizes, ordered by position.
    - `PUT /api/v1/owner/categories/{categoryId}` (`web/app/api/v1/owner/categories/[categoryId]/route.ts`): Updates an existing category (name, position). Checks if category belongs to user's restaurant.
    - `DELETE /api/v1/owner/categories/{categoryId}` (`web/app/api/v1/owner/categories/[categoryId]/route.ts`): Deletes a category. Checks if category belongs to user's restaurant and if it contains any menu items (prevents deletion if not empty).
- **Menu Items:**
    - `POST /api/v1/menu-items` (`web/app/api/v1/menu-items/route.ts`): Creates a new menu item. Requires authenticated user with `restaurantId`. Validates input (including toppings and sizes) using Zod schema. Verifies category ownership. Inserts item, toppings, and sizes in a transaction-like manner.
    - `GET /api/v1/menu-items?restaurantId={id}` (`web/app/api/v1/menu-items/route.ts`): Fetches all menu items for a restaurant. (Note: The client seems to fetch categories which then include items, this endpoint might be for a different view or admin purpose).
    - `PUT /api/v1/menu-items/{itemId}` (`web/app/api/v1/menu-items/[itemId]/route.ts`): Updates an existing menu item. Checks item ownership. Handles updates to item data, toppings (delete and re-insert), and sizes (delete and re-insert).
    - `DELETE /api/v1/menu-items/{itemId}` (`web/app/api/v1/menu-items/[itemId]/route.ts`): Deletes a menu item. Checks item ownership.
- **Reordering:**
    - `POST /api/v1/menu/reorder` (`web/app/api/v1/menu/reorder/route.ts`): Updates the position of categories. Takes an array of `{id: string, position: number}`. (Note: `MenuClientContent.tsx` seems to handle item reordering by directly calling the item PUT endpoint with new position and potentially new category_id).
- **AI Endpoints:**
    - `POST /api/v1/ai/translate` (`web/app/api/v1/ai/translate/route.ts`): Translates text (item name, topping name, category name) into English, Japanese, and Vietnamese using Google Gemini. Includes fallback translations for common terms.
    - `POST /api/v1/ai/generate-description` (`web/app/api/v1/ai/generate-description/route.ts`): Generates menu item descriptions in specified language using Google Gemini based on item name and existing description.
    - `POST /api/v1/ai/analyze-menu-item` (`web/app/api/v1/ai/analyze-menu-item/route.ts`): Provides AI-powered analysis and suggestions for a menu item (name, description, price, category, etc.) using Google Gemini.

### Data Structures & Types

- **MenuItem (`web/shared/types/menu-item.types.ts`):** Defines the core structure for a menu item, including multilingual names/descriptions, price, image URL, availability, stock, etc. Toppings and sizes are handled by Zod schemas within forms and API routes.
- **MenuItemCategory (`web/shared/types/menu-item-category.types.ts`):** Defines the structure for a menu item category (ID, name). Multilingual names are handled in API responses and forms.
- **Zod Schemas:** Various Zod schemas are defined within the component files (e.g., `MenuItemForm.tsx`, `menu-client-content.tsx`) and API route files for validating form data and API request bodies. These include schemas for:
    - `categoryFormSchema` / `getCategorySchema`
    - `menuItemFormSchema` / `getMenuItemSchema`
    - `toppingSchema`
    - `menuItemSizeSchema`

### Database Tables (Deduced from API interactions)

Based on the API route handlers and data structures, the following Supabase tables are likely involved:

- `categories`: Stores menu categories (id, restaurant_id, name_en, name_ja, name_vi, position).
- `menu_items`: Stores menu items (id, restaurant_id, category_id, name_en, name_ja, name_vi, description_en, description_ja, description_vi, price, image_url, available, weekday_visibility, stock_level, position).
- `toppings`: Stores toppings for menu items (id, restaurant_id, menu_item_id, name_en, name_ja, name_vi, price, position). This seems to be a related table.
- `menu_item_sizes`: Stores different sizes for menu items (id, restaurant_id, menu_item_id, size_key, name_en, name_ja, name_vi, price, position). This is another related table.
- `restaurant_uploads` (Supabase Storage Bucket): Used for storing menu item images.

## Dependencies

- `next-intl`: For internationalization (i18n).
- `react-hook-form`: For form handling and validation.
- `@hookform/resolvers/zod`: For using Zod schemas with React Hook Form.
- `zod`: For schema validation.
- `@hello-pangea/dnd`: For drag-and-drop functionality.
- `lucide-react`: For icons.
- `shadcn/ui` components (Button, Input, Form, Card, Dialog, Checkbox, Select, Textarea, etc.): For UI elements.
- `sonner`: For toast notifications.
- `browser-image-compression`: For client-side image compression before upload.
- `@supabase/auth-helpers-nextjs` & `lib/supabase/client`, `lib/supabaseAdmin`: For Supabase interactions.
- `lib/gemini`: For interacting with Google Gemini AI for translation and content generation.

## File and Folder Paths

**Frontend Components & Pages:**
- `web/app/[locale]/dashboard/menu/page.tsx`
- `web/app/[locale]/dashboard/menu/menu-client-content.tsx`
- `web/components/features/admin/menu/MenuItemForm.tsx`
- `web/components/features/admin/menu/WeekdaySelector.tsx`
- `web/components/features/admin/menu/CategoryForm.tsx` (Note: an older/alternative version, primary logic is in `menu-client-content.tsx`)

**API Routes:**
- `web/app/api/v1/owner/categories/route.ts`
- `web/app/api/v1/owner/categories/[categoryId]/route.ts`
- `web/app/api/v1/menu-items/route.ts`
- `web/app/api/v1/menu-items/[itemId]/route.ts`
- `web/app/api/v1/menu/reorder/route.ts`
- `web/app/api/v1/ai/translate/route.ts`
- `web/app/api/v1/ai/generate-description/route.ts`
- `web/app/api/v1/ai/analyze-menu-item/route.ts`

**Shared Types:**
- `web/shared/types/menu-item.types.ts`
- `web/shared/types/menu-item-category.types.ts`

**Helper Libraries:**
- `lib/utils.ts` (contains `getLocalizedText`)
- `lib/server/getUserFromRequest.ts`
- `lib/supabase/client.ts`
- `lib/supabaseAdmin.ts`
- `lib/gemini.ts`

## How to use or modify

### How an admin uses the UI (briefly)

1.  **View Menu**: Navigate to the Menu section in the admin dashboard. Categories are displayed, each containing its menu items.
2.  **Add Category**: Click "Add Category". A modal appears to enter category name (translations can be auto-generated).
3.  **Edit Category**: Click "Edit" on a category card. Modify name in the modal.
4.  **Delete Category**: Click "Delete" on a category card. Confirmation is required. Categories with items cannot be deleted.
5.  **Reorder Categories**: Drag and drop category cards to change their display order.
6.  **Add Menu Item**: Within a category card, click "Add Item". A detailed form modal appears.
    -   Fill in item details: name (translations can be auto-generated), description (can be AI-generated), price, select category (pre-filled), upload image, set stock, availability, weekday visibility.
    -   Add toppings and sizes with their own names and prices if needed.
7.  **Edit Menu Item**: Click "Edit" on a menu item. The same detailed form appears.
8.  **Delete Menu Item**: Click "Delete" on a menu item. Confirmation is required.
9.  **Reorder Menu Items**: Drag and drop menu item cards within a category or between categories to change their order and category assignment.

### How a developer might add a new field to a menu item (e.g., "spice level")

Let's say we want to add a "spice_level" field (e.g., an integer from 0 to 5).

1.  **Update Database Schema**:
    -   Add a `spice_level` column (e.g., `integer`) to the `menu_items` table in Supabase. Set a default value (e.g., 0).
2.  **Update Shared Type**:
    -   Add `spice_level?: number;` to `web/shared/types/menu-item.types.ts`.
3.  **Update Frontend Form (`web/components/features/admin/menu/MenuItemForm.tsx`):**
    -   **Zod Schema**: Add `spice_level: z.coerce.number().int().min(0).max(5).optional(),` to `menuItemFormSchema`.
    -   **Form UI**: Add a new `FormField` for `spice_level`. This could be a `Select` component, a set of radio buttons, or a simple `Input type="number"`.
        ```tsx
        <FormField
          control={form.control}
          name="spice_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('item.spice_level_label')}</FormLabel>
              <FormControl>
                {/* Example using Input, ideally a Slider or Select */}
                <Input type="number" min="0" max="5" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        ```
    -   **Default Values**: Update `defaultValues` in the `useForm` hook within `MenuItemForm` and in `MenuClientContent.tsx` where `itemForm` is initialized, to include `spice_level: initialData?.spice_level || 0,`.
    -   **Localization**: Add translations for `item.spice_level_label` in relevant JSON language files.
4.  **Update API Route - Create (`web/app/api/v1/menu-items/route.ts` - POST):**
    -   **Zod Schema**: Add `spice_level: z.number().int().min(0).max(5).optional(),` to `menuItemSchema`.
    -   **Data Handling**: Destructure `spice_level` from `validatedData.data`.
    -   Add `spice_level` to the `menuItemData` object being inserted into the database: `if (spice_level !== undefined) { menuItemData.spice_level = spice_level; }`.
5.  **Update API Route - Update (`web/app/api/v1/menu-items/[itemId]/route.ts` - PUT):**
    -   **Zod Schema**: Add `spice_level: z.number().int().min(0).max(5).optional(),` to `menuItemUpdateSchema`.
    -   **Data Handling**: The existing structure `...menuItemUpdateData` should pick up `spice_level` if it's present in `validatedData.data` and pass it to the Supabase update.
6.  **Update API Route - Get/List (e.g., `web/app/api/v1/owner/categories/route.ts` - GET, which fetches items):**
    -   Ensure `spice_level` is included in the `select` query for `menu_items` if it's not already covered by `*`.
        ```sql
        menu_items (
          id,
          name_en,
          // ... other fields
          spice_level, // Add here
          position
          // ...
        )
        ```
7.  **Display on Frontend (`web/app/[locale]/dashboard/menu/menu-client-content.tsx`):**
    -   Update the `MenuItem` interface within this file if it's separately defined here.
    -   If you want to display the spice level on the menu item card, add the necessary JSX. For example:
        ```tsx
        {item.spice_level !== undefined && (
          <p className="text-sm text-orange-500">
            {t('item.spice_level_display', { level: item.spice_level })}
          </p>
        )}
        ```
    -   Add translations for `item.spice_level_display`.

This comprehensive approach ensures the new field is handled from data entry and validation through to backend storage and frontend display.
