# 📌 System Requirements for Shop-Copilot

**Shop-Copilot** is a mobile-first, AI-augmented SaaS platform helping small restaurants digitize and automate their operations from smartphones. It includes a responsive admin dashboard, customizable customer website, and a native iOS app for managing orders and kitchen flow. The system emphasizes ease-of-use, smart assistance, and a beautiful, helpful UI/UX experience.

---

## ✅ Functional Requirements

### 🌐 Multi-Tenant Architecture & Subdomains

* Each restaurant is hosted on a unique subdomain (e.g., `restaurantabc.shop-copilot.com`).
* Full data separation across tenants (menus, orders, users).

### 👤 Admin / Owner Features

* Register and configure restaurant details.
* Customize branding (logo, color, font).
* Setup & manage:

  * Menus (with availability per weekday)
  * Tables (with table QR codes)
  * Employees and working schedules
  * Payment methods (cash, card, PayPay – future)
* Customize public website and menu layout.
* Access detailed reports and smart analytics.

### 🧾 Menu Management

* CRUD operations for categories and menu items.
* Assign menu items to specific weekdays.
* Show/hide based on availability.
* Display food images, descriptions, tags (spicy, vegan, etc).
* Customer-friendly filters & sorting:

  * By top sellers
  * By price or popularity
  * Show user ratings and feedback directly on menu

### 📦 Order & Table Management

* Customers scan table-specific QR code to order.
* Session begins after scan and expires after checkout.
* Track active sessions per table.
* Orders grouped by table and status (New → Preparing → Ready → Completed).

### 📱 iOS App for Staff

* Real-time order notifications
* Auto-print to ESC/POS-compatible Bluetooth kitchen printers
* Checkout and receipt printing
* Group similar items across orders for kitchen efficiency
* Kitchen display mode (digital Kanban-style board)

### 🧾 Reports & Analytics

* Sales breakdown by day, item, and category
* Customer trends, peak times, and bestsellers
* Feedback insights and satisfaction scores
* Smart suggestions for menu planning based on performance

### 🌍 Customer Website (Ordering Portal)

* Fully mobile-optimized, fast loading
* Multi-language support:

  * Japanese (default)
  * English
  * Vietnamese
* Easy menu navigation:

  * Tabs, filters, sections
  * Quick reorder for returning customers (future)
* Inline food ratings, feedback, and recommendations

---

## 🚀 Future Features (Planned for Advanced Versions)

* 💳 Integrated online payments via Stripe/PayPay
* 🤖 AI Assistant (Generative AI) to assist customers:

  * Recommend dishes based on preference, history, time of day
  * Answer common questions about ingredients, allergens
  * Suggest best combos or popular items

---

## 🧠 Key Differentiators

* Fully mobile-first UX from day one (owners manage via phone)
* Smart analytics with actionable insights
* Multilingual customer experience
* Visual & real-time kitchen coordination
* Personalized menu logic with weekday-based availability
* Generative AI chatbot to support customers like a virtual waiter

---

## 🛠️ Tech Stack

| Component              | Technology                                     |
| ---------------------- | ---------------------------------------------- |
| Frontend Web App       | Next.js (App Router), Tailwind CSS, TypeScript |
| Mobile App             | Native iOS (Swift), Supabase SDK               |
| Backend Infrastructure | Supabase (auth, database, storage, real-time)  |
| Printing Solution      | Bluetooth + ESC/POS Printer integration        |
| Deployment             | Vercel                                         |

---

## 🗂️ Development Milestones

1. **Infrastructure Setup** (Next.js + Supabase)
2. **Admin Dashboard** (menus, tables, staff, reports)
3. **QR Code Ordering System**
4. **Multilingual Frontend for Customers**
5. **Smart Reports & Feedback Integration**
6. **iOS App for Order Processing & Printing**
7. **AI Assistant + Payment Gateway (future)**

---

**Shop-Copilot** aims to empower small restaurants with intelligent tools, elevating both customer experience and operational efficiency through a clean, beautiful interface and smart features.
