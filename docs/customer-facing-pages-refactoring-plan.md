# Customer-Facing Pages Refactoring Plan

## Executive Summary

This document outlines a comprehensive plan to refactor the customer-facing pages from a monolithic component-based system to a modern, page-based architecture with improved performance, maintainability, and user experience.

## Key Improvements

### UI / UX Improvements
- Use a responsive, touch-friendly grid for `SmartMenu` with image-focused cards, hover/focus states, and smooth add-to-cart micro-animations.
- Add skeleton/loading placeholders (e.g., category title bars, card frames) so the UI feels instantly responsive.
- Keep the header sticky with quick access to language switcher and session status, and make the floating cart slide in/out.
- Ensure the AI Assistant toggle is keyboard-accessible and has ARIA labels.

### Performance Optimizations
- On the menu list page, fetch only the minimal fields for each item (`id`, `name`, `price`, `imageURL`, `availability`) and defer sizes/toppings until the detail page.
- Lazy-load images with low-res placeholders or `next/image` built-in blur.
- Code-split each page route (`/menu`, `/menu/[itemId]`, `/cart`, etc.) so users download only what they need.
- Use React Suspense or SWR/React-Query with stale-while-revalidate for menu data caching, and prefetch item details on hover or when the user starts typing that item in search.

### Maintainability / Extensibility
- Follow an atomic or container/presentational component pattern in `components/features/customer`: small, focused units (e.g., `FoodCard`, `SearchBar`, `CategorySection`).
- Centralize theme tokens (colors, typography, spacing) so you can tweak the look in one place.
- Keep business logic (session, cart, AI suggestions) in hooks or context providers (`useSession`, `useCart`, `useRecommendations`) separate from UI.
- Define clear TypeScript interfaces for API data and use codegen or Zod schemas to validate responses.
- Write lightweight unit tests for each component and an end-to-end smoke test for the full ordering flow.

## Current State Analysis

### Issues Identified
1. **Monolithic Architecture**: `menu-client-content.tsx` handles multiple responsibilities
3. **Incomplete Routing**: Customer folder structure exists but pages are incomplete
4. **Complex Menu Components**: MenuList and SmartDiscoveryMenu are overcomplicated
5. **Inconsistent API Usage**: Not utilizing existing customer APIs effectively

### Existing Customer APIs (Reusable)
- ✅ `GET /api/v1/customer/restaurant` - Restaurant data by subdomain
- ✅ `GET /api/v1/customer/session/check` - Session validation and auto-refresh
- ✅ `GET /api/v1/customer/menu` - Menu data with categories, items, sizes, toppings
- ✅ `GET /api/v1/customer/tables` - Available tables for booking
- ✅ `GET /api/v1/customer/reviews/create` - Create new dining session
- ✅ `GET /api/v1/customer/reviews/join` - Join existing session
- ✅ `POST /api/v1/customer/orders/create` - Submit order

## Architecture Overview

### Phase 1: Layout & Infrastructure

#### 1.1 Customer Layout Structure
```
web/app/[locale]/(restaurant)/(customer)/
├── layout.tsx                 # Shared layout with header/footer
├── menu/
│   └── page.tsx              # Smart menu browsing with item detail modal
├── cart/
│   └── page.tsx              # Cart review & checkout
├── order/
│   └── [orderId]/page.tsx    # Order confirmation & status
├── history/
│   └── page.tsx              # Order history & session management
└── booking/
    └── page.tsx              # Table booking (existing)
```

#### 1.2 Shared Customer Layout Features
- **Header**: Restaurant branding, language switcher, session indicator
- **Footer**: Copyright, powered by coorder.ai
- **Floating Cart**: Persistent cart with item count
- **AI Assistant**: Bottom-right corner virtual assistant
- **Session Management**: Handle sessionId persistence across pages

### Phase 2: Simplified Menu System

#### 2.1 Replace MenuList + SmartDiscoveryMenu with Single Component
**New SmartMenu Component** - Simple, fast, intelligent:

**Core Features:**
- **Smart Categories**: Auto-organize by meal time (breakfast/lunch/dinner)
- **Quick Search**: Instant results as you type
- **Smart Suggestions**: AI-powered recommendations based on:
  - Time of day
  - Popular items
  - Previous orders (if available)
  - Dietary preferences
- **One-Click Actions**: Add to cart without complex customization UI
- **Visual Grid**: Clean, image-focused item cards

