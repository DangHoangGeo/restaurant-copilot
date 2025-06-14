# Admin Table Management

## Summary

The Admin Table Management feature enables restaurant administrators to define, view, and manage their restaurant's tables. This includes creating individual tables, bulk-adding tables, editing table details (name, capacity, status, etc.), and generating QR codes for tables that link to the digital menu.

## How it works technically

### Frontend

The frontend is built using Next.js and React, with a server component for initial data loading and a client component for interactive table management and QR code generation.

-   **Tables Page (`web/app/[locale]/dashboard/tables/page.tsx`):**
    -   A server-side React component that fetches initial data:
        -   All tables associated with the administrator's `restaurantId` from the `tables` table.
        -   Basic restaurant settings (name, logo URL) for context (e.g., for QR code URL generation).
    -   Defines a `Table` type used throughout the feature on the frontend.
    -   Passes the initial table data and restaurant settings to the `TablesClientContent` component.
-   **Tables Client Content (`web/app/[locale]/dashboard/tables/tables-client-content.tsx`):**
    -   The main client-side component for managing tables.
    -   **Display**: Renders tables as individual cards, showing name, capacity, status (e.g., "available", "occupied", "reserved" with color-coded badges), outdoor/accessible flags, and notes.
    -   **Add/Edit Table**:
        -   Uses `react-hook-form` and `zodResolver` with a Zod schema (`getTableSchema`) for validating table data (name, capacity, status, isOutdoor, isAccessible, notes, qrCode URL).
        -   A modal is used for both creating new tables and editing existing ones.
        -   API calls (`POST /api/v1/tables` for create, `PATCH /api/v1/tables/{tableId}` for update) are made to persist changes.
    -   **Bulk Add Tables**:
        -   Provides a modal and form (validated by `getBulkAddTableSchema`) for adding multiple tables at once (specifying count, name prefix, start index, and common properties like capacity and status).
        -   The actual bulk creation logic (`handleBulkAddSubmit`) involves iterating and calling the single table creation API endpoint (`POST /api/v1/tables`) for each table. (Note: This function was noted as commented out in the source, suggesting it might be pending full implementation or review).
    -   **QR Code Generation**:
        -   For each table, an admin can generate/view a QR code.
        -   The QR code URL is constructed dynamically: `https://{restaurant_name_slug}.{NEXT_PUBLIC_ROOT_DOMAIN}/{locale}/menu?code={table.qr_code_value}`.
        -   When an admin clicks to generate/download the QR code:
            1.  The constructed URL is first saved to the `qr_code` field of the specific table via a `PATCH` request to `/api/v1/tables/{tableId}`.
            2.  The QR code is displayed in a modal using the `<QRCodeDisplay />` component.
            3.  The `html-to-image` library is used to convert the displayed QR code (a `div` element) into a PNG image, which is then triggered for download by the admin.
    -   Uses `toast` notifications from `sonner` for user feedback.

### Backend (API Routes)

The backend API is built with Next.js API routes and uses Supabase for database operations. Authentication (`getUserFromRequest`) is used to ensure operations are tied to the admin's `restaurantId`.

-   **Get All Tables (`GET /api/v1/tables`):**
    -   File: `web/app/api/v1/tables/route.ts`
    -   Fetches all tables for a given `restaurantId` (passed as a query parameter).
    -   Returns fields including `id, name, position_x, position_y, status, capacity, is_outdoor, is_accessible, notes, qr_code`.
-   **Create Table (`POST /api/v1/tables`):**
    -   File: `web/app/api/v1/tables/route.ts`
    -   Creates a new table record associated with the admin's `restaurantId`.
    -   Validates input against `tableSchema` (name, capacity, status, isOutdoor, isAccessible, notes, qrCode).
-   **Update Table (`PATCH /api/v1/tables/{tableId}`):**
    -   File: `web/app/api/v1/tables/[tableId]/route.ts`
    -   Updates specified fields of an existing table.
    -   Validates input against `tableSchema` (all fields optional for update).
    -   Ensures the table belongs to the admin's `restaurantId`.
-   **Delete Table (`DELETE /api/v1/tables/{tableId}`):**
    -   File: `web/app/api/v1/tables/[tableId]/route.ts`
    -   Deletes a table by its `tableId`.
    -   Ensures the table belongs to the admin's `restaurantId`.

### Data Structures & Types

-   **Table (Frontend Type in `page.tsx`):**
    -   `id`: string (UUID)
    -   `name`: string
    -   `capacity`: number
    -   `restaurant_id`: string (UUID)
    -   `status`: 'available' | 'occupied' | 'reserved'
    -   `position_x?`: number | null
    -   `position_y?`: number | null
    -   `is_outdoor`: boolean
    -   `is_accessible`: boolean
    -   `notes?`: string | null
    -   `qr_code?`: string | null (Stores the unique value/identifier for the QR code, not the full URL)
    -   `created_at`: string
    -   `updated_at`: string
-   **TableInfo (Shared Type in `web/shared/types/customer.ts`):**
    -   Provides a consistent structure for table properties, largely matching the frontend `Table` type and database schema.
-   **Zod Schemas (in `tables-client-content.tsx` and API routes):** Define validation rules for table creation and updates.

### Database Tables (Deduced)

-   `tables`: Stores information about each table in a restaurant. Columns likely include `id` (PK), `restaurant_id` (FK), `name`, `capacity`, `status`, `position_x`, `position_y`, `is_outdoor`, `is_accessible`, `notes`, and `qr_code`.
-   `restaurants`: Referenced to associate tables with a specific restaurant.

