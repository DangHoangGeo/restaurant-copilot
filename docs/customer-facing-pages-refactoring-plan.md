# Customer-Facing Pages Refactoring Plan

## Executive Summary

This document outlines a comprehensive plan to refactor the customer-facing pages from a monolithic component-based system to a modern, page-based architecture with improved performance, maintainability, and user experience.

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
│   ├── page.tsx              # Simplified smart menu browsing
│   └── [itemId]/page.tsx     # Item details & customization
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
- Add to cart directly from grid
- Floating cart indicator

**API Integration:**
- Use `GET /api/v1/customer/menu` for menu data
- Use `GET /api/v1/customer/restaurant` for branding

#### 3.2 Item Details (`/menu/[itemId]`)
**Features:**
- Full item information
- Size selection (if available)
- Topping customization (if available)
- Dynamic price calculation
- Add to cart with configurations
- Quick back to menu

#### 3.3 Cart & Checkout (`/cart`)
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

#### 3.4 Order Confirmation (`/order/[orderId]`)
**Features:**
- Order confirmation details
- Real-time status updates
- Session sharing (passcode display for new sessions)
- Add more items link back to menu
- Contact staff button

#### 3.5 Order History (`/history`)
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
│   └── ItemCustomization.tsx # NEW
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
5. 🆕 Add AI Assistant component

#### Step 2: Simplify Menu System (Week 1-2)
1. 🆕 Create new SmartMenu component
2. 🆕 Implement smart categorization
3. 🆕 Add quick search functionality
4. 🆕 Create AI assistant integration
5. 🗑️ Remove old MenuList and SmartDiscoveryMenu

#### Step 3: Implement Core Pages (Week 2-3)
1. 🆕 Create menu browsing page (`/menu`)
2. 🆕 Implement item detail page (`/menu/[itemId]`)
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

### Phase 6: API Integration Strategy

#### 6.1 Optimize API Usage
```typescript
// Use existing customer APIs efficiently
const useCustomerData = () => {
  const { restaurant } = useCustomerAPI('/api/v1/customer/restaurant');
  const { categories } = useCustomerAPI('/api/v1/customer/menu');
  const { session } = useCustomerAPI('/api/v1/customer/session/check');
  
  return { restaurant, categories, session };
};
```

#### 6.2 Session Flow Optimization
1. **URL Parameters**: `?code=`, `?sessionId=`, `?tableId=`
2. **localStorage**: Persist sessionId across pages
3. **Auto-validation**: Check session on each page load
4. **Graceful fallbacks**: Handle expired/invalid sessions

### Phase 7: UX/UI Improvements

#### 7.1 Mobile-First Design
- **Touch-friendly interfaces**: Large buttons, easy scrolling
- **Optimized for restaurant environment**: Good visibility in various lighting
- **Quick actions**: Minimize taps to complete common tasks
- **Offline-ready**: Handle poor network conditions

#### 7.2 Performance Optimizations
- **Code splitting**: Load pages on demand
- **Image optimization**: WebP format, lazy loading
- **Caching**: Smart caching for menu data
- **Bundle size**: Keep initial load under 100KB

#### 7.3 Accessibility
- **ARIA labels**: Proper screen reader support
- **Keyboard navigation**: Full keyboard accessibility
- **High contrast**: Good visibility for all users
- **Multiple languages**: Seamless language switching

### Phase 8: AI Assistant Implementation

#### 8.1 Phase 1: Rule-Based Assistant
**Quick Implementation:**
- Pre-defined response templates
- Context-aware suggestions based on current page
- Menu item recommendations based on time/popularity
- Simple FAQ responses

#### 8.2 Phase 2: Enhanced AI Integration
**Future Enhancement:**
- Integration with OpenAI/Claude for natural conversations
- Personalized recommendations
- Order history analysis
- Dietary preference learning

### Phase 9: Testing & Quality Assurance

#### 9.1 Automated Testing
```typescript
// Example test structure
describe('Customer Menu Flow', () => {
  test('Can browse menu and add items to cart', () => {
    // Test menu browsing
    // Test item selection
    // Test cart addition
    // Test checkout flow
  });
  
  test('AI Assistant provides helpful responses', () => {
    // Test assistant activation
    // Test response accuracy
    // Test context awareness
  });
});
```

#### 9.2 User Acceptance Testing
- **Real restaurant environment testing**
- **Mobile device testing across different sizes**
- **Network condition testing (slow/unreliable connections)**
- **Accessibility testing with screen readers**

### Phase 10: Migration Strategy

#### 10.1 Gradual Migration
1. **Keep existing system running** during development
2. **Feature flag approach** for gradual rollout
3. **A/B testing** to ensure feature parity
4. **Rollback plan** for any issues

#### 10.2 Data Migration
- **Session data compatibility**
- **Cart data preservation**
- **URL structure migration**
- **Bookmark handling**

## Expected Benefits

### 🚀 Performance Improvements
- **50% faster initial load** with code splitting
- **30% smaller bundle size** with simplified components
- **Better Core Web Vitals** scores

### 👥 User Experience Enhancements
- **Simplified ordering process** - fewer taps to order
- **Smart recommendations** - AI-powered suggestions
- **Better mobile experience** - optimized for touch
- **Consistent navigation** - proper page-based routing

### 🛠️ Developer Experience
- **Better maintainability** - smaller, focused components
- **Easier testing** - isolated page components
- **Clearer architecture** - standard Next.js patterns
- **Improved debugging** - better error boundaries

### 📈 Business Impact
- **Higher conversion rates** - streamlined ordering
- **Reduced support tickets** - better UX and AI assistance
- **Faster feature development** - modular architecture
- **Better analytics** - page-based tracking

## Risk Mitigation

### Technical Risks
- **API compatibility issues**: Thorough testing with existing APIs
- **Performance regression**: Continuous monitoring and optimization
- **Mobile compatibility**: Extensive device testing

### Business Risks
- **User confusion during migration**: Gradual rollout with user education
- **Lost orders during transition**: Robust testing and rollback plan
- **Staff training needed**: Comprehensive documentation and training

## Timeline & Resources

### Week 1: Foundation
- Set up customer layout structure
- Create AI Assistant component
- Begin SmartMenu component development

### Week 2: Core Features
- Complete SmartMenu component
- Implement menu and item detail pages
- Add cart functionality

### Week 3: Order Management
- Create order confirmation and history pages
- Implement session management
- Add real-time updates

### Week 4: Polish & Launch
- Mobile optimization
- Testing and bug fixes
- Performance optimization
- Production deployment

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
