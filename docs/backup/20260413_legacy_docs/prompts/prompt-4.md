You are an expert iOS developer working on a restaurant management app. The app now supports both **single printer mode** and **separate printers for checkout and kitchen**, and the project folder structure has been refactored for better scalability.

Now focus on improving the **Order View UI**, especially optimized for **iPad**, while maintaining a responsive fallback for **iPhone**.

---

### ✅ iPad - Order Navigation and Detail View

**Navigation Sidebar:**

* Display a list of today’s active orders (excluding completed ones by default).
* Provide a toggle or segmented control to allow users to switch between:

  * “Active Orders” (default)
  * “All Orders” (including completed ones)
* Highlight orders with a badge or icon if they have items with `new` status.

**Main Order Detail View:**

* Show items within the selected order.
* Sort items by:

  1. Time added (ascending)
  2. Status priority:

     * `new` (top)
     * `preparing`
     * `ready`
     * `served` (bottom)
* At the top, include a prominent **Checkout** button.

---

### ✅ Checkout Flow (Modal/Dialog Style)

Upon tapping **Checkout**, present a modal/dialog with:

* Input for:

  * Discount code (text)
  * Discount percentage (numeric input or slider)
* Show:

  * Subtotal
  * Tax amount
  * Total after discount and tax
* Buttons:

  * `Complete Checkout`
  * `Print Receipt`
  * `Cancel/Close`

Ensure that:

* All monetary values are properly formatted based on locale/currency.
* Print action routes to the correct printer based on current printer mode.

---

### 📱 iPhone Fallback UI

For restaurants without an iPad, ensure the same flow works on iPhone:

* Navigation is replaced with a tab-based or collapsible list view.
* Order list view should be scrollable with clear status indicators.
* The checkout modal should adapt responsively (e.g., slide-up panel or fullscreen form).
* Minimize tap complexity by keeping actions 1–2 taps away from the main screen.

---

### 📝 Notes

* Maintain consistency in UI/UX between iPhone and iPad while optimizing for larger screen usability on iPad.
* Use SF Symbols and color cues for quick visual understanding of order/item statuses.
* Reuse shared components where appropriate for consistency and maintainability.

Please build this feature incrementally, ensuring that each screen adapts well to both iPad and iPhone form factors. Let me know if you'd like a component breakdown or wireframe next.