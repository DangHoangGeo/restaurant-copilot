# Translation Namespace Migration Tasks

## Overview
This document provides detailed tasks for 5 developers to migrate the codebase from monolithic translation files to the new namespace structure. Each developer must not only update `useTranslations` calls but also verify and add missing translation keys to the appropriate namespace JSON files.

**Migration Goals:**
1. Update all `useTranslations()` calls to use new namespaces
2. Verify all translation keys exist in target namespace files
3. Add missing translation keys with proper values
4. Test functionality after migration
5. Ensure no translation errors in console

---

## Developer 1: Authentication & Profile Areas

### 🎯 **Scope**
- `web/app/[locale]/(auth)/*`
- `web/components/features/profile/*`
- `web/components/auth/*`
- `web/components/features/admin/dashboard/DescriptionGenerator.tsx`

### 📋 **Tasks**

#### **Task 1.1: Update DescriptionGenerator Component**
**File:** `web/components/features/admin/dashboard/DescriptionGenerator.tsx`

**Current Issue:**
```tsx
const t = useTranslations("Dashboard.Settings");
```

**Required Changes:**
```tsx
// Update translation hook
const t = useTranslations("owner.settings");
```

**Translation Keys to Verify in `owner/settings.json`:**
- ✅ `aiDescription.title`
- ✅ `aiDescription.subtitle` 
- ✅ `aiDescription.cuisine`
- ✅ `aiDescription.atmosphere`
- ✅ `aiDescription.specialties`
- ✅ `aiDescription.location`
- ✅ `aiDescription.additionalInfo`
- ✅ `aiDescription.cuisinePlaceholder`
- ✅ `aiDescription.atmospherePlaceholder`
- ✅ `aiDescription.specialtiesPlaceholder`
- ✅ `aiDescription.locationPlaceholder`
- ✅ `aiDescription.additionalInfoPlaceholder`
- ✅ `aiDescription.generating`
- ✅ `aiDescription.generate`
- ✅ `aiDescription.disclaimer`
- ✅ `aiDescription.success`
- ✅ `aiDescription.errors.missingName`
- ✅ `aiDescription.errors.generationFailed`

**Status:** ✅ All keys already exist in `owner/settings.json`

#### **Task 1.2: Update Profile Components**

##### **File 1.2a:** `web/components/features/profile/ProfileForm.tsx`
**Current Issue:**
```tsx
const t = useTranslations("Dashboard.Profile");
const tCommon = useTranslations("common");
```

**Required Changes:**
```tsx
const t = useTranslations("owner.profile");
const tCommon = useTranslations("common");
```

**Translation Keys to Verify in `owner/profile.json`:**
- Check if form field labels exist
- Check validation messages
- Check success/error messages

##### **File 1.2b:** `web/components/features/profile/PasswordChangeForm.tsx`
**Current Issue:**
```tsx
const t = useTranslations("Dashboard.Profile");
```

**Required Changes:**
```tsx
const t = useTranslations("owner.profile");
```

**Translation Keys to Verify in `owner/profile.json`:**
- ✅ `security.title`
- ✅ `security.description`
- ✅ `security.currentPassword`
- ✅ `security.newPassword`
- ✅ `security.confirmPassword`
- ✅ `security.changePassword`
- ✅ `security.changingPassword`
- ✅ `security.passwordChangeSuccess`

##### **File 1.2c:** `web/components/features/profile/TwoFactorAuthForm.tsx`
**Current Issue:**
```tsx
const t = useTranslations("Dashboard.Profile");
```

**Required Changes:**
```tsx
const t = useTranslations("owner.profile");
```

**Translation Keys to Verify in `owner/profile.json`:**
- ✅ `twoFactor.title`
- ✅ `twoFactor.description`
- ✅ `twoFactor.enabled`
- ✅ `twoFactor.disabled`
- ✅ `twoFactor.enable`
- ✅ `twoFactor.disable`
- ✅ All other 2FA related keys

