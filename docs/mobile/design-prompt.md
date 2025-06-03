You are tasked with designing a professional, user-friendly, and intuitive iOS mobile application for **Shop-Copilot**, a mobile-first, AI-augmented SaaS platform for small restaurants. The mobile app is used by restaurant staff and managers to efficiently handle orders, kitchen workflows, and checkout processes in real time, integrating seamlessly with the Shop-Copilot web platform.

### Project Overview:

The Shop-Copilot iOS app complements the web admin and customer-facing website by offering:

1. **Order Processing & Notifications**: Receive customer orders placed via the multilingual website (Japanese, English, Vietnamese), with table-specific QR sessions.
2. **Kitchen Management**: Auto-print digital tickets to ESC/POS-compatible Bluetooth printers and display grouped items on an iPad for efficient kitchen workflows.
3. **Checkout & Payments**: Process orders, handle cash and future card/PayPay transactions, and print receipts.
4. **Smart Alerts & Analytics**: Notify staff about low-stock items, top-selling dishes, and schedule updates.

### Design Requirements:

#### 1. General Style:

* Modern, clean, and functional, matching Shop-Copilot’s brand-neutral palette with restaurant-customizable theming.
* Optimized for both iPhone and iPad, with responsive layouts and large tap targets for busy environments.
* Consistent typography and iconography to align with the web app design system.
* Subtle micro-interactions and haptic feedback for confirmation of key actions (e.g., status update, print succeeded).

#### 2. Order Notifications & Management:

* **Real-Time Alerts**: Push notifications for new orders, order cancellations, and edits. Include language indicator icons to show customer’s language preference if needed.
* **Order List View**: Clear list of active orders with columns: Table Number, Items Summary, Order Time, Status Badge (New, Preparing, Ready, Completed).

  * Swipe actions to accept/reject or update status quickly.
* **Order Detail Screen**: Tap an order to view:

  * Full item breakdown (with multilingual item names if relevant for backing kitchen staff).
  * Special instructions, customer feedback/rating on prior visits, and allergens.
  * Buttons to change status (e.g., “Mark as Preparing,” “Mark as Ready”).

#### 3. Kitchen Grouping & Display:

* **Digital Kitchen Board (iPad View)**:

  * Group similar items across different orders within configurable time frames (e.g., 5–15 minutes) to reduce duplicate printing.
  * Kanban-style cards displaying:

    * Dish name
    * Total quantity
    * Associated table numbers (e.g., “Table 3 ×2, Table 5 ×1”)
    * Any special notes (allergies, customer feedback).
  * Drag-and-drop or tap to mark grouped cards as completed, updating all corresponding orders.
* **Print Control**:

  * Automatic Bluetooth printing of kitchen tickets for new orders (with an option to print grouped summary at intervals).
  * Visual indicator of printer connection status and last print time.
  * Error handling UI for failed prints with retry option.

#### 4. Checkout & Receipt Printing:

* **Checkout Flow**:

  * Order summary screen displaying items, quantities, table number, and total amount.
  * Options to select payment method:

    * Cash (mark paid, then print receipt)
    * Card / PayPay (future integration placeholder with clear UI hints)
  * Unified confirmation button (“Complete Order & Print Receipt”).
* **Receipt Printing**:

  * Automatically send receipt to Bluetooth ESC/POS printer upon payment confirmation.
  * Show print status (success or error) and option to reprint.

#### 5. Smart Alerts & Analytics:

* **Low-Stock Notifications**:

  * Real-time alerts when a menu item is running low based on web analytics data.
  * Button to navigate directly to the Admin web panel’s inventory or menu management.
* **Top-Sellers & Demand Alerts**:

  * Push notifications or in-app banners showing items trending as top sellers today.
  * Suggest printing a “chef’s recommendation” slip or adjusting kitchen prep.
* **Shift & Schedule Alerts**:

  * Notifications for upcoming shifts, table assignments, or manager messages.

#### 6. Settings & Connectivity:

* **Printer Setup Screen**:

  * List of available Bluetooth ESC/POS printers with connect/disconnect buttons.
  * Test-print functionality to verify setup.
  * Visual status icons (Connected, Searching, Disconnected).
* **Profile & Restaurant Switcher**:

  * For managers who may oversee multiple locations: quick switcher to change subdomain context.
* **Language & Theme**:

  * In-app language toggle (if needed) to match web interface locale preferences.
  * Dark/light mode toggle inheriting restaurant customizations.

### Deliverables Expected from AI:

1. **High-Fidelity Mockups** for:

   * Order Notification Screen (push and in-app alerts).
   * Active Orders List and Order Detail Screens.
   * Kitchen Grouping Board (iPad view) with interactive grouping controls.
   * Printer Setup & Connection Screens.
   * Checkout & Payment Processing Screen, including receipt print feedback.
   * Smart Alerts & Analytics Dashboard snippet (e.g., low-stock, trending items).
   * Settings Screen (profiles, language, theme).

2. **Suggested Design System Components:**

   * Color palette aligned with web app, plus iOS-safe accents.
   * Typography guidelines for readability in fast-paced settings.
   * Iconography and button styles for consistent tap targets.
   * Notification and alert styles (push banners, in-app banners).

3. **Interaction & UX Recommendations:**

   * Ideal swipe gestures for status updates and grouping actions.
   * Visual cues and haptic feedback for printing and payment confirmations.
   * Accessibility considerations: large fonts, high contrast, VoiceOver labels.
   * Offline handling: queue orders and handle print retries if connection drops.

### Design Inspirations (Reference Only):

* **Toast Go** (fast handheld operations)
* **Square for Restaurants** (clean UI, quick actions)
* **Square Register** (Bluetooth printing workflow)
* **Notion Mobile** (clear, modular settings)

Your design should enhance Shop-Copilot’s promise of a **smart, helpful, and efficient** workflow for restaurant staff—reducing manual steps, minimizing clutter, and providing real-time insights to streamline daily operations.