**Simplified UX:**
- No overwhelming filter options
- Maximum 3 smart categories visible
- Search suggests items as you type
- Quick add-to-cart for simple items
- Tap item for details/customization

#### 2.2 AI Virtual Assistant
**Bottom-right corner assistant**:
- **Greeting**: "Hi! I'm here to help you order 😊"
- **Proactive Help**: 
  - "Looking for something specific?"
  - "Need help choosing?"
  - "Want to see our popular items?"
- **Smart Responses**:
  - Menu recommendations
  - Dietary accommodations
  - Order status updates
  - Simple Q&A about items

**Simple Implementation:**
- Pre-defined response templates
- Context-aware suggestions
- No complex AI integration initially
- Future: Connect to actual AI service

### Phase 3: Page-Based Routing

#### 3.1 Menu Browsing (`/menu`)
**Features:**
- Smart menu grid with AI recommendations
- Category quick-filters
- Search with instant results
- Add to cart directly from grid for simple items
- Click item for detailed modal with customization
- Floating cart indicator

**Modal Features:**
- Full item information display
- Size selection (if available)
- Topping customization (if available)
- Quantity selector
- Special notes/instructions
- Dynamic price calculation
- Add to cart with configurations
- Close modal to return to menu

**API Integration:**
- Use `GET /api/v1/customer/menu` for menu data
- Use `GET /api/v1/customer/restaurant` for branding
- Fetch detailed item data (sizes/toppings) when modal opens

#### 3.2 Cart & Checkout (`/cart`)
**Features:**
- Review all cart items
- Quantity adjustments
- Item-specific notes
- Order total calculation
- Submit order
- Session validation

**API Integration:**
- Use `POST /api/v1/customer/orders/create` for order submission
- Handle size/topping selections properly

#### 3.3 Order Confirmation (`/order/[orderId]`)
**Features:**
- Order confirmation details
- Real-time status updates
- Session sharing (passcode display for new sessions)
- Add more items link back to menu
- Contact staff button

#### 3.4 Order History (`/history`)
**Features:**
- Current session order status
- Previous orders (if any)
- Re-order quick actions
- Session management
- Join existing session option

### Phase 4: Component Architecture

#### 4.1 Reusable Components
```
web/components/features/customer/
├── layout/
│   ├── CustomerLayout.tsx ✓
│   ├── CustomerHeader.tsx ✓ 
│   ├── CustomerFooter.tsx ✓
│   └── AIAssistant.tsx      # NEW
├── menu/
│   ├── SmartMenu.tsx        # NEW (replaces MenuList + SmartDiscoveryMenu)
│   ├── ItemDetailModal.tsx  # NEW (modal for item customization)
│   ├── FoodCard.tsx ✓
│   ├── QuickSearch.tsx      # NEW
│   └── SmartCategories.tsx  # NEW
├── cart/
│   ├── FloatingCart.tsx ✓
│   ├── CartProvider.tsx ✓
│   ├── OrderSummary.tsx ✓
│   └── CheckoutForm.tsx     # NEW
├── order/
│   ├── OrderStatus.tsx      # NEW
│   ├── SessionInfo.tsx      # NEW
│   ├── SizeSelector.tsx     # NEW (moved from ItemCustomization)
│   └── ToppingSelector.tsx  # NEW (moved from ItemCustomization)
└── common/
    ├── LoadingStates.tsx    # NEW
    ├── ErrorBoundary.tsx    # NEW
    └── SessionDialogs.tsx   # NEW
```

#### 4.2 SmartMenu Component Design
**Simplified Architecture:**
```tsx
interface SmartMenuProps {
  categories: Category[];
  onItemClick: (item: MenuItem) => void;
  onAddToCart: (item: MenuItem) => void;
  searchPlaceholder?: string;
  locale: string;
  brandColor: string;
  canAddItems: boolean;
}

// Smart organization
const smartCategories = useMemo(() => {
  const timeOfDay = getTimeOfDay(); // breakfast/lunch/dinner
  const popularItems = getPopularItems();
  const recommendedItems = getAIRecommendations();
  
  return {
    recommended: recommendedItems.slice(0, 6),
    popular: popularItems.slice(0, 6),
    [timeOfDay]: getCategoryItemsByTime(timeOfDay),
    all: allCategories
  };
}, [categories, timeOfDay]);
```