#### **Task 1.3: Verify Authentication Components**

**Files to Check:**
- `web/app/[locale]/(auth)/login/page.tsx`
- `web/app/[locale]/(auth)/signup/page.tsx`
- `web/app/[locale]/(auth)/forgot-password/page.tsx`

**Expected Pattern:**
```tsx
const t = useTranslations("auth"); // ✅ Already correct
```

**Translation Keys to Verify in `auth.json`:**
- ✅ All auth keys are properly migrated

### 🧪 **Testing Checklist**
- [ ] DescriptionGenerator component loads without errors
- [ ] All AI description generation UI text displays correctly
- [ ] Profile forms show proper labels and messages
- [ ] Password change functionality works
- [ ] 2FA setup displays correctly
- [ ] No console errors about missing translations
- [ ] Language switching works for all components

### ⏱️ **Estimated Time:** 2-3 hours

---

## Developer 2: Customer-Facing Areas

### 🎯 **Scope**
- `web/app/[locale]/(restaurant)/(customer)/*`
- `web/components/features/customer/*`

### 📋 **Tasks**

#### **Task 2.1: Update Customer Page Components**

##### **File 2.1a:** `web/components/features/customer/FloatingCart.tsx`
**Current Issue:**
```tsx
const t = useTranslations("Customer");
```

**Required Changes:**
```tsx
const t = useTranslations("customer.cart");
```

**Translation Keys to Add to `customer/cart.json`:**
```json
{
  "floating_cart": {
    "title": "Your Cart",
    "items_count": "{count} items",
    "total": "Total: {amount}",
    "view_cart": "View Cart",
    "checkout": "Checkout",
    "empty_message": "Your cart is empty",
    "add_items": "Add some delicious items!"
  }
}
```

##### **File 2.1b:** `web/components/features/customer/screens/ReviewScreen.tsx`
**Current Issue:**
```tsx
const t = useTranslations("Customer");
```

**Required Changes:**
```tsx
const t = useTranslations("customer.orderHistory");
```

**Translation Keys to Add to `customer/orderHistory.json`:**
```json
{
  "review_screen": {
    "title": "Rate Your Experience",
    "rating_prompt": "How would you rate this item?",
    "comment_placeholder": "Tell us about your experience...",
    "submit_review": "Submit Review",
    "skip_item": "Skip This Item",
    "thank_you": "Thank you for your feedback!",
    "error_submitting": "Failed to submit review. Please try again."
  }
}
```

##### **File 2.1c:** `web/components/features/customer/QRCodeDialog.tsx`
**Current Issue:**
```tsx
const t = useTranslations('customer');
```

**Required Changes:**
```tsx
const t = useTranslations('customer.home');
```

**Translation Keys to Add to `customer/home.json`:**
```json
{
  "qr_dialog": {
    "title": "Share Session",
    "description": "Scan this QR code to join the dining session",
    "session_code": "Session Code: {code}",
    "print_qr": "Print QR Code",
    "close": "Close"
  }
}
```

##### **File 2.1d:** `web/components/features/customer/FoodCard.tsx`
**Current Issue:**
```tsx
const t = useTranslations("Customer");
```

**Required Changes:**
```tsx
const t = useTranslations("customer.menu");
```

**Translation Keys to Add to `customer/menu.json`:**
```json
{
  "food_card": {
    "add_to_cart": "Add to Cart",
    "out_of_stock": "Out of Stock",
    "price_from": "From {price}",
    "popular": "Popular",
    "spicy": "Spicy",
    "vegetarian": "Vegetarian",
    "view_details": "View Details"
  }
}
```

##### **File 2.1e:** `web/components/features/customer/screens/RestaurantHomepage.tsx`
**Current Issue:**
```tsx
const tCustomer = useTranslations('CustomerHome');
const tCommon = useTranslations('common');
```

**Required Changes:**
```tsx
const t = useTranslations('customer.home');
const tCommon = useTranslations('common');
```

