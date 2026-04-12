# Admin Employee Management & Attendance Tracking

## Summary

The Employee Management and Attendance Tracking module provides restaurant administrators (owners/managers) with a comprehensive suite of tools to manage their staff effectively. This includes creating and updating employee profiles, managing detailed weekly work schedules, tracking employee attendance via a QR code check-in/out system, verifying attendance records, and viewing basic performance metrics like total hours worked.

## How it works technically

### Frontend

The frontend is built using Next.js and React, leveraging client components for interactivity and Shadcn UI for components. State management is handled within components using React hooks, and `next-intl` is used for localization.

-   **Main Dashboard (`web/app/[locale]/(restaurant)/dashboard/employees/components/EmployeesDashboard.tsx`):**
    -   This is the central client component that renders a tabbed interface: "Employees", "Schedule", "Attendance", and "Performance".
    -   It also integrates a `QRScannerModal` for the check-in/out functionality.
-   **Employee List Tab (`web/app/[locale]/(restaurant)/dashboard/employees/components/EmployeeList.tsx`):**
    -   Fetches and displays a list of employees using a Shadcn `Table`.
    -   Allows adding new employees and editing existing ones through a modal dialog (`EmployeeForm.tsx`).
    -   Handles API calls to `POST /api/v1/owner/employees` (for creating) and `PATCH /api/v1/owner/employees/[employeeId]` (for updating name/job title).
-   **Employee Form (`web/app/[locale]/(restaurant)/dashboard/employees/components/EmployeeForm.tsx`):**
    -   A reusable form component for creating and editing employee details (name, email, job title).
    -   Uses `react-hook-form` for form management and `zod` for validation.
    -   Email field is disabled for editing as user identity changes typically require a more complex flow.
    -   Job titles are populated from `EMPLOYEE_JOB_TITLES` in `web/lib/constants.ts`.
-   **Schedule Tab (`web/app/[locale]/(restaurant)/dashboard/employees/components/ScheduleWeek.tsx`):**
    -   Allows selection of an employee.
    *   Displays a weekly schedule grid with navigation for previous/next week.
    *   Fetches schedules from `GET /api/v1/owner/employees/[employeeId]/schedules?week=YYYY-Www`.
    *   Allows input of start and end times for each day.
    *   Handles saving changes by determining records to create, update, or delete, and calls the respective batch/individual API endpoints (`POST /schedules`, `PATCH /schedules/[scheduleId]`, `DELETE /schedules/[scheduleId]`).
    *   Uses date utility functions from `web/lib/dateUtils.ts` for week calculations and formatting.
-   **Attendance Tab (`web/app/[locale]/(restaurant)/dashboard/employees/components/AttendanceTable.tsx`):**
    -   Allows selection of an employee and navigation by month.
    -   Fetches attendance records from `GET /api/v1/owner/employees/[employeeId]/attendance?month=YYYY-MM`.
    -   Displays records in a table (date, check-in, check-out, hours worked, status).
    -   Allows authorized users (owner/manager) to "Verify" records, which calls `PATCH /api/v1/owner/attendance/[recordId]/verify`.
-   **Performance Tab (`web/app/[locale]/(restaurant)/dashboard/employees/components/PerformanceOverview.tsx`):**
    -   Allows selection of an employee.
    -   Fetches attendance records for the current month.
    -   Calculates and displays "Total Hours This Week" and "Total Hours This Month".
-   **QR Scanner Modal (`web/app/[locale]/(restaurant)/dashboard/employees/components/QRScannerModal.tsx`):**
    -   Uses the `html5-qrcode` library to activate the device camera and scan QR codes.
    -   On successful scan, it triggers an API call to `POST /api/v1/attendance/scan` with the QR data (assumed to be employee ID).

### Backend (API Routes)

The backend API routes are built with Next.js and use Supabase for database interactions and user authentication.

-   **User Invitation (`POST /api/v1/auth/invite`):**
    -   Invites a new user to the platform via Supabase Auth, setting their intended role and restaurant ID in metadata.
    -   Creates a corresponding entry in the public `users` table.
