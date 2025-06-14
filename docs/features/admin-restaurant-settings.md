# Admin Restaurant Settings

## Summary

The Admin Restaurant Settings feature allows administrators to configure various aspects of their restaurant. This includes essential details like the restaurant's name, default language, and branding (logo, brand color), as well as operational information such as contact details, address, opening hours, and a descriptive text.

## How it works technically

### Frontend

The frontend for settings management is primarily driven by a server component that fetches initial data and a client component that renders the form and handles updates.

-   **Settings Page (`web/app/[locale]/dashboard/settings/page.tsx`):**
    -   A server-side React component responsible for fetching the current restaurant settings. It uses the authenticated user's `restaurantId` to retrieve all fields from the `restaurants` table.
    -   Defines a `Restaurant` type that encompasses all the fields available for settings.
    -   Passes the fetched `initialSettings` to the `SettingsForm` client component.
    -   Handles localization using `next-intl`.
-   **Settings Form (`web/app/[locale]/dashboard/settings/settings-form.tsx`):**
    -   A client-side React component that provides the user interface for modifying restaurant settings.
    -   Uses `react-hook-form` for form management and `zodResolver` for validation against a detailed Zod schema (`getSettingsSchema`).
    -   The schema validates fields such as:
        -   `name`: Restaurant name (required, max 100 chars).
        -   `defaultLanguage`: Enum ("en", "ja", "vi").
        -   `brandColor`: Hex color string (e.g., "#3B82F6").
        -   `contactInfo`: Text, max 500 chars.
        -   `address`: Text, max 500 chars.
        -   `opening_hours`: Text, max 200 chars.
        -   `description`: Text, max 1000 chars.
        -   `logoFile`: Instance of `File` for new logo uploads (max 1MB, specific image types).
        -   `logoUrl`: URL string for existing or newly uploaded logo.
    -   **Logo Handling**:
        -   Displays a preview of the current or newly selected logo.
        -   Uses `browser-image-compression` to compress logo images client-side before upload.
        -   Uploads the logo to Supabase Storage (path: `restaurants/{restaurant_id}/logos/logo.png`) if a new file is provided, overwriting the existing one (upsert).
    -   **Submission**:
        -   On form submission, after handling logo upload, it sends a `PATCH` request to the `/api/v1/restaurant/settings` endpoint.
        -   The request body includes the settings data to be updated. The restaurant's subdomain (from `initialSettings`) is passed as a query parameter, though the backend primarily relies on the authenticated user's session for identifying the restaurant.
    -   Provides user feedback using `toast` notifications from `sonner`.
    -   Dynamically updates the CSS variable `--brand-color` if the brand color is changed, reflecting it live in the UI.

### Backend (API Routes and Server Libraries)

The backend handles fetching and persisting restaurant settings, relying on Supabase for database interactions.

-   **Restaurant Settings API (`web/app/api/v1/restaurant/settings/route.ts`):**
    -   `GET`: Fetches a defined subset of restaurant settings (name, logo, subdomain, brand color, default language, contact info, description, opening hours, phone) for the currently authenticated user's `restaurantId`.
    -   `PATCH`: Updates restaurant settings. It uses the authenticated user's `restaurantId` to identify the record to update.
        -   Validates the incoming request body against a comprehensive Zod schema (`settingsSchema`) which includes fields like `name`, `default_language`, `brand_color`, `contact_info`, `address`, `phone`, `email`, `website`, `description`, `opening_hours`, `social_links`, `timezone`, `currency`, `payment_methods`, `delivery_options`, and `logo_url`.
-   **Server Library (`web/lib/server/restaurant-settings.ts`):**
    -   Provides helper functions:
        -   `getRestaurantSettingsFromSubdomain(subdomain)`: Fetches specific restaurant details (id, name, logo, subdomain, brand color, default language) based on a subdomain.
        -   `getRestaurantIdFromSubdomain(subdomain)`: Fetches only the restaurant ID based on a subdomain.
    -   These functions are likely used in contexts like middleware or initial request processing to identify the restaurant context from a subdomain.
-   **Restaurant Data API (`web/app/api/v1/restaurant/data/route.ts`):**
    -   `GET`: Fetches all data for a restaurant (all columns from the `restaurants` table) along with its full menu, based on a `subdomain`. This endpoint is likely for public-facing restaurant pages rather than admin settings.

### Data Structures & Types

-   **Restaurant (Frontend Type in `page.tsx`):**
    -   `id`: string (UUID)
    -   `name`: string | null
    -   `default_language`: "en" | "ja" | "vi" | null
    -   `brand_color`: string | null (Hex color)
    -   `contact_info`: string | null
    -   `address`: string | null
    -   `opening_hours`: string | null
    -   `description`: string | null
    -   `logo_url`: string | null
    -   Other fields like `subdomain`, `created_at`, `updated_at`, `user_id` might also be part of this type, mirroring the database table.
-   **RestaurantSettings (Shared Type in `web/shared/types/customer.ts`):**
    -   `name`: string
    -   `logoUrl`: string | null
    -   `primaryColor?`: string (likely maps to `brand_color`)
    -   `secondaryColor?`: string (not explicitly managed in the current settings form/API)
-   **Zod Schemas (in `settings-form.tsx` and API route):** Define the structure and validation rules for the settings data being submitted.

### Database Tables (Deduced)

