# Customer-Facing Page TODO Tasks

## Priority 1: Critical Issues 🔴

### 1. Session Management Issues
- **Missing Translation Key**: Line 234 has incomplete translation key `t("session.")` - needs to be `t("session.invalid_session")`
- **Session Validation API**: Need to implement `/api/v1/sessions/check` endpoint for session validation
- **Error Handling**: Replace `alert()` calls with proper UI toast notifications or error dialogs

### 2. Feature Flag Implementation
- **Central Config**: Move FEATURE_FLAGS from local definition to central config file (`/config/feature-flags.ts`)
- **AI Chat Flag**: `aiChat: false` but no AI chat implementation found in codebase
- **Online Payment Flag**: `onlinePayment: false` but checkout flow assumes cash-only

### 3. Type Safety Issues
- **ViewProps Casting**: Multiple unsafe type casting with `as MenuViewProps`, `as CheckoutViewProps` etc.
- **Optional Props**: Several places assume props exist without null checks (e.g., `orderId`, `items`)

## Priority 2: Missing Functionality 🟡

### 4. Missing API Endpoints
- **Sessions API**: 
  - `POST /api/v1/sessions/create` - partially implemented
  - `GET /api/v1/sessions/check` - missing
  - `POST /api/v1/sessions/join` - missing
- **Orders API**: Need proper order creation and status management
- **Reviews API**: `POST /api/v1/reviews/create` - missing implementation

### 5. Incomplete Screen Implementations
- **Admin View**: Line 325 has placeholder "Redirecting to admin panel..." - needs proper implementation
- **Menu Item Detail**: `CustomerMenuItemDetailScreen` imported but implementation not verified
- **Booking Screen**: Advanced booking features partially implemented

### 6. Missing Components
- **Toast Notifications**: Replace alert() with proper toast system
- **Loading States**: No loading indicators during API calls
- **Error Boundaries**: Missing error boundary components
- **Offline Support**: No offline capability or network error handling

## Priority 3: Enhancement Opportunities 🟢

### 7. User Experience Improvements
- **Progressive Web App**: Add PWA capabilities for better mobile experience
- **Voice Commands**: Add voice ordering capabilities
- **Accessibility**: Improve ARIA labels and keyboard navigation
- **Dark Mode**: Implement dark mode support

### 8. Performance Optimizations
- **Code Splitting**: Implement lazy loading for screens
- **Image Optimization**: Add proper image optimization for menu items
- **Caching**: Implement proper caching strategies for menu data
- **Bundle Analysis**: Analyze and optimize bundle size

### 9. Security Enhancements
- **Input Sanitization**: Add proper input sanitization for all forms
- **CSRF Protection**: Implement CSRF tokens for sensitive operations
- **Rate Limiting**: Add client-side rate limiting for API calls

## Priority 4: Code Quality 🔵

### 10. Code Structure
- **Extract Constants**: Move magic strings to constants file
- **Custom Hooks**: Create custom hooks for session management, API calls
- **Component Splitting**: Break down large components into smaller ones
- **Error Handling**: Implement consistent error handling patterns

### 11. Testing
- **Unit Tests**: Add unit tests for all components
- **Integration Tests**: Add integration tests for critical flows
- **E2E Tests**: Add end-to-end tests for complete user journeys
- **Accessibility Tests**: Add automated accessibility testing

### 12. Documentation
- **Component Documentation**: Add JSDoc comments to all components
- **API Documentation**: Document all API endpoints
- **User Guide**: Create user documentation for ordering flow

## Implementation Checklist

### Immediate Actions (This Week)
- [ ] Fix missing translation key on line 234
- [ ] Implement `/api/v1/sessions/check` endpoint
- [ ] Replace all `alert()` calls with toast notifications
- [ ] Move FEATURE_FLAGS to central config
- [ ] Add proper error boundaries

### Short Term (Next 2 Weeks)
- [ ] Implement missing API endpoints
- [ ] Add loading states to all async operations
- [ ] Implement proper admin view or remove placeholder
- [ ] Add comprehensive error handling
- [ ] Implement toast notification system

### Medium Term (Next Month)
- [ ] Add PWA capabilities
- [ ] Implement offline support
- [ ] Add comprehensive testing suite
- [ ] Optimize performance and bundle size
- [ ] Implement proper caching strategies

### Long Term (Next Quarter)
- [ ] Add voice ordering capabilities
- [ ] Implement advanced accessibility features
- [ ] Add comprehensive analytics
- [ ] Implement A/B testing framework
- [ ] Add advanced personalization features

## Code Examples for Key TODOs

### Fix Translation Key
```typescript
// Current (Line 234):
<h1 className="text-2xl font-bold mb-4 text-red-600">{t("session.")}</h1>

// Should be:
<h1 className="text-2xl font-bold mb-4 text-red-600">{t("session.invalid_session")}</h1>
```

### Replace Alert with Toast
```typescript
// Current:
alert(data.error || "Failed to start session");

// Should be:
toast.error(data.error || t("session.failed_to_start"));
```

### Implement Session Check API
```typescript
// Need to implement: /api/v1/sessions/check
export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('sessionId');
  // Implementation needed
}
```

## Related Files to Update
- `/web/components/features/customer/screens/types.ts` - Type definitions
- `/web/messages/en.json`, `/web/messages/ja.json`, `/web/messages/vi.json` - Missing translations
- `/web/app/api/v1/sessions/` - API endpoints
- `/config/feature-flags.ts` - Central feature flag configuration