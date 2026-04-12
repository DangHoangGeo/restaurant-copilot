# Admin Bookings Management

## Summary

The Admin Bookings Management feature allows restaurant administrators to view and manage customer table bookings. Key functionalities include listing all bookings, viewing details of a specific booking, and updating a booking's status (e.g., confirming or canceling it). The feature is currently conditional on a `FEATURE_FLAGS.tableBooking` flag.

## How it works technically

### Frontend

The frontend is built using Next.js and React. It consists of a server component for initial data fetching and a client component for displaying and interacting with the booking data.

-   **Main Page (`web/app/[locale]/dashboard/bookings/page.tsx`):**
    -   A server-side component responsible for fetching initial booking data for the restaurant associated with the logged-in administrator.
    -   Defines the `Booking` and `PreOrderItem` interfaces.
    -   Passes the initial list of bookings to the `BookingsClientContent` component.
    -   Handles localization using `next-intl`.
-   **Client Content (`web/app/[locale]/dashboard/bookings/bookings-client-content.tsx`):**
    -   The main client-side component for rendering the bookings management interface.
    -   Displays bookings in a table format, showing customer name, contact, date/time, party size, and status.
    -   Allows viewing detailed information for each booking in a modal.
    -   Provides functionality to update a booking's status (e.g., "pending" to "confirmed" or "canceled") by making API calls.
    -   Uses `toast` notifications from `sonner` to provide feedback on operations.
    -   The entire feature's visibility is controlled by `FEATURE_FLAGS.tableBooking`. If this flag is false, a "Coming Soon" message is displayed.

### Backend (API Routes)

The backend API is built using Next.js API routes and interacts with a Supabase database.

-   **Get Bookings (`GET /api/v1/bookings`):**
    -   File: `web/app/api/v1/bookings/route.ts`
    -   Fetches all bookings associated with the administrator's `restaurantId`.
    -   Orders bookings by date and time.
-   **Update Booking Status (`PATCH /api/v1/bookings/{bookingId}`):**
    -   File: `web/app/api/v1/bookings/[bookingId]/route.ts`
    -   Updates the `status` of a specific booking.
    -   Expects a body with `{ status: "confirmed" | "canceled" }`.
    -   Ensures the booking belongs to the administrator's restaurant before updating.
-   **Create Booking (`POST /api/v1/bookings/create`):**
    -   File: `web/app/api/v1/bookings/create/route.ts`
    -   Allows creation of a new booking. This endpoint includes rate limiting and detailed validation for fields like `tableId`, `customerName`, `customerContact`, `bookingDate`, `bookingTime`, `partySize`, and optional `preorderItems`.
    -   **Note:** The current admin interface (`bookings-client-content.tsx`) does not seem to provide functionality to *create* new bookings, only to manage existing ones. This API endpoint might be used by a separate customer-facing booking interface.

### Data Structures & Types

-   **Booking (`web/app/[locale]/dashboard/bookings/page.tsx`):**
    -   `id`: string (UUID)
    -   `customerName`: string
    -   `contact`: string (contact information)
    -   `date`: string (formatted date)
    -   `time`: string (formatted time)
    -   `partySize`: number
    -   `status`: string (e.g., "pending", "confirmed", "canceled")
    -   `preOrderItems`: Array of `PreOrderItem`
-   **PreOrderItem (`web/app/[locale]/dashboard/bookings/page.tsx`):**
    -   `itemId`: string (UUID of a menu item)
    -   `quantity`: number
-   **TableInfo (`web/shared/types/customer.ts`):** While not directly used in the `Booking` interface shown in `page.tsx`, the `bookings` table in the database likely references a `table_id`. The `TableInfo` type includes `id`, `name`, `capacity`, etc.

### Database Tables (Deduced from API interactions and types)

-   `bookings`: Stores booking information (id, restaurant_id, table_id, customer_name, customer_contact, booking_date, booking_time, party_size, status, preorder_items (JSONB)).
-   `tables`: Stores restaurant table information. Referenced by `bookings` via `table_id`.
-   `menu_items`: Stores menu item details. Referenced by `preorder_items` within a booking.
-   `restaurants`: Referenced to associate bookings with a specific restaurant.

## Dependencies

-   `next-intl`: For internationalization.
-   `@supabase/auth-helpers-nextjs` & other Supabase clients: For Supabase database interactions.
-   `lucide-react`: For icons.
-   `shadcn/ui` components (Button, Card, Dialog, Table etc.): For UI elements.
-   `sonner`: For toast notifications.
-   `zod`: For schema validation in API routes (especially `create/route.ts`).

## File and Folder Paths

**Frontend Components & Pages:**
-   `web/app/[locale]/dashboard/bookings/page.tsx`
-   `web/app/[locale]/dashboard/bookings/bookings-client-content.tsx`

