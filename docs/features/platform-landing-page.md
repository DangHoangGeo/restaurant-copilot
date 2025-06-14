# Platform Landing Page

## Summary

The Platform Landing Page (`web/app/[locale]/page.tsx`) serves as the main public entry point and marketing front for the "coorder.ai" service. Its primary goal is to inform potential restaurant owners about the platform's capabilities and encourage them to sign up. It also handles routing for users who might land here with a restaurant-specific context (via a query parameter).

## How it works technically

### Frontend

The page is a client-side rendered React component, structured with several informational and marketing sections.

-   **Main Component (`web/app/[locale]/page.tsx`):**
    -   Composed of multiple sub-components, each representing a standard landing page section (Header, Hero, Social Proof, Features, How It Works, Benefits, FAQ, Call To Action, Footer). These sub-components are defined within the same file.
    -   **Restaurant Context Detection**:
        -   On load, it checks for a `restaurant` query parameter in the URL (e.g., `?restaurant=myrestaurant`). This parameter is interpreted as a `subdomain`.
        -   If this `subdomain` parameter is found, the page executes a client-side redirect to `/[locale]/customer`. This suggests that `/[locale]/customer` is the intended entry route for users accessing a specific restaurant's customer interface, and this landing page acts as a fallback or initial discovery point.
        -   If no `subdomain` is found, it renders the main marketing content for coorder.ai.
    -   **Theme**: Implements its own theme provider (`ThemeProviderLanding`) for light/dark mode switching, potentially with a distinct brand color (`--brand-color-landing`) from the restaurant-specific customer interface.
    -   **Localization**: Uses `next-intl` for internationalization of its content. A `LanguageSwitcherLanding` component allows users to change locales.
    -   **Calls to Action (CTAs)**:
        -   "Sign Up" buttons link to `/[locale]/signup`.
        -   "Login" button links to `/[locale]/login`.
        -   "View Demo" and other informational links likely point to sections within the page (`#features`, `#demo`) or dedicated informational pages (not detailed in this file).
-   **UI Components**:
    -   The page defines its own simple `Icon`, `Button`, and `Card` components, or uses common UI primitives. It does not appear to use specialized components from `web/components/features/customer/` or `web/components/features/admin/`.

### Backend Interactions

-   The landing page itself does not seem to make any direct backend API calls for its primary content display.
-   The redirect logic (`router.replace(/{locale}/customer)`) is client-side. The target page (`/[locale]/customer`) would then be responsible for fetching restaurant-specific data based on the subdomain (likely now part of the URL path or host).
-   The signup and login buttons navigate to their respective pages, which then handle backend interactions as documented in "Customer Authentication Flows."

### Data Structures & Types

-   The page primarily deals with static marketing content defined within its translation files (via `useTranslations`).
-   It does not fetch or display dynamic restaurant-specific data like menus or tables.

## Purpose and Role in User Flow

-   **Informational Hub**: Educates potential clients (restaurant owners) about the coorder.ai platform, its features, and benefits.
-   **Lead Generation**: Drives signups and demo requests.
-   **Initial Routing**: Acts as a catch-all or initial entry point. If a user tries to access the root domain with a restaurant identifier in the query string, it redirects them to the appropriate customer-facing restaurant experience.

## Dependencies

-   `next-intl`: For internationalization.
-   `next/navigation` (useRouter, useSearchParams, useLocale): For routing and locale handling.
-   `lucide-react`: For icons.
-   Potentially common UI components or utility functions if any were imported from outside the file (though most UI seems self-contained or very basic).

## File and Folder Paths

-   **Main Page Component**: `web/app/[locale]/page.tsx`

## How to use or modify

### How a user interacts with the landing page

1.  **Visit Root Domain**: A user typically visits `https://coorder.ai/` (or the development equivalent).
2.  **View Information**: They browse through the different sections (Hero, Features, FAQ, etc.) to learn about the platform.
3.  **Language Selection**: They can change the language using the language switcher.
4.  **Theme Toggle**: They can switch between light and dark mode.
5.  **Take Action**:
    -   Click "Sign Up" to navigate to the registration page.
    -   Click "Login" to navigate to the login page.
    -   Click "View Demo" or other informational links.
6.  **Restaurant Redirect**: If they arrive with a URL like `https://coorder.ai/?restaurant=myresto`, they are automatically redirected to `/[locale]/customer` (which would then presumably handle the `myresto` context).

### How a developer might modify a section (e.g., add a new feature to the FeaturesSection)

1.  **Edit `web/app/[locale]/page.tsx`**:
    -   Locate the `FeaturesSection` functional component within the file.
    -   Modify the `features` array to add a new object for the new feature, including its icon, title key, description key, and benefit key.
        ```javascript
        const features = [
          // ... existing features ...
          { icon: NewFeatureIcon, title: "features.new_feature.title", description: "features.new_feature.description", benefit: "features.new_feature.benefit" },
        ];
        ```
2.  **Update Translation Files**:
    -   Add the new translation keys (e.g., `LandingPage.features.new_feature.title`, `LandingPage.features.new_feature.description`, `LandingPage.features.new_feature.benefit`) to all relevant language JSON files (e.g., `messages/en.json`, `messages/ja.json`, etc.).
3.  **Import Icon**: If a new icon is used, ensure it's imported from `lucide-react` or added as an SVG.
4.  **Styling**: Adjust any styling within the `FeaturesSection` component if needed to accommodate the new item.

This process is typical for modifying static content sections on the landing page. Dynamic data or complex interactions would require more significant changes.
