## 2025-05-15 - State Mutation in Child Components
**Learning:** Found that `MenuStatsBar` was using `.sort()` on a prop, mutating the parent's state. This is a dangerous anti-pattern that can cause unpredictable UI behavior and inconsistent state.
**Action:** Always verify if array methods used in components are mutating (sort, reverse, splice) and copy the array first (e.g., `[...array].sort()`) if they are. Combining this with `React.memo` and `useMemo` provides safety, predictability, and performance.
