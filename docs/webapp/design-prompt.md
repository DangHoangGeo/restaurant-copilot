You are tasked with creating a modern, professional, and user-friendly web application design for **Shop-Copilot**, a mobile-first, AI-augmented SaaS platform targeting small restaurants. Shop-Copilot empowers restaurant owners to manage menus, tables, orders, employees, schedules, and reporting entirely from their smartphones while offering customers a seamless ordering experience on a customizable, multilingual website.

### Project Overview:

Shop-Copilot provides:

1. **Admin Dashboard (Web App)**: Fully responsive interface for restaurant owners to configure and manage every aspect of their restaurant.
2. **Customer-Facing Website**: Each restaurant has a unique subdomain (e.g., `restaurantabc.shop-copilot.com`) that customers use to browse menus and place orders via QR codes on tables.
3. **Smart, Helpful UI/UX**: Multilingual support (Japanese, English, Vietnamese), advanced menu navigation, ratings, feedback, and smart analytics to help owners make data-driven decisions.

### Design Requirements:

#### 1. General Style:

* Clean, minimalist, and modern aesthetic with intuitive navigation.
* Mobile-first design, fully responsive for smartphones and tablets.
* Brand-neutral color palette (light/dark mode), allowing each restaurant’s branding to shine.
* Ample whitespace, clear typography, and consistent iconography.
* Smart UI elements: contextual tooltips, smooth transitions, and subtle micro-interactions.

#### 2. Admin Dashboard Overview:

* **Dashboard Summary**: Quick stats (today’s sales, active tables, top-selling items, low-stock alerts).
* **Sidebar Navigation**: Collapsible menu with clear sections: Restaurant Profile, Menu Management, Order Management, Table Management, Employee & Schedule, Reports & Analytics, Settings.
* **Customization Panel**: Brand settings (logo, colors, fonts), homepage layout editor, multilingual text management.

#### 3. Restaurant Profile & Settings:

* **Subdomain Setup**: Visual steps to choose and confirm subdomain.
* **General Info**: Edit restaurant name, address, contact details, business hours.
* **Brand Customization**: Upload logo, select brand colors, choose typography, manage language defaults.
* **Payment Configuration (Future)**: Placeholder UI for enabling Stripe/PayPay integration.

#### 4. Menu Management:

* **Category & Item CRUD**: Drag-and-drop interface for categories (e.g., Starters, Main Courses, Drinks, Desserts).
* **Weekday Availability**: Toggle checkboxes or calendar view to assign items to specific weekdays or date ranges.
* **Item Details Form**: Fields for item name, description, images, price, tags (spicy, vegan, chef’s special), availability toggle.
* **Menu Preview**: Real-time preview of how the menu appears to customers on the front end in each language.
* **Customer Filters & Sorting**:

  * By Top Seller: Automated based on sales data.
  * Ratings & Feedback: Display average star rating and latest reviews.
  * Price, Category, Dietary Preferences.

#### 5. Order Management:

* **Real-Time Orders List**: Table view sorted by new orders with columns: Table Number, Items, Order Time, Status.
* **Order Detail Overlay**: Click to expand order details: item breakdown, special instructions, customer feedback/rating on repeat orders.
* **Status Flow Controls**: Buttons or swipe actions to move orders between statuses (New → Preparing → Ready → Completed).
* **Session Tracking**: View active sessions per table, with ability to end session if needed (e.g., no-show or closed table).

#### 6. Table Management:

* **Visual Floor Plan**: Editable grid or floor layout showing table positions and statuses (Available, Occupied, Reserved).
* **Quick Actions**: Tap table to view current session, assign session, or release table.
* **QR Code Generation**: Interface to generate and download/print QR codes for each table, with clear labels (Table 1, Table 2, etc.).

#### 7. Employee & Schedule Management:

* **Employee Directory**: List view of staff profiles with roles (Manager, Server, Chef) and permissions.
* **Schedule Calendar**: Weekly calendar with drag-and-drop shift assignments (time slots), viewable by day or week.
* **Notifications**: Alerts for upcoming shifts, late clock-ins, and schedule conflicts.

#### 8. Reports & Analytics:

* **Sales Dashboard**: Charts showing daily/weekly/monthly revenue, top-selling items, and sales by category.
* **Customer Insights**: List of items with highest ratings, most feedback comments, and suggestions for similar dishes.
* **Inventory Alerts**: Low-stock warnings based on sales velocity.
* **Forecast & Recommendations**: Smart suggestions for menu planning (e.g., “Consider adding more of X, trending this week”).
* **Export Options**: Export reports to CSV or PDF.

#### 9. Customer-Facing Website (Ordering Portal):

* **Multilingual Support**: Language switcher (Japanese default, English, Vietnamese), with instant translation of menu items, descriptions, and UI text.
* **Hero Section**: Restaurant banner image, business hours, top categories.
* **Intuitive Menu Browsing**: Tabs for categories, collapsible sections, and sticky filters (Top Sellers, New Items, Dietary Preferences).
* **Ratings & Feedback Inline**: Display star ratings, user comments, and “Rate this dish” button directly on each item.
* **Session Flow**:

  1. Scan QR code → Auto-detect table number → Create session.
  2. Browse menu → Add items to cart.
  3. Review cart → Checkout → Payment (cash or future card/PayPay).
  4. Session ends after checkout, link invalidated.
* **Personal Recommendations (Future)**: AI-driven suggestions (“Customers who ordered X also liked Y”).

### Deliverables Expected from AI:

1. **High-Fidelity Mockups** for:

   * Admin Dashboard: Dashboard overview, Menu Management, Order Management, Table Management, Employee Scheduling, Reports & Analytics, Settings.
   * Restaurant Profile & Customization Screens.
   * Menu Management Interfaces with weekday availability, filters, and previews.
   * Order Management Screens showing real-time updates and session tracking.
   * Table Floor Plan and QR Code Generation Screen.
   * Reports & Analytics Dashboard with charts and export options.
   * Customer-Facing Website: Homepage, Menu Browsing (multilingual), Cart & Checkout Flow.

2. **Suggested Design System Components:**

   * Color palette, typography, and iconography guidelines.
   * UI patterns: buttons, forms, modals, alerts, tooltips, cards.

3. **Interaction & UX Recommendations:**

   * Navigation patterns for mobile-first use.
   * Smooth transition ideas and micro-interactions.
   * Accessibility considerations (contrast, font sizes, ARIA labels).
   * Progressive disclosure for advanced features (e.g., AI Assistant, online payments) to avoid clutter.

### Design Inspirations (Reference Only):

* Shopify Admin Panel (clean, modular)
* Square POS (mobile-first, intuitive)
* Toast POS (kitchen and order workflows)
* Notion style customizability (user-friendly configuration)

Your design should create a standout, smart, and helpful experience that elevates Shop-Copilot above competing services by blending advanced functionality, rich analytics, and a flexible, multilingual customer interface by default.