**Translation Keys to Verify in `customer/home.json`:**
- ✅ Most keys already exist
- Check for any missing homepage-specific keys

##### **File 2.1f:** `web/components/features/customer/layout/CustomerFooter.tsx`
**Current Issue:**
```tsx
const t = useTranslations("common");
```

**Required Changes:**
```tsx
const t = useTranslations("common");
```

#### **Task 2.2: Update Customer Page Files**

##### **File 2.2a:** `web/app/[locale]/(restaurant)/(customer)/booking/booking-client-content.tsx`
**Current Issue:**
```tsx
const t = useTranslations("Customer");
```

**Required Changes:**
```tsx
const t = useTranslations("customer.booking");
```

**Translation Keys to Verify in `customer/booking.json`:**
- ✅ Most booking keys already exist
- Check for any missing booking form keys

#### **Task 2.3: Add Missing Translation Keys**

**Files to Update:**
1. `customer/cart.json` - Add floating cart translations
2. `customer/orderHistory.json` - Add review screen translations  
3. `customer/home.json` - Add QR dialog translations
4. `customer/menu.json` - Add food card translations

### 🧪 **Testing Checklist**
- [ ] FloatingCart displays correct text and counts
- [ ] Review screen shows proper rating interface
- [ ] QR code dialog has correct labels
- [ ] Food cards show proper button text and labels
- [ ] Restaurant homepage displays correctly
- [ ] Booking page shows proper form labels
- [ ] No console errors about missing translations
- [ ] Language switching works for all customer components

### ⏱️ **Estimated Time:** 3-4 hours

---

## Developer 3: Owner/Admin Dashboard Areas

### 🎯 **Scope**
- `web/app/[locale]/(restaurant)/dashboard/*`
- `web/components/customer/layout/admin-*`
- `web/components/features/admin/*`

### 📋 **Tasks**

#### **Task 3.1: Update Dashboard Page Components**

##### **File 3.1a:** `web/app/[locale]/(restaurant)/dashboard/orders/orders-client-content.tsx`
**Current Issue:**
```tsx
const t = useTranslations("AdminOrders");
const tCommon = useTranslations("common");
```

**Required Changes:**
```tsx
const t = useTranslations("owner.orders");
const tCommon = useTranslations("common");
```

**Translation Keys to Verify in `owner/orders.json`:**
- ✅ Most order management keys exist
- Check for any missing real-time update messages

##### **File 3.1b:** `web/app/[locale]/(restaurant)/dashboard/menu/menu-client-content.tsx`
**Current Issue:**
```tsx
// Look for AdminMenu references
```

**Required Changes:**
```tsx
const t = useTranslations("owner.menu");
```

**Translation Keys to Add to `owner/menu.json`:**
```json
{
  "drag_drop": {
    "reorder_categories": "Reorder Categories",
    "reorder_items": "Reorder Menu Items",
    "drag_to_reorder": "Drag to reorder",
    "reorder_success": "Order updated successfully",
    "reorder_error": "Failed to update order"
  },
  "translation": {
    "translating": "Translating...",
    "translate_success": "Translation completed",
    "translate_error": "Translation failed"
  }
}
```

##### **File 3.1c:** `web/app/[locale]/(restaurant)/dashboard/tables/tables-client-content.tsx`
**Current Issue:**
```tsx
// Look for AdminTables references
```

**Required Changes:**
```tsx
const t = useTranslations("owner.tables");
```

**Translation Keys to Verify in `owner/tables.json`:**
- ✅ Most table management keys exist
- Check for QR code generation messages

#### **Task 3.2: Update Admin Layout Components**

##### **File 3.2a:** `web/components/customer/layout/admin-sidebar.tsx`
**Current Issue:**
```tsx
const t = useTranslations("AdminNav");
```

**Required Changes:**
```tsx
const t = useTranslations("owner.dashboard");
```