#### 4.3 AI Assistant Component
**Simple Chat Interface:**
```tsx
interface AIAssistantProps {
  isOpen: boolean;
  onToggle: () => void;
  restaurantName: string;
  currentContext: 'menu' | 'cart' | 'order';
}

// Pre-defined responses for quick implementation
const responses = {
  greeting: "Hi! I'm your dining assistant. How can I help you today?",
  menuHelp: "I can help you find the perfect dish! What are you in the mood for?",
  popular: "Our most popular items are...",
  dietary: "We have many options for dietary restrictions...",
  // ... more responses
};
```

### Phase 5: Implementation Steps

#### Step 1: Setup Customer Layout (Week 1)
1. ✅ Create shared customer layout
2. ✅ Implement CartProvider at layout level
3. ✅ Add floating cart component
4. ✅ Handle session management
5. ✅ Add AI Assistant component

#### Step 2: Simplify Menu System (Week 1-2)
1. ✅ Create new SmartMenu component
2. ✅ Implement smart categorization
3. ✅ Add quick search functionality
4. ✅ Create AI assistant integration
5. ✅ Remove old MenuList and SmartDiscoveryMenu

#### Step 3: Implement Core Pages (Week 2-3)
1. ✅ Create menu browsing page (`/menu`)
2. ✅ Implement item detail modal with customization (sizes, toppings, quantity, notes)
3. 🆕 Create cart page (`/cart`)
4. 🆕 Add order confirmation page (`/order/[orderId]`)

#### Step 4: Order Management (Week 3-4)
1. 🆕 Create order history page (`/history`)
2. 🆕 Implement session sharing
3. 🆕 Add real-time order updates
4. 🆕 Test complete ordering flow

#### Step 5: Polish & Testing (Week 4)
1. 🆕 Mobile optimization
2. 🆕 Error boundary implementation
3. 🆕 Loading state improvements
4. 🆕 Cross-browser testing
5. 🆕 Performance optimization

## Timeline & Resources

### Phase 1: Foundation
- Set up shared layout structure, header/footer, and session management context
- Implement `CartProvider` and `FloatingCart` with skeleton/loading placeholders
- Define theme tokens (colors, typography, spacing) and establish design system
- Scaffold AI Assistant component with ARIA labels and keyboard support

### Phase 2: Core Features
- Develop `SmartMenu` with:
  - Touch-friendly, image-focused grid and card micro-animations
  - Skeleton loaders and lazy-loaded images (`next/image` blur)
  - SWR/React-Query data fetching with Suspense, code-splitting, and caching
  - Quick search with instant results and prefetch item details on hover
- Isolate business logic into hooks (`useSession`, `useCart`, `useRecommendations`)
- Centralize API calls to trim fields (defer sizes/toppings until detail view)

### Phase 3: Order & Management
- Build Cart & Checkout pages with real-time state updates and validation
- Create Order Confirmation and History pages with live status updates
- Code-split detail views and defer heavy data until needed (sizes, toppings)
- Apply theme tokens and ensure accessibility (ARIA, keyboard nav) across pages

### Phase 4: Polish & Launch
- Mobile-first adjustments: responsive layouts, large tap targets, offline fallbacks
- Add micro-animations, sticky header, and sliding floating cart transitions
- Cross-browser testing and performance audits (LCP, TTI, Lighthouse)
- Write unit tests for components and end-to-end smoke tests for flows
- Optimize bundle size, implement smart caching strategies, conduct Lighthouse scoring

### Resources Needed
- **2 Frontend Developers** (full-time)
- **1 UX Designer** (part-time for AI Assistant design)
- **1 QA Engineer** (part-time for testing)
- **DevOps support** for deployment

## Success Metrics

### Technical Metrics
- **Page Load Time**: < 2 seconds
- **Bundle Size**: < 100KB initial
- **Lighthouse Score**: > 90
- **Error Rate**: < 1%

### User Experience Metrics
- **Time to First Order**: < 3 minutes
- **Cart Abandonment**: < 20%
- **User Satisfaction**: > 4.5/5
- **Mobile Usage**: > 80%

### Business Metrics
- **Order Conversion**: +15%
- **Average Order Value**: +10%
- **Support Tickets**: -30%
- **User Retention**: +20%

## Conclusion

This refactoring plan transforms the customer-facing experience from a complex, monolithic system to a modern, efficient, and user-friendly platform. The emphasis on simplicity, AI assistance, and mobile optimization will significantly improve both user experience and business outcomes.

The modular architecture ensures easy maintenance and future enhancements, while the gradual migration strategy minimizes risks during the transition.

---

**Next Steps:**
1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Regular progress reviews and adjustments
