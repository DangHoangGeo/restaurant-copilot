---
applyTo: 'web/**'
---
Coding standards, domain knowledge, and preferences that AI should follow.

## Web Application (Next.js, React, TypeScript) Development Rules

When generating code for the web application, adhere to the following standards to ensure code quality, consistency, and maintainability.

### 1. Architecture and Code Organization
- **Component-Based Architecture**: All UI should be built as reusable React components.
- **File Structure**:
  - Place new components in `web/components/`. Group related files (e.g., `MyComponent.tsx`, `MyComponent.module.css`, `MyComponent.test.tsx`) in a single folder named after the component (e.g., `web/components/MyComponent/`).
  - Place reusable hooks in `web/hooks/`.
  - Place utility functions in `web/lib/utils/`.
  - Place page components in `web/app/`.
- **State Management**:
  - For local component state, use `useState` and `useReducer`.
  - For global state, use React Context API, which is set up in `web/contexts/`. Do not introduce new state management libraries without explicit instruction.

### 2. Coding Style and Conventions
- **TypeScript**:
  - Use TypeScript for all new code.
  - Provide explicit types for all function parameters, return values, and state variables.
  - Avoid using the `any` type. Use `unknown` for values that are truly unknown, and perform type checking.
- **React**:
  - Use functional components with hooks. Avoid class components.
  - Use the `useCallback` and `useMemo` hooks to optimize performance where necessary, especially for functions and values passed to memoized child components.
- **ESLint/Prettier**: Code must be free of ESLint errors and warnings. It should be formatted with Prettier before committing.

### 3. UI/UX and Styling
- **Styling**: Use Tailwind CSS for styling. Define styles in `.module.css` files to scope them to components.
- **Responsiveness**: All UI components must be responsive and work on all screen sizes, from mobile to desktop.
- **Accessibility (a11y)**: Follow accessibility best practices. Use semantic HTML, provide `alt` tags for images, and ensure keyboard navigability.

### 4. Internationalization (i18n)
- All user-facing strings must be internationalized.
- Add new translation keys to the JSON files in `web/messages/en/`. Do not hardcode text in components.

### 5. Testing
- Write unit tests for all new components and utility functions.
- Place test files alongside the source files (e.g., `MyComponent.test.tsx` next to `MyComponent.tsx`).
- Use Jest and React Testing Library for tests.

### 6. API Interaction
- Use the custom hooks in `web/hooks/` for data fetching.
- Define clear TypeScript types for all API request and response payloads in `web/types/`.

### 7. Security
- Sanitize all user input to prevent XSS attacks.
- Do not expose sensitive information, such as API keys, on the client-side. Use environment variables via Next.js runtime configuration.

### 8. Production Readiness
- Ensure all new code is production-ready, following the above standards.
- Perform thorough testing and code review before deployment.