**Translation Keys to Add to `owner/dashboard.json`:**
```json
{
  "navigation": {
    "dashboard": "Dashboard",
    "menu": "Menu Management",
    "orders": "Orders",
    "tables": "Table Management",
    "employees": "Staff",
    "bookings": "Reservations",
    "reports": "Analytics",
    "settings": "Settings",
    "profile": "Profile"
  }
}
```

##### **File 3.2b:** `web/components/customer/layout/admin-header.tsx`
**Current Issue:**
```tsx
const t = useTranslations('AdminLayout');
const tNav = useTranslations('AdminNav');
const tCommon = useTranslations('Common');
```

**Required Changes:**
```tsx
const t = useTranslations('owner.dashboard');
const tCommon = useTranslations('common');
```

**Translation Keys to Add to `owner/dashboard.json`:**
```json
{
  "header": {
    "welcome": "Welcome back",
    "user_menu": "User Menu",
    "notifications": "Notifications",
    "logout": "Logout",
    "profile": "Profile",
    "settings": "Settings"
  }
}
```

#### **Task 3.3: Update Admin Feature Components**

##### **File 3.3a:** `web/components/features/admin/menu/tabs/BasicInfoTab.tsx`
**Translation Keys to Add to `owner/menu.json`:**
```json
{
  "basic_info": {
    "translating": "Translating...",
    "translateButton": "Translate",
    "translate_success": "Translation completed",
    "translate_error": "Translation failed",
    "generate_ai": "Generate with AI",
    "generating_ai": "Generating...",
    "ai_success": "AI generation completed",
    "ai_error": "AI generation failed"
  }
}
```

##### **File 3.3b:** `web/components/features/admin/menu/tabs/VariantsOptionsTab.tsx`
**Translation Keys to Add to `owner/menu.json`:**
```json
{
  "toppings": {
    "translate_success": "Topping translated successfully",
    "translate_error": "Failed to translate topping",
    "add_topping": "Add Topping",
    "remove_topping": "Remove Topping",
    "topping_name": "Topping Name",
    "topping_price": "Price"
  }
}
```

##### **File 3.3c:** `web/components/features/admin/menu/WeekdaySelector.tsx`
**Current Issue:**
```tsx
// Check if it uses Common for weekdays
```

**Required Changes:**
```tsx
const t = useTranslations("common");
```

**Translation Keys to Verify in `common.json`:**
- ✅ Weekdays already exist in common

#### **Task 3.4: Add Missing Translation Keys**

**Files to Update:**
1. `owner/dashboard.json` - Add navigation and header keys
2. `owner/menu.json` - Add translation, AI generation, and topping keys
3. `owner/orders.json` - Add any missing real-time keys
4. `owner/tables.json` - Add any missing QR/printing keys

### 🧪 **Testing Checklist**
- [ ] Admin sidebar navigation displays correctly
- [ ] Admin header shows proper user menu
- [ ] Menu management page loads without errors
- [ ] Order management real-time updates work
- [ ] Table management QR generation works
- [ ] Translation features in menu work
- [ ] AI generation features work
- [ ] No console errors about missing translations
- [ ] Language switching works for all admin components

### ⏱️ **Estimated Time:** 4-5 hours

---

## Developer 4: Service/Platform & Common Areas

### 🎯 **Scope**
- `web/app/[locale]/page.tsx`
- `web/app/[locale]/(coorder)/*`
- `web/app/layout.tsx`
- `web/components/home/*`
- `web/components/common/*`

### 📋 **Tasks**

#### **Task 4.1: Update Landing Page Components**

##### **File 4.1a:** `web/components/home/HowItWorksSection.tsx`
**Current Issue:**
```tsx
const t = useTranslations('landing');
```

**Required Changes:**
```tsx
const t = useTranslations('landing');
```

##### **File 4.1b:** `web/components/home/LandingPageHeader.tsx`
**Current Issue:**
```tsx
const t = useTranslations('landing');
```

**Required Changes:**
```tsx
const t = useTranslations('landing');
```

