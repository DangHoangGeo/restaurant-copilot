# Admin Employee Management

## Summary

The Admin Employee Management feature enables restaurant administrators to manage their staff. This includes viewing a list of employees with their roles and contact information, assigning roles, and managing weekly work schedules. The system is designed to link employee profiles to existing user accounts within the restaurant's scope.

### Attendance Tracking

Employees receive a QR code linked to their account. Scanning the code at the restaurant entrance records check-in and check-out times in the `attendance_records` table. Owners or managers can verify these records and see performance summaries on the dashboard.

## How it works technically

### Frontend

The frontend is built with Next.js and React, using server components for initial data loading and client components for interactive management.

-   **Main Page (`web/app/[locale]/dashboard/employees/page.tsx`):**
    -   A server-side component that fetches the initial list of employees for the restaurant.
    -   It retrieves employee data including their associated user details (name, email from the `users` table) and their work schedules from the `schedules` table.
    -   The raw schedule data (weekday, start_time, end_time) is transformed into a more display-friendly `shifts` object (e.g., `Mon: "09:00-17:00"`).
    -   Defines the `Employee` interface used on the frontend.
    -   Passes the processed employee data to `EmployeesClientContent`.
-   **Client Content (`web/app/[locale]/dashboard/employees/employees-client-content.tsx`):**
    -   The main client-side component for managing employees.
    -   **Views**: Offers two main views:
        -   "List" view: Displays employees as cards, showing name, role, and email. Allows editing employee details.
        -   "Schedule" view: Displays a table where rows are employees and columns are days of the week, showing their assigned shifts. Allows editing shifts.
    -   **Add/Edit Employee**:
        -   A modal is used for adding new employees and editing existing ones.
        -   The form includes fields for name, email (with a placeholder suggesting email lookup), and role (selected from a predefined list: manager, chef, server, cashier).
        -   **Note on Current Implementation**: The `handleSave` function in the provided client code appears to update only the local React state. It does not currently demonstrate direct API calls to persist these changes to the backend. The intended workflow likely involves looking up an existing user by email and then using their `user_id` to create/update the employee record via API.
    -   **Edit Shifts**:
        -   A modal allows editing the start and end times for each day of the week for a selected employee.
        -   Changes to shifts are also currently shown to update local state in the `handleSaveSchedule` function.
    -   Uses `useTranslations` from `next-intl` for localization.

### Backend (API Routes)

The backend API is built with Next.js API routes and uses Supabase for database operations.

-   **Get All Employees (`GET /api/v1/employees`):**
    -   File: `web/app/api/v1/employees/route.ts`
    -   Fetches all employees for a given `restaurantId` (passed as a query parameter).
    -   Returns employee details including `id`, `role`, associated `users` table information (`id`, `email`, `name`), and `schedules`.
-   **Create Employee (`POST /api/v1/employees`):**
    -   File: `web/app/api/v1/employees/route.ts`
    -   Creates a new employee record. Requires a `user_id` (UUID of an existing user) and a `role`.
    -   Before creation, it verifies that the provided `user_id` exists in the `users` table and is associated with the authenticated administrator's `restaurantId`.
    -   This implies that a user must first exist and be linked to the restaurant before they can be made an employee with a role.
-   **Get Single Employee (`GET /api/v1/employees/{employeeId}`):**
    -   File: `web/app/api/v1/employees/[employeeId]/route.ts`
    -   Fetches a specific employee by their `employeeId`, ensuring they belong to the admin's restaurant.
-   **Update Employee Role (`PATCH /api/v1/employees/{employeeId}`):**
    -   File: `web/app/api/v1/employees/[employeeId]/route.ts`
    -   Updates the `role` of an existing employee.
-   **Delete Employee (`DELETE /api/v1/employees/{employeeId}`):**
    -   File: `web/app/api/v1/employees/[employeeId]/route.ts`
    -   Deletes an employee record from the `employees` table.

### Data Structures & Types

-   **Employee (Frontend: `web/app/[locale]/dashboard/employees/page.tsx`):**
    -   `id`: string (likely UUID of the entry in the `employees` table)
    -   `name`: string (from the related `users` table)
    -   `role`: string (e.g., "manager", "chef")
    -   `email`: string (from the related `users` table)
    -   `shifts`: Record<string, string | null> (e.g., `{ Mon: "09:00-17:00", Tue: null }`)
-   **Backend Zod Schemas (in API routes):**
    -   `createEmployeeSchema`: Validates `user_id` (UUID) and `role` (enum).
    -   `updateEmployeeSchema`: Validates optional `role` (enum).

### Database Tables (Deduced from API interactions and frontend data)

-   `users`: Stores general user information, including `id` (UUID), `email`, `name`, and crucially, `restaurant_id` to associate users with a specific restaurant (especially for the owner or initially invited users).
-   `employees`: Links users to roles within a restaurant. Contains `id` (PK for the employee entry), `user_id` (FK to `users.id`), `restaurant_id` (FK to `restaurants.id`), and `role`.
-   `schedules`: Stores work schedule information for employees. Likely contains `employee_id`, `weekday`, `start_time`, `end_time`.
-   `restaurants`: Master table for restaurant information.