-   `restaurants`: The primary table storing all restaurant-specific settings and information. Columns likely include `id` (PK), `user_id` (FK to `users`, owner), `subdomain`, `name`, `default_language`, `brand_color`, `contact_info`, `address`, `opening_hours`, `description`, `logo_url`, `phone`, `email`, `website`, `social_links`, `timezone`, `currency`, `payment_methods` (possibly JSONB), `delivery_options` (possibly JSONB), etc.
-   Supabase Storage: Used for storing uploaded logo images (bucket typically named `restaurant-uploads`).

## Dependencies

-   `next-intl`: For internationalization.
-   `react-hook-form` & `@hookform/resolvers/zod`: For form handling and validation.
-   `zod`: For schema definition and validation.
-   Supabase client libraries: For database and storage interactions.
-   `browser-image-compression`: For client-side image compression.
-   `lucide-react`: For icons.
-   `shadcn/ui` components: For UI elements (Input, Textarea, Button, Select, Avatar, Label).
-   `sonner`: For toast notifications.

## File and Folder Paths

**Frontend Components & Pages:**
-   `web/app/[locale]/dashboard/settings/page.tsx`
-   `web/app/[locale]/dashboard/settings/settings-form.tsx`

**API Routes:**
-   `web/app/api/v1/restaurant/settings/route.ts` (GET and PATCH settings)
-   `web/app/api/v1/restaurant/data/route.ts` (GET public restaurant data by subdomain)

**Server-side Libraries:**
-   `web/lib/server/restaurant-settings.ts`

**Shared Types:**
-   `Restaurant` type defined in `web/app/[locale]/dashboard/settings/page.tsx`.
-   `RestaurantSettings` interface in `web/shared/types/customer.ts`.

## How to use or modify

### How an admin configures their restaurant

1.  **Navigate to Settings**: Access the "Settings" section from the admin dashboard.
2.  **View Current Settings**: The form will be pre-filled with the restaurant's current settings.
3.  **Modify Fields**:
    -   **Restaurant Name**: Update the text input.
    -   **Default Language**: Select from "English", "Japanese", or "Vietnamese".
    -   **Brand Color**: Enter a hex color code or use the color picker. The UI's brand color may update live.
    -   **Logo**: Upload a new logo image (PNG, JPG, WEBP, max 1MB). The image will be compressed. A preview is shown.
    -   **Contact Info, Address, Opening Hours, Description**: Update the respective text areas.
4.  **Save Changes**: Click the "Save Changes" button.
5.  **Feedback**: Toast notifications will indicate success or failure of the save operation.

### How a developer might add a new setting (e.g., "enable takeaway option")

Let's assume we want to add a boolean setting `allow_takeaway`.

1.  **Update Database Schema**:
    -   Add an `allow_takeaway` column (e.g., `BOOLEAN`, default `false`) to the `restaurants` table in Supabase.
2.  **Update Restaurant Type (`web/app/[locale]/dashboard/settings/page.tsx`):**
    -   Add `allow_takeaway?: boolean | null;` to the `Restaurant` type.
3.  **Update Zod Schema (API: `web/app/api/v1/restaurant/settings/route.ts`):**
    -   Add `allow_takeaway: z.boolean().optional(),` to the `settingsSchema`.
4.  **Update Zod Schema (Frontend: `web/app/[locale]/dashboard/settings/settings-form.tsx`):**
    -   Add `allow_takeaway: z.boolean().optional(),` to the `getSettingsSchema` function's returned object.
5.  **Update Frontend Form (`web/app/[locale]/dashboard/settings/settings-form.tsx`):**
    -   **Default Value**: Add `allow_takeaway: initialSettings.allow_takeaway || false,` to `defaultValues` in `useForm`.
    -   **Form UI**: Add a new `FormField` for `allow_takeaway`, likely using a `Checkbox` or a `Switch` component from `shadcn/ui`.
        ```tsx
        // Example using a Checkbox
        <div>
          <div className="flex items-center space-x-2">
            <Controller
              name="allow_takeaway"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="allow_takeaway"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="allow_takeaway">{t("labels.allowTakeaway")}</Label>
          </div>
          {errors.allow_takeaway && <p className="text-sm text-red-500 mt-1">{errors.allow_takeaway.message}</p>}
        </div>
        ```
    -   **Localization**: Add translation for `labels.allowTakeaway` in relevant JSON language files.
6.  **Update API - GET (`web/app/api/v1/restaurant/settings/route.ts`):**
    -   Ensure `allow_takeaway` is included in the `select` statement if not using `*`. Add it to the returned JSON object.
        ```javascript
        // In select:
        // ...
        // allow_takeaway
        // ...
        // In returned JSON:
        // allowTakeaway: restaurant.allow_takeaway,
        ```
7.  **Update API - PATCH (`web/app/api/v1/restaurant/settings/route.ts`):**
    -   The `validation.data` in the PATCH request should automatically include `allow_takeaway` if it's part of the schema and present in the request body. The `supabaseAdmin.from("restaurants").update(validation.data)` will handle its update.
8.  **Update `getRestaurantSettingsFromSubdomain` (optional):**
    -   If this setting needs to be available via `web/lib/server/restaurant-settings.ts`, add `allow_takeaway` to the `select` query and the returned object there as well.

This ensures the new "allow_takeaway" setting is configurable by the admin, persisted in the database, and retrievable for other parts of the application to use (e.g., to show or hide takeaway options on a customer-facing menu).