##### **File 4.1c:** `web/components/home/FeaturesSection.tsx`
**Current Issue:**
```tsx
const t = useTranslations('landing');
```

**Required Changes:**
```tsx
const t = useTranslations('landing');
```

**Translation Keys to Verify in `landing.json`:**
- ✅ Most landing page keys exist
- Check for any component-specific missing keys

#### **Task 4.2: Update Legal Page Components**

##### **File 4.2a:** `web/app/[locale]/(coorder)/privacy/page.tsx`
**Current Issue:**
```tsx
const t = await getTranslations({ locale, namespace: 'legal.privacy.metadata' });
```

**Required Changes:**
```tsx
const t = await getTranslations({ locale, namespace: 'legal' });
// Then access: t('privacy.metadata.title')
```

##### **File 4.2b:** `web/app/[locale]/(coorder)/terms/page.tsx`
**Current Issue:**
```tsx
const t = await getTranslations({ locale, namespace: 'legal.terms.metadata' });
```

**Required Changes:**
```tsx
const t = await getTranslations({ locale, namespace: 'legal' });
// Then access: t('terms.metadata.title')
```

##### **File 4.2c:** `web/app/[locale]/(coorder)/privacy/privacy-content.tsx`
**Current Issue:**
```tsx
const t = useTranslations('legal.privacy');
```

**Required Changes:**
```tsx
const t = useTranslations('legal');
// Then access: t('privacy.title')
```

##### **File 4.2d:** `web/app/[locale]/(coorder)/terms/terms-content.tsx`
**Current Issue:**
```tsx
const t = useTranslations('legal.terms');
```

**Required Changes:**
```tsx
const t = useTranslations('legal');
// Then access: t('terms.title')
```

#### **Task 4.3: Update Common Components**

##### **File 4.3a:** `web/components/common/language-switcher.tsx`
**Current Issue:**
```tsx
const t = useTranslations('Common');
```

**Required Changes:**
```tsx
const t = useTranslations('common');
```

##### **File 4.3b:** `web/components/common/coming-soon.tsx`
**Current Issue:**
```tsx
const t = useTranslations('Common');
```

**Required Changes:**
```tsx
const t = useTranslations('common');
```

**Translation Keys to Add to `common.json`:**
```json
{
  "coming_soon": {
    "title": "Coming Soon",
    "description": "{feature} is coming soon!",
    "generic_description": "This feature is under development."
  },
  "language_switcher": {
    "toggle_label": "Change Language"
  }
}
```

#### **Task 4.4: Create ServiceAdmin Pages**

**Create basic pages for future platform features:**

##### **File 4.4a:** `web/app/[locale]/(serviceAdmin)/dashboard/page.tsx`
```tsx
import { useTranslations } from 'next-intl';

export default function ServiceAdminDashboard() {
  const t = useTranslations('serviceAdmin.home');
  
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

#### **Task 4.5: Add Missing Translation Keys**

**Files to Update:**
1. `common.json` - Add coming soon and language switcher keys
2. `landing.json` - Verify all component keys exist
3. `legal.json` - Ensure proper structure for terms/privacy
4. `serviceAdmin/home.json` - Add basic platform admin keys

### 🧪 **Testing Checklist**
- [ ] Landing page loads without translation errors
- [ ] All landing page sections display correctly
- [ ] Legal pages (terms/privacy) show proper content
- [ ] Language switcher works correctly
- [ ] Coming soon component displays properly
- [ ] Service admin pages load (if created)
- [ ] No console errors about missing translations
- [ ] Language switching works for all components

### ⏱️ **Estimated Time:** 3-4 hours

---

## Developer 5: Cross-cutting Validation & Testing

### 🎯 **Scope**
- Validation across all areas
- Testing and quality assurance
- Documentation and automation

### 📋 **Tasks**

#### **Task 5.1: Create Translation Validation Script**

**File:** `scripts/validate-translations.ts`

```typescript
import { NAMESPACES } from '../i18n/request';
import fs from 'fs';
import path from 'path';

