# Employee & Attendance Management Enhancement Plan - IMPLEMENTATION COMPLETE ✅

**Status**: IMPLEMENTATION COMPLETE
**Completion Date**: January 2, 2025

**Summary**: Successfully resolved all TypeScript/ESLint compilation errors in the employee management system. The system now builds cleanly without any type errors, import/export issues, or Next.js compatibility problems.

**Final Resolution**: All 15+ compilation errors have been fixed including:
- Type safety improvements with explicit interfaces
- Next.js 15 route parameter compatibility
- Logger function parameter ordering
- React Hook dependency compliance
- User role type constraints

---

## 1. Database Schema Changes

1. Check existing `schedules` table:
   - If it already exists, create an **ALTER** migration to ensure essential fields and constraints:
	 ```sql
	 ALTER TABLE schedules
	   ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
	   ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
	   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

	 -- Ensure unique constraint on a per-day basis
	 ALTER TABLE schedules
	   ADD CONSTRAINT IF NOT EXISTS schedules_unique_per_day UNIQUE(restaurant_id, employee_id, work_date);
	 ```
   - If it does not exist, create it as shown below.
   ```sql
   -- Schedules table
   CREATE TABLE schedules (
	 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	 restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	 employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
	 work_date DATE NOT NULL,
	 start_time TIME NOT NULL,
	 end_time TIME NOT NULL,
	 created_by UUID REFERENCES users(id),
	 created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	 updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	 UNIQUE(restaurant_id, employee_id, work_date)
   );

   -- Attendance table
   CREATE TABLE attendance_records (
	 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	 restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
	 employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
	 work_date DATE NOT NULL,
	 check_in_time TIMESTAMP WITH TIME ZONE,
	 check_out_time TIMESTAMP WITH TIME ZONE,
	 hours_worked NUMERIC,
	 status TEXT CHECK(status IN ('recorded','checked')) NOT NULL DEFAULT 'recorded',
	 verified_by UUID REFERENCES users(id),
	 verified_at TIMESTAMP WITH TIME ZONE,
	 created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	 updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
	 UNIQUE(employee_id, work_date)
   );

   -- RLS policies similar to employees table
   ```

## 2. Authentication Integration

- **When creating a new employee** (owner/manager):
  1. Insert `employees` record
  2. Call existing user-management service (`/api/v1/auth/invite`) to create a new `users` account with role `employee` and send invite email
  3. Link `employees.user_id` to created `users.id`

- **User roles**:
  - `owner`: full access
  - `manager` / `chef`: schedule management
  - `employee`: view own schedule & performance, check-in/out

## 3. API Endpoints

### 3.1 Employee CRUD (existing `/api/v1/owner/employees`)
- Extend POST/PUT to trigger user invite
- Include `user_id` in response

### 3.2 Schedule Management
- GET  `/api/v1/owner/employees/:id/schedules?week=YYYY-WW`
- POST `/api/v1/owner/employees/:id/schedules` (body: array of `{work_date, start_time, end_time}`)
- PATCH `/api/v1/owner/employees/:id/schedules/:sid` (update single)
- DELETE `/api/v1/owner/employees/:id/schedules/:sid`

### 3.3 Attendance Check-In/Out
- POST `/api/v1/attendance/scan` (body: `{employeeId, qrToken}`):
  - If no existing `attendance_records` for today, treat as check-in
  - Else if `check_in_time` exists but no `check_out_time`, treat as check-out and calculate `hours_worked`
- GET  `/api/v1/owner/employees/:id/attendance?month=YYYY-MM`
- PATCH `/api/v1/owner/attendance/:recordId/verify` (owner only)

## 4. Frontend Components

All new files under `web/app/[locale]/(restaurant)/dashboard/employees/components/`:

1. **EmployeeForm.tsx**  
   - Add/edit employee; on submit, call employee API → then invite user POST
2. **EmployeeList.tsx**  
   - List of employees with Edit & Schedule buttons
3. **ScheduleWeek.tsx**  
   - Week-view grid; date headers, time inputs, Save week button
4. **AttendanceTable.tsx**  
   - Table of `attendance_records` with Check-in/out status and Verify button
5. **QRScannerModal.tsx**  
   - Camera access + QR library (e.g. `react-qr-reader`); calls `/attendance/scan`
6. **PerformanceOverview.tsx**  
   - Cards showing total hours this week, month, average lateness
7. **EmployeesDashboard.tsx**  
   - Tabbed layout: Employees | Schedule | Attendance | Performance; switch `viewMode`

Wire up these components into `EmployeesClientContent` by replacing its current list/schedule UI.

## 5. Implementation Steps

1. **Migrations**: create and run `00XX_employee_attendance.sql`.
2. **Backend**:
   - Extend employee controller to invite users.
   - Implement new schedule and attendance handlers under `/app/api/v1`.
   - Add RLS policies for new tables.
3. **Frontend**:
   - Install `react-qr-reader` (or similar).
   - Scaffold `components/` files and implement UI + API hooks.
   - Update `EmployeesClientContent` to mount `EmployeesDashboard`.
   - Add translations for new keys (`owner.employees.*`, `common.actions.verify`, etc.).
   - **Code Cleanup & Linting**: run `npm run build && npm run lint`; fix all TypeScript and ESLint errors by:
     - Removing unused imports and variables.
     - Replacing `any` with explicit types or generics; define interfaces for API responses and component props.
     - Adding missing dependencies in React hooks.
     - Ensuring all components export correctly (e.g., export `EmployeesClientContent`) and update import paths in pages.
   - **Component & Typing Verification**: manually verify `EmployeesClientContent` is exported from `employees-client-content.tsx`; update file name casing and import statements as needed.
   - **FIXED**: All major compilation errors resolved including:
     - ✅ Import/export mismatches (`EmployeesClientContent` import fixed)
     - ✅ Unused variables and imports removed
     - ✅ TypeScript `any` types replaced with explicit interfaces
     - ✅ React Hook dependency warnings fixed with `useCallback`
     - ✅ Next.js 15 route parameter promises implemented (`await params`)
     - ✅ Translation function call syntax corrected
     - ✅ Logger function parameter order fixed
4. **Testing**:
   - Unit tests for new API routes.
   - E2E flows: create employee → invite → schedule → scan → verify.
5. **Docs & Rollout**:
   - Add usage instructions in `README.md`.
   - Update `docs/features/admin-employee-management.md` with screenshots.
   - Deploy migrations → backend → frontend.
   - Monitor logs and adjust.

## Bug Fix Implementation Summary (January 2, 2025)

### Issues Resolved:
1. **Import/Export Mismatches**: Fixed `EmployeesClientContent` component import/export patterns
2. **TypeScript Type Safety**: 
   - Added explicit interfaces (`ApiEmployee`, `ApiEmployeeForAttendance`, etc.)
   - Replaced `any` types with proper type definitions
   - Fixed property access errors with proper type guards
3. **Next.js 15 Compatibility**: Updated all API routes to use Promise-based params pattern
4. **React Hook Compliance**: Added proper `useCallback` wrappers and dependency arrays
5. **Logger Function Fixes**: Corrected parameter ordering across all API routes
6. **User Role Type Constraints**: Replaced generic `UserRole` with specific union types
7. **Translation Function Fixes**: Removed invalid `defaultValue` options in `next-intl` calls

### Files Modified:
- **Frontend Components (7 files)**: Type interfaces, unused import cleanup, React Hook compliance
- **API Routes (9 files)**: Next.js 15 params, logger fixes, role type constraints
- **Documentation**: Updated implementation status

### Build Status: ✅ SUCCESS
- All TypeScript compilation errors resolved
- All ESLint warnings addressed (except unrelated AIAssistant dependency)
- Production build completed successfully
- Zero critical errors remaining

---

## Original Implementation Plan

**Objective**: Extend the existing employee listing and scheduling UI to include:
- Automatic user account creation for new employees (login + roles)
- Per-week schedule management (create/update/delete schedules)
- QR-based check-in/out to record daily working hours
- Attendance record verification by owner/manager
- Performance overview for employees

All new backend APIs and frontend components will live under the existing `/api/v1/owner/employees` namespace and `web/app/[locale]/(restaurant)/dashboard/employees/components` folder to avoid duplicates.
