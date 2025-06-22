
# Restaurant Application Upgrade Plan - 2025/06/22

This document outlines the tasks required to implement bug fixes and new features for the restaurant application.

## 1. Restaurant Setting Enhancements

### 1.1. Database Modifications

**File to modify:** `infra/production/01_schemas.sql`

1.  **Remove `contact_info` field:**
    *   Locate the `restaurants` table definition.
    *   Remove the line: `contact_info text,`

2.  **Add `tax` field:**
    *   In the `restaurants` table definition, add a new field for tax:
        ```sql
        tax numeric NOT NULL DEFAULT 0.10, -- Default tax rate of 10%
        ```

**File to modify:** A new migration file should be created under `infra/migrations/` to apply this change to the production database.

*   Create a new file `infra/migrations/007_add_tax_and_remove_contact.sql`
*   Add the following SQL commands to the file:
    ```sql
    ALTER TABLE restaurants DROP COLUMN contact_info;
    ALTER TABLE restaurants ADD COLUMN tax numeric NOT NULL DEFAULT 0.10;
    ```

### 1.2. Backend API Updates

*   The AI agent needs to identify the API endpoint responsible for updating restaurant settings.
*   The agent must update the endpoint to handle the new `tax` field and remove any logic related to the old `contact_info` field.

### 1.3. Frontend UI Changes

**File to modify:** The AI agent needs to locate the restaurant settings page, likely under `web/app/[locale]/owner/settings/`.

1.  **Remove "Contact Info" field:**
    *   Remove the input field and its corresponding label for "Contact Info".

2.  **Add "Tax Rate" field:**
    *   Add a new input field for "Tax Rate".
    *   The input should be a number input, allowing decimal values.
    *   The default value should be "10".
    *   Add a label "Tax Rate (%)".

### 1.4. Translation Updates

**File to modify:** `web/messages/en/owner.json` (or a similar file for owner-related translations)

*   Add a new key-value pair for the tax field:
    ```json
    "settings": {
      "taxLabel": "Tax Rate (%)",
      "taxPlaceholder": "Enter the tax rate"
    }
    ```

## 2. Orders Page Improvements

### 2.1. Backend API Updates

*   The AI agent needs to modify the API endpoint for fetching orders to support the following:
    *   **Date Range Filtering:** Add `startDate` and `endDate` query parameters to filter orders by a specific date range.
    *   **Data for Grid View:** The API response for each order should include: `id`, `table_name`, `order_time`, `total_price`, `status`, and `guest_count`.
    *   **Data for List View:** The API should be able to return a list of all order items, each including: `table_name`, `ordered_time`, `quantity`, `size`, `toppings`, and `status`.

### 2.2. Frontend UI Changes

**File to modify:** The AI agent needs to locate the orders page, likely under `web/app/[locale]/owner/orders/`.

Learn from table or menu page to implement header with stats
Search order by entering order'id (last 6 characters)

1.  **Date Range Picker:**
    *   Implement a date range picker component that allows the owner to select a start and end date.
    *   When the date range is changed, the app should re-fetch the orders for the selected range.

2.  **Grid View (Default View):**
    *   Display orders in a grid format.
    *   Each card in the grid should show:
        *   Table Name
        *   Order Time
        *   Total Price
        *   Status (with a color indicator)
        *   Number of Guests
    *   New orders should appear at the top.
    *   Clicking on an order should show a dialog with detailed order view.

3.  **List View:**
    *   Add a toggle to switch between Grid View and List View.
    *   The List View should display a table of order items with the following columns:
        *   Table Name
        *   Ordered Time
        *   Quantity
        *   Size
        *   Toppings
        *   Status

### 2.3. Translation Updates

**File to modify:** `web/messages/en/owner.json`

*   Add new key-value pairs for the orders page:
    ```json
    "orders": {
      "dateRange": "Date Range",
      "gridView": "Grid View",
      "listView": "List View",
      "tableName": "Table",
      "orderTime": "Time",
      "totalPrice": "Total",
      "status": "Status",
      "guestCount": "Guests",
      "quantity": "Qty",
      "size": "Size",
      "toppings": "Toppings"
    }
    ```

## 3. Coupon and Promotion Feature (New)

This is a new feature and will require creating new database tables, API endpoints, and UI components.

### 3.1. Database Schema

**File to modify:** `infra/production/01_schemas.sql`

*   Add the following new tables:

    ```sql
    -- Promotions
    CREATE TABLE IF NOT EXISTS promotions (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      name_en text NOT NULL,
	  name_vi text NOT NULL,
	  name_ja text NOT NULL,
      description_en text,
	  description_vi text,
	  description_ja text,
      discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
      discount_value numeric NOT NULL,
      start_date timestamptz,
      end_date timestamptz,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Coupons
    CREATE TABLE IF NOT EXISTS coupons (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
      code text UNIQUE NOT NULL,
      max_uses integer,
      uses_count integer DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Order Promotions
    CREATE TABLE IF NOT EXISTS order_promotions (
      order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      promotion_id uuid NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
      PRIMARY KEY (order_id, promotion_id)
    );
    ```

*   A new migration file should be created under `infra/migrations/` to apply these changes.

### 3.2. Backend API Development

*   The AI agent needs to create new API endpoints for:
    *   **CRUD operations for Promotions:** Create, Read, Update, and Delete promotions.
    *   **CRUD operations for Coupons:** Create, Read, Update, and Delete coupons.
    *   **Apply Coupon to Order:** An endpoint to validate and apply a coupon to an order.

### 3.3. Frontend UI Development

*   The AI agent needs to create a new section in the owner's dashboard for managing promotions and coupons.
*   This section should have two pages:
    *   **Promotions Page:** A table to display all promotions with options to add, edit, and delete them.
    *   **Coupons Page:** A table to display all coupons with options to add, edit, and delete them.
*   The UI for creating/editing promotions and coupons should be user-friendly.

### 3.4. Translation Updates

**File to modify:** `web/messages/en/owner.json`

*   Add a new section for promotions and coupons:
    ```json
    "promotions": {
      "title": "Promotions & Coupons",
      "promotions": "Promotions",
      "coupons": "Coupons",
      "addPromotion": "Add Promotion",
      "editPromotion": "Edit Promotion",
      "addCoupon": "Add Coupon",
      "editCoupon": "Edit Coupon",
      "name": "Name",
      "description": "Description",
      "discountType": "Discount Type",
      "discountValue": "Discount Value",
      "startDate": "Start Date",
      "endDate": "End Date",
      "code": "Coupon Code",
      "maxUses": "Max Uses"
    }
    ```