interface ValidationResult {
  namespace: string;
  missingKeys: string[];
  unusedKeys: string[];
  errors: string[];
}

async function validateTranslations(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];
  
  for (const namespace of NAMESPACES) {
    const filePath = path.join(__dirname, `../messages/en/${namespace}.json`);
    
    try {
      if (!fs.existsSync(filePath)) {
        results.push({
          namespace,
          missingKeys: [],
          unusedKeys: [],
          errors: [`File does not exist: ${filePath}`]
        });
        continue;
      }
      
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Check for empty objects or missing required keys
      const missingKeys = findMissingKeys(namespace, content);
      const unusedKeys = findUnusedKeys(namespace, content);
      
      results.push({
        namespace,
        missingKeys,
        unusedKeys,
        errors: []
      });
      
    } catch (error) {
      results.push({
        namespace,
        missingKeys: [],
        unusedKeys: [],
        errors: [`Failed to parse JSON: ${error.message}`]
      });
    }
  }
  
  return results;
}

function findMissingKeys(namespace: string, content: any): string[] {
  // Implementation to scan codebase for translation keys
  // that don't exist in the JSON file
  return [];
}

function findUnusedKeys(namespace: string, content: any): string[] {
  // Implementation to find JSON keys that aren't used
  // in any component files
  return [];
}