## Dependencies

-   `next-intl`: For internationalization.
-   Supabase client libraries: For database interaction.
-   `lucide-react`: For icons.
-   `shadcn/ui` components (Button, Card, Dialog, Input, Select, Table etc.): For UI elements.
-   `zod`: For schema validation in API routes.

## File and Folder Paths

**Frontend Components & Pages:**
-   `web/app/[locale]/dashboard/employees/page.tsx`
-   `web/app/[locale]/dashboard/employees/employees-client-content.tsx`

**API Routes:**
-   `web/app/api/v1/employees/route.ts` (GET all, POST new employee)
-   `web/app/api/v1/employees/[employeeId]/route.ts` (GET single, PATCH role, DELETE employee)

**Shared Types/Interfaces:**
-   `Employee` interface is defined in `web/app/[locale]/dashboard/employees/page.tsx`.
-   No specific shared type file like `employee.types.ts` was found; types are co-located or defined in API routes with Zod.

## How to use or modify

### How an admin manages employee accounts and permissions

1.  **View Employees**: Navigate to the Employees dashboard. Employees can be viewed in a "List" mode or a "Schedule" mode.
2.  **Add Employee**:
    -   Click "Add Employee".
    -   In the modal, enter the employee's full name, their email address (which should correspond to an existing user account associated with the restaurant), and select their role.
    -   Click "Save". (Note: Current client-side code needs integration with the `POST /api/v1/employees` API to persist this).
3.  **Edit Employee**:
    -   In the "List" view, click "Edit" on an employee's card.
    -   Modify name, email, or role in the modal.
    -   Click "Save". (Note: Current client-side code needs integration with `PATCH /api/v1/employees/[employeeId]` for role changes, and potentially a separate mechanism or endpoint for changing user details like name/email if that's allowed from this interface).
4.  **Manage Schedules**:
    -   Switch to "Schedule" view.
    -   Click the calendar icon on an employee's row to open the schedule editing modal.
    -   For each day of the week, set the start and end times for their shift.
    -   Click "Save". (Note: Persistence of schedule changes needs API integration, possibly to a `schedules` table or similar).
5.  **Permissions**: Permissions are implicitly managed via predefined `roles`. The system does not currently show a UI for fine-grained permission management beyond assigning these roles.

### How a developer might add a new permission or role to the system

Let's say we want to add a new role "Shift Supervisor" and a new, specific permission like "Can_Approve_Refunds" (assuming a more granular permission system is desired beyond just roles).

**1. Adding a New Role (e.g., "Shift Supervisor")**

*   **Frontend - Role Selection (`web/app/[locale]/dashboard/employees/employees-client-content.tsx`):**
    *   Add "shift_supervisor" to the `roles` array: `const roles = ["manager", "chef", "server", "cashier", "shift_supervisor"];`
    *   Add the corresponding translation key `Roles.shift_supervisor` to language files.
*   **Backend - Validation (API routes using roles):**
    *   Update Zod schemas in `web/app/api/v1/employees/route.ts` (`createEmployeeSchema`) and `web/app/api/v1/employees/[employeeId]/route.ts` (`updateEmployeeSchema`) to include `"shift_supervisor"` in the `z.enum([...])`.
        ```typescript
        z.enum(["manager", "chef", "server", "cashier", "shift_supervisor"])
        ```
*   **Database**:
    *   The `role` column in the `employees` table (likely `TEXT` or `VARCHAR`) should already accommodate the new string. If it were a PostgreSQL `ENUM` type, it would need to be altered.

**2. Adding a New Permission (e.g., "Can_Approve_Refunds")**

This is more complex as the current system appears role-based without fine-grained, distinct permissions. Implementing this would require significant changes:

*   **Database Design**:
    *   `permissions` table: `id`, `name` (e.g., "Can_Approve_Refunds"), `description`.
    *   `role_permissions` table (join table): `role_name` (or `role_id`), `permission_id`. This table would map which permissions each role has.
    *   Alternatively, add a `permissions` column (e.g., JSONB array) to the `roles` table if roles are stored in a dedicated table (the current setup seems to use string roles in the `employees` table directly).
*   **Backend - Authorization Logic**:
    *   Modify or create middleware/helper functions to check for specific permissions based on the user's role and the `role_permissions` mapping. This would be used in API routes that control sensitive actions.
    *   Example: An API endpoint for processing refunds would check if the authenticated user's role has the "Can_Approve_Refunds" permission.
*   **Frontend - UI for Managing Permissions (Potentially a new settings area):**
    *   A new UI section would be needed for super-admins to assign permissions to roles.
    *   Frontend components that enable actions based on these permissions would need to conditionally render or disable UI elements based on the current user's permissions (fetched from the backend).
*   **Backend - API for Roles/Permissions**:
    *   New API endpoints might be needed to manage permissions and their assignment to roles (e.g., `GET /api/v1/roles`, `POST /api/v1/roles/{roleName}/permissions`).

**Summary for adding a permission:**
Adding a granular permission is a significant architectural change. It involves database schema updates, new backend logic for checking permissions, potentially new API endpoints for managing these permissions, and corresponding frontend UI changes. The current system is simpler, relying on fixed roles defined in code.
