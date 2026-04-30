## 2026-04-30 - Optimized Cart Quantity Lookup and Context Stability

**Learning:** In highly interactive components like a food menu, frequent cart updates can trigger cascading re-renders across the entire item list if the CartContext value is not memoized or if quantity lookups are O(N). Using a `Map` to pre-calculate quantities reduces lookup time from O(N) to O(1) per item card. Additionally, stabilizing context functions with `useCallback` is essential to prevent child components (even those wrapped in `React.memo`) from re-rendering due to reference changes.

**Action:** Always memoize context providers' `value` objects and stabilize their functions. For list-heavy interactions, prefer O(1) lookups for state-derived data.
