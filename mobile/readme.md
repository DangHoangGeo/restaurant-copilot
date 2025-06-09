You are an expert iOS developer tasked to build a streamlined, practical iOS app for managing orders in restaurants, integrated with Supabase for realtime updates and printer functionality. Follow these precise steps sequentially, ensuring each phase is fully functional before proceeding:

## 1. Authentication

* Implement a login screen that captures:

  * Subdomain
  * Email
  * Password
* Authenticate using Supabase Auth SDK.
* Ensure the user session persists after login.
* Validate authentication thoroughly.

## 2. Fetch and Display Active Orders

* After successful login, use the stored session to:

  * Fetch active orders associated with the authenticated user's restaurant (identified by subdomain).
  * Display a clear, simple list of active orders and their details (items, quantity, status).

## 3. Implement Realtime Updates

* Use Supabase Realtime feature to:

  * Listen for new or updated orders.
  * Automatically update the orders list without manual refresh.
  * Ensure smooth and reliable updates.

## 4. Printer Integration

* Integrate basic print functionality to handle printing order details.
* Implement support for standard receipt printers (initially assume a common protocol such as Bluetooth or network printers).
* Confirm printer connection and print a simple test receipt.

## 5. Basic Printer Settings

* Provide a basic settings screen to manage printer connection:

  * Test printer connection
  * Select or switch printers if multiple options are available
* Ensure user can clearly see printer status (connected/disconnected).

## Notes:

* Initially, prioritize clear functionality over advanced UI design. The interface should be clean, simple, and straightforward.
* Thoroughly test each step, ensuring there are no type errors or compilation issues.
* Proceed incrementally, checking functionality and stability before advancing to the next step.
* You can check current database schema, tables, policies, functions under this folder: infra/migrations