-   **Employee Management:**
    -   `POST /api/v1/owner/employees`: Creates a new employee. This involves inviting a user (if they don't exist as an auth user) via the invite logic, creating a `users` table entry, and then creating an `employees` table entry linked to the user.
    -   `GET /api/v1/owner/employees`: Retrieves a list of all employees for the owner's restaurant, joining with `users` details.
    -   `PATCH /api/v1/owner/employees/[employeeId]`: Updates an employee's details (e.g., name in `users` table, job title in `employees` table).
-   **Schedule Management (scoped under `/api/v1/owner/employees/[employeeId]/schedules`):**
    -   `GET /?week=YYYY-Www`: Fetches schedules for the specified employee and week.
    -   `POST /`: Creates new schedule entries for an employee (can be batch).
    -   `PATCH /[scheduleId]`: Updates a specific schedule entry.
    -   `DELETE /[scheduleId]`: Deletes a specific schedule entry.
-   **Attendance Management:**
    -   `POST /api/v1/attendance/scan`: Handles check-in/check-out logic. Validates that the scanning user is the employee specified in the QR code (or an authorized manager). Creates or updates records in `attendance_records`.
    -   `GET /api/v1/owner/employees/[employeeId]/attendance?month=YYYY-MM`: Fetches attendance records for a specific employee and month.
    -   `PATCH /api/v1/owner/attendance/[recordId]/verify`: Allows owners/managers to mark an attendance record as 'checked'.

### Data Structures & Types (Simplified)

-   **User (`users` table):** `id` (UUID), `email`, `name`, `role` (e.g., 'owner', 'employee'), `restaurant_id`.
-   **Employee (`employees` table):** `id` (UUID, PK), `user_id` (FK to `users.id`), `restaurant_id`, `role` (job title, e.g., 'chef', 'manager').
-   **Schedule (`schedules` table):** `id` (UUID, PK), `employee_id`, `restaurant_id`, `work_date` (DATE), `start_time` (TIME), `end_time` (TIME), `created_by` (UUID of user), `updated_at`.
-   **Attendance Record (`attendance_records` table):** `id` (UUID, PK), `employee_id`, `restaurant_id`, `work_date` (DATE), `check_in_time` (TIMESTAMPTZ), `check_out_time` (TIMESTAMPTZ), `hours_worked` (NUMERIC), `status` ('recorded', 'checked'), `verified_by` (UUID of user), `verified_at` (TIMESTAMPTZ).

*(Placeholder for Screenshots of each tab and the QR modal)*

## Using the Employee & Attendance Module

Restaurant owners and managers can access this module from the main dashboard.

### 1. Employees Tab

*   **View Employees**: A list of all current employees is displayed with their name, email, and job title.
    *(Placeholder: Screenshot of Employee List View)*
*   **Add a New Employee**:
    1.  Click the "Add New Employee" button.
    2.  A modal dialog will appear. Enter the employee's full name, email address, and select their job title (e.g., Chef, Server, Manager).
    3.  Upon saving, an invitation is sent to the provided email to create an account (if one doesn't already exist tied to that email for the platform). The new employee record is linked to this user account.
    *(Placeholder: Screenshot of Employee Form Modal)*
*   **Edit an Employee**:
    1.  Click the "Edit" button next to an employee in the list.
    2.  The same form modal will appear, pre-filled with their current information.
    3.  You can update their name and job title. The email address is typically not editable through this form as it's tied to their user account.
    4.  Save changes.

### 2. Schedule Tab

This tab allows for detailed weekly schedule management for each employee.
*(Placeholder: Screenshot of Weekly Schedule Management View)*

1.  **Select Employee**: Choose an employee from the dropdown list. Their schedule for the current week will be displayed.
2.  **Navigate Weeks**: Use the "Previous Week" and "Next Week" buttons to move to different weeks. The displayed date range will update.
3.  **Assign/Edit Shifts**:
    *   The grid shows days from Monday to Sunday for the selected week.
    *   For each day, you can input a "Start Time" and "End Time" (e.g., 09:00, 17:00).
    *   To remove a shift, clear the start and end times for that day.
4.  **Save Schedule**: Once all desired shifts for the week are set, click "Save Schedule Changes". The system will create new shifts, update existing ones, or delete shifts that were cleared.

### 3. Attendance Tab

This tab provides a view of recorded attendance for employees and allows managers to verify these records.
*(Placeholder: Screenshot of Attendance Records Table View)*

1.  **Select Employee & Month**: Choose an employee from the dropdown and navigate to the desired month using the "Previous Month" and "Next Month" buttons.
2.  **View Records**: The table displays attendance records for the selected employee and month, showing:
    *   **Date**: The workday.
    *   **Check-In**: Recorded check-in time.
    *   **Check-Out**: Recorded check-out time.
    *   **Hours Worked**: Calculated duration if both check-in and check-out are present.
    *   **Status**: Either "Recorded" (pending verification) or "Verified".
3.  **Verify Attendance**:
    *   For records with "Recorded" status, an owner or manager will see a "Verify" button.
    *   Clicking "Verify" marks the record as accurate, changes its status to "Verified", and logs who verified it and when.

### 4. QR Code Check-in/Out

This is the primary method for employees to record their attendance.

1.  **Access Scanner**: A "Scan QR Code" button is available in the employee management dashboard.
2.  **Scanning**:
    *   When an employee starts or ends their shift, they (or a manager) will use this feature.
    *   The device's camera will activate. The employee presents their unique QR code (which typically represents their employee ID).
    *   *(Placeholder: Conceptual image of a QR code or the scanner modal)*
3.  **Automatic Recording**:
    *   If it's the first scan of the day for that employee, it's recorded as a **Check-in**.
    *   If the employee has already checked in but not out, the scan is recorded as a **Check-out**. The system calculates `hours_worked`.
    *   If the employee has already checked in and out for the day, the system will indicate this.
    *   All scans are logged in the Attendance tab with a "Recorded" status, awaiting manager verification.

*Note: The generation and distribution of employee-specific QR codes are typically handled during employee onboarding or via a separate profile section. For this system, the QR code is assumed to be the employee's internal ID.*

### 5. Performance Tab

This tab gives a basic overview of employee work hours.
*(Placeholder: Screenshot of Performance Overview Cards)*

1.  **Select Employee**: Choose an employee from the dropdown.
2.  **View Metrics**: The system displays:
    *   **Total Hours This Week**: Sum of `hours_worked` for the currently selected employee, for the current calendar week (Monday to Sunday).
    *   **Total Hours This Month**: Sum of `hours_worked` for the currently selected employee, for the current calendar month.

*(More advanced metrics like lateness or attendance streaks might be added in the future.)*

## User Roles & Permissions (Current Scope)

-   **Owners/Managers**:
    -   Can perform all actions: add, edit employees.
    -   Can manage schedules for all employees.
    -   Can view attendance for all employees and verify records.
    -   Can initiate QR code scans (e.g., for an employee who forgot their device, though the backend verifies the employee's identity against the logged-in user if the scan is for self).
    -   Can view performance metrics for all employees.
-   **Other Employee Roles (Chef, Server, Cashier)**:
    -   The primary interaction with this module for these roles is through the QR code check-in/out process, which they would typically perform themselves.
    -   *(Future enhancements could allow employees to view their own schedules and attendance records directly within a dedicated employee portal or app section. The current UI implementation primarily targets owner/manager use.)*

## How a developer might add a new permission or role

(This section from the original document can largely remain, but references to specific file paths for role definition should be updated if they changed, e.g., to `web/lib/constants.ts` for `EMPLOYEE_JOB_TITLES` which are used as roles in the `employees` table.)

Adding a new "Job Title" (e.g., "Shift Supervisor"):
*   **Constants (`web/lib/constants.ts`):**
    *   Add "SHIFT_SUPERVISOR": "shift_supervisor" to the `EMPLOYEE_JOB_TITLES` object.
*   **Frontend - Employee Form (`web/app/[locale]/(restaurant)/dashboard/employees/components/EmployeeForm.tsx`):**
    *   The form's job title select dropdown will automatically pick up the new role if it iterates over `Object.values(EMPLOYEE_JOB_TITLES)`.
    *   Ensure translations for the new role are added (e.g., `owner.employees.roles.shift_supervisor`).
*   **Backend - Validation (API routes):**
    *   Update Zod schemas in relevant API routes (e.g., `POST /api/v1/owner/employees`, `PATCH /api/v1/owner/employees/[employeeId]`) to include the new job title string in `z.enum(...)` derived from `EMPLOYEE_JOB_TITLES`.
*   **Database**:
    *   The `role` column in the `employees` table (likely `TEXT`) will accommodate the new string.

Adding granular permissions (e.g., "Can_Verify_Attendance") is a more significant change, as described previously, requiring database schema modifications for permissions and role-permission linking, and updated backend logic.
