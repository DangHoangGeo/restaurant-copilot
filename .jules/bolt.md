## 2026-04-23 - [Memoization Anti-pattern in Context]
**Learning:** Functions in `CartContext` were memoized with `useCallback`, but the provider value was an object literal. This caused all consumers to re-render on every provider parent update, negating the `useCallback` wins.
**Action:** Always wrap Context Provider value objects in `useMemo`.

## 2026-04-23 - [Unstable Callbacks for Memoized Components]
**Learning:** `React.memo` on `CompactFoodCard` was initially ineffective because parent components passed anonymous arrow functions (`() => onAddToCart(item)`).
**Action:** Modify callback signatures to accept the item as an argument (`(item) => void`) and pass stable references from `useCallback`.