// Run validation
validateTranslations().then(results => {
  console.log('Translation Validation Results:');
  results.forEach(result => {
    console.log(`\n${result.namespace}:`);
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(', ')}`);
    }
    if (result.missingKeys.length > 0) {
      console.log(`  Missing Keys: ${result.missingKeys.join(', ')}`);
    }
    if (result.unusedKeys.length > 0) {
      console.log(`  Unused Keys: ${result.unusedKeys.join(', ')}`);
    }
  });
});
```

#### **Task 5.2: Update Metadata and Server Components**

**Files to Check and Fix:**
1. All `generateMetadata` functions
2. All `getTranslations` server-side calls
3. Ensure proper namespace usage

**Pattern to Fix:**
```tsx
// ❌ Before:
const t = await getTranslations({ locale, namespace: 'legal.terms.metadata' });

// ✅ After:
const t = await getTranslations({ locale, namespace: 'legal' });
// Access: t('terms.metadata.title')
```

#### **Task 5.3: Comprehensive Testing**

**Create Test Suite:** `tests/translation-integration.test.ts`

```typescript
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';

// Test that all pages load without translation errors
describe('Translation Integration Tests', () => {
  const locales = ['en', 'ja', 'vi'];
  
  locales.forEach(locale => {
    describe(`Locale: ${locale}`, () => {
      test('Landing page loads without errors', async () => {
        // Test landing page components
      });
      
      test('Auth pages load without errors', async () => {
        // Test authentication pages
      });
      
      test('Dashboard pages load without errors', async () => {
        // Test admin dashboard pages
      });
      
      test('Customer pages load without errors', async () => {
        // Test customer-facing pages
      });
    });
  });
});
```

#### **Task 5.4: Performance Validation**

**Create Performance Test:** `scripts/measure-translation-performance.ts`

```typescript
import { performance } from 'perf_hooks';

async function measureTranslationLoading() {
  const start = performance.now();
  
  // Import all namespaces
  const loaded = await Promise.all(
    NAMESPACES.map(ns =>
      import(`../messages/en/${ns}.json`)
        .then(mod => mod.default)
        .catch(() => ({}))
    )
  );
  
  const end = performance.now();
  
  console.log(`Translation loading took ${end - start} milliseconds`);
  console.log(`Loaded ${loaded.length} namespaces`);
  
  // Check bundle sizes
  const sizes = loaded.map((content, index) => ({
    namespace: NAMESPACES[index],
    size: JSON.stringify(content).length,
    keys: Object.keys(content).length
  }));
  
  console.log('Namespace sizes:', sizes);
}
```

#### **Task 5.5: Documentation Updates**

**Update Files:**
1. `README.md` - Update i18n section with new namespace structure
2. `docs/translation-guide.md` - Create comprehensive guide
3. Component documentation - Add translation examples

**Create:** `docs/translation-guide.md`

```markdown
# Translation Guide

## Namespace Structure
- `common` - Shared across all areas
- `landing` - Landing page content
- `auth` - Authentication flows
- `legal` - Terms and privacy
- `owner.*` - Restaurant owner dashboard
- `customer.*` - Customer-facing features
- `serviceAdmin.*` - Platform administration

## Usage Patterns
\`\`\`tsx
// Component-specific translations
const t = useTranslations('owner.menu');

// Common translations
const tCommon = useTranslations('common');

// Server-side translations
const t = await getTranslations({ locale, namespace: 'auth' });
\`\`\`

## Adding New Keys
1. Determine appropriate namespace
2. Add key to English JSON file
3. Add to other locale files (ja, vi)
4. Use in component
5. Test all locales
```

#### **Task 5.6: Create Migration Checklist**

**File:** `docs/translation-migration-checklist.md`

```markdown
# Translation Migration Checklist

## Pre-Migration
- [ ] Backup current translation files
- [ ] Review all useTranslations calls in codebase
- [ ] Plan namespace structure

## During Migration
- [ ] Update useTranslations calls
- [ ] Add missing translation keys
- [ ] Test each component after changes
- [ ] Verify language switching works

## Post-Migration
- [ ] Run translation validation script
- [ ] Test all pages in all locales
- [ ] Check performance impact
- [ ] Update documentation
- [ ] Remove old translation files
```

### 🧪 **Testing Checklist**
- [ ] Translation validation script runs without errors
- [ ] All pages load in all locales (en, ja, vi)
- [ ] No console errors about missing translations
- [ ] Language switching works correctly
- [ ] Performance is acceptable
- [ ] Bundle sizes are reasonable
- [ ] All metadata generates correctly
- [ ] Server-side translations work

### ⏱️ **Estimated Time:** 4-5 hours

---

## 🚀 **Final Integration Steps**

### **Step 1: Coordinate Between Developers**
- Ensure no conflicts in JSON file updates
- Share translation keys that span multiple areas
- Coordinate testing of shared components

### **Step 2: Comprehensive Testing**
- Test entire application flow in all locales
- Verify no broken functionality after migration
- Check console for any remaining translation errors

### **Step 3: Performance Validation**
- Measure loading times before/after migration
- Verify bundle sizes are acceptable
- Test on slow connections

### **Step 4: Documentation**
- Update all developer documentation
- Create migration guide for future reference
- Document new namespace conventions

### **Step 5: Cleanup**
- Remove old monolithic translation file
- Clean up any unused translation keys
- Archive old documentation

---

## 📊 **Success Criteria**

- ✅ All `useTranslations` calls use new namespaces
- ✅ All translation keys exist in appropriate JSON files
- ✅ All pages load without translation errors
- ✅ Language switching works correctly in all areas
- ✅ Performance is maintained or improved
- ✅ All tests pass
- ✅ Documentation is updated

---

## ⚠️ **Common Pitfalls to Avoid**

1. **Namespace Conflicts:** Don't create duplicate keys across namespaces
2. **Missing Fallbacks:** Always provide English fallback translations
3. **Server vs Client:** Remember different patterns for server/client components
4. **Performance:** Don't load unnecessary namespaces
5. **Testing:** Test all locales, not just English

---

## 🔗 **Dependencies Between Tasks**

- Developer 1 & 3: Coordinate on owner.* namespace files
- Developer 2 & 4: Coordinate on common.json updates
- Developer 5: Depends on all others completing their updates
- All: Must communicate about shared component changes

---

This comprehensive migration plan ensures that the translation namespace restructuring is completed thoroughly and without breaking existing functionality.