## Dependencies

-   `next-intl`: For internationalization.
-   `react-hook-form` & `@hookform/resolvers/zod`: For form handling.
-   `zod`: For schema validation.
-   Supabase client libraries: For database interactions.
-   `lucide-react`: For icons.
-   `shadcn/ui` components (Button, Card, Dialog, Input, Select, Checkbox, Textarea, Badge): For UI elements.
-   `sonner`: For toast notifications.
-   `html-to-image`: For converting HTML (QR code display) to a downloadable PNG image.
-   `QRCodeDisplay` (custom component, likely uses a library like `qrcode.react`): For rendering QR codes.

## File and Folder Paths

**Frontend Components & Pages:**
-   `web/app/[locale]/dashboard/tables/page.tsx`
-   `web/app/[locale]/dashboard/tables/tables-client-content.tsx`
-   `web/components/ui/qr-code-display.tsx` (assumed path for the QR code rendering component)

**API Routes:**
-   `web/app/api/v1/tables/route.ts` (GET all, POST new table)
-   `web/app/api/v1/tables/[tableId]/route.ts` (PATCH update, DELETE table)

**Shared Types:**
-   `Table` type defined in `web/app/[locale]/dashboard/tables/page.tsx`.
-   `TableInfo` interface in `web/shared/types/customer.ts`.

## How to use or modify

### How an admin manages tables and their QR codes

1.  **View Tables**: Navigate to the Tables dashboard. Existing tables are displayed as cards with their details.
2.  **Add Single Table**:
    -   Click "Add Table".
    -   Fill in the table's name, capacity, status, and optionally check if it's outdoor or accessible, and add notes.
    -   Click "Save". The new table appears in the list.
3.  **Bulk Add Tables**:
    -   Click "Bulk Add Tables".
    -   Specify a name prefix (e.g., "Table "), how many tables to create, a starting index number, and common properties like capacity and status.
    -   Click "Save". Multiple tables are created based on the inputs. (Note: UI for this exists, but the submit handler function was commented out in the source).
4.  **Edit Table**:
    -   Click "Edit" on an existing table's card.
    -   Modify any of its properties in the modal.
    -   Click "Save".
5.  **Generate/Download QR Code**:
    -   Click "Generate QR" on a table's card.
    -   A modal appears displaying the QR code.
    -   The system automatically constructs a URL (e.g., `https://your-restaurant.soder.ai/en/menu?code=UNIQUE_TABLE_CODE`) and saves this unique code to the table's `qr_code` field in the database via an API call.
    -   Click "Download PNG" to save the QR code image. This can be printed and placed on the physical table.

### How a developer might add a new property to a table (e.g., "table section")

Suppose we want to add a "section" property (e.g., "Patio", "Main Dining", "Bar") to tables.

1.  **Update Database Schema**:
    -   Add a `section` column (e.g., `TEXT` or an `ENUM` if predefined sections) to the `tables` table in Supabase.
2.  **Update Table Type (`web/app/[locale]/dashboard/tables/page.tsx`):**
    -   Add `section?: string | null;` to the `Table` type.
3.  **Update Shared Type (`web/shared/types/customer.ts`):**
    -   Add `section?: string | null;` to the `TableInfo` interface.
4.  **Update Zod Schema (Frontend: `web/app/[locale]/dashboard/tables/tables-client-content.tsx`):**
    -   Add `section: z.string().max(50, t('section_max_length', { maxLength: 50 })).optional().nullable(),` to `getTableSchema`.
    -   Add translations for `section_max_length`.
5.  **Update Zod Schema (Backend API: `web/app/api/v1/tables/route.ts` and `web/app/api/v1/tables/[tableId]/route.ts`):**
    -   Add `section: z.string().max(50).optional().nullable(),` to the `tableSchema` in both route files (for POST and PATCH).
6.  **Update Frontend Form (`web/app/[locale]/dashboard/tables/tables-client-content.tsx`):**
    -   **Default Value**: Add `section: table?.section ?? null,` in `handleOpenTableModal` when resetting the form for editing, and `section: null,` for new tables.
    -   **Form UI**: Add a new `FormField` for `section`. This could be an `Input` or a `Select` if sections are predefined.
        ```tsx
        <FormField
          control={controlSingle}
          name="section"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('AdminTables.section_label')}</FormLabel>
              <FormControl>
                <Input placeholder={t('AdminTables.section_placeholder')} {...field} value={field.value ?? ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        ```
    -   **Localization**: Add translations for `AdminTables.section_label` and `AdminTables.section_placeholder`.
7.  **Update API - Create (`web/app/api/v1/tables/route.ts` - POST):**
    -   Destructure `section` from `validated.data`.
    -   Add `if (section !== undefined) insertData.section = section;` before inserting.
8.  **Update API - Update (`web/app/api/v1/tables/[tableId]/route.ts` - PATCH):**
    -   Destructure `section` from `validated.data`.
    -   Add `if (section !== undefined) updateData.section = section;` to the `updateData` object.
9.  **Update API - Get (`web/app/api/v1/tables/route.ts` - GET):**
    -   Ensure `section` is included in the `select` statement (e.g., `select('..., section')`).
10. **Display Section (Frontend: `web/app/[locale]/dashboard/tables/tables-client-content.tsx`):**
    -   In the table card display, add `<p>Section: {table.section}</p>` if `table.section` exists.

This ensures the new "section" property is editable, stored, and displayed correctly.