**API Routes:**
-   `web/app/api/v1/bookings/route.ts` (GET all bookings)
-   `web/app/api/v1/bookings/[bookingId]/route.ts` (PATCH booking status)
-   `web/app/api/v1/bookings/create/route.ts` (POST new booking - likely for customer interface)

**Shared Types/Interfaces:**
-   Booking-related types (`Booking`, `PreOrderItem`) are defined within `web/app/[locale]/dashboard/bookings/page.tsx`.
-   `web/shared/types/customer.ts` contains `TableInfo` which is conceptually related.

## How to use or modify

### How an admin manages bookings through the interface

1.  **View Bookings**: Navigate to the Bookings section in the admin dashboard. A list of all bookings is displayed in a table.
2.  **Check Feature Flag**: The feature is only available if `FEATURE_FLAGS.tableBooking` is true.
3.  **View Booking Details**: Click the "View Details" button (eye icon) for a booking. A modal opens showing customer name, contact, date/time, party size, status, and any pre-ordered items.
4.  **Confirm Booking**: If a booking's status is "pending", in the details modal, click "Confirm Booking". The status updates, and a success notification appears.
5.  **Cancel Booking**: If a booking's status is "pending", in the details modal, click "Cancel Booking". The status updates, and a success notification appears.
6.  **No Creation UI**: Currently, the admin interface does not provide a form or button to create new bookings manually.

### How a developer might add a new field to the booking (e.g., "booking notes" for admin)

Let's say an admin wants to add internal notes to a booking (e.g., "VIP guest", "Requested window seat if possible").

1.  **Update Database Schema**:
    -   Add an `admin_notes` column (e.g., `TEXT`) to the `bookings` table in Supabase. Allow it to be `NULL`.
2.  **Update Admin Booking Type (`web/app/[locale]/dashboard/bookings/page.tsx`):**
    -   Add `admin_notes?: string | null;` to the `Booking` interface.
3.  **Modify API - Update (`web/app/api/v1/bookings/[bookingId]/route.ts`):**
    -   The existing `PATCH` endpoint is primarily for status. To add notes, you could:
        -   Extend this endpoint: Modify the Zod schema to optionally accept `admin_notes: z.string().optional()` and include it in the `.update()` call if provided. This is suitable if notes are often updated with status.
        -   Create a new endpoint (e.g., `PATCH /api/v1/bookings/{bookingId}/notes`) specifically for updating notes. This is cleaner if note updates are independent of status changes.
    -   Example (extending existing PATCH):
        ```typescript
        // In web/app/api/v1/bookings/[bookingId]/route.ts
        const updateSchema = z.object({
          status: z.enum(['confirmed', 'canceled']).optional(),
          admin_notes: z.string().optional().nullable(), // Add admin_notes
        });

        // ... in PATCH function, after validation success:
        const updatePayload: { status?: string; admin_notes?: string | null } = {};
        if (validation.data.status) {
          updatePayload.status = validation.data.status;
        }
        if (validation.data.admin_notes !== undefined) { // Check if it was provided
          updatePayload.admin_notes = validation.data.admin_notes;
        }

        if (Object.keys(updatePayload).length === 0) {
          return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
        }

        const { data, error } = await supabase
          .from('bookings')
          .update(updatePayload) // Use the dynamic payload
          .eq('id', bookingId)
          .select()
          .single();
        ```
4.  **Modify API - Get (`web/app/api/v1/bookings/route.ts`):**
    -   Ensure `admin_notes` is included in the `select('*')` query (it should be by default with `*`). If you were selecting columns explicitly, you'd add it there.
5.  **Update Frontend UI (`web/app/[locale]/dashboard/bookings/bookings-client-content.tsx`):**
    -   **Display Notes**: In the booking details modal, display the `admin_notes`.
        ```tsx
        <p><strong>{t('admin_notes_label')}:</strong> {selectedBooking.admin_notes || t('no_notes_added')}</p>
        ```
    -   **Edit Notes**: Add a small form (e.g., a `Textarea` and a "Save Notes" button) within the details modal to allow admins to add/edit these notes.
    -   **API Call for Notes**: The "Save Notes" button would trigger a `fetch` call to the modified `PATCH /api/v1/bookings/{bookingId}` endpoint (or a new dedicated one), sending `{ admin_notes: "new notes here" }` in the body.
    -   **State Update**: On successful save, update the `selectedBooking` state to reflect the new notes, and potentially refresh the main `bookings` list or update the specific item in it.
    -   **Localization**: Add translation keys for `admin_notes_label`, `no_notes_added`, etc.

This approach ensures the new "admin_notes" field is manageable through the admin interface and stored correctly. If the `POST /api/v1/bookings/create` endpoint were to be used by admins, `admin_notes` could also be added there.
