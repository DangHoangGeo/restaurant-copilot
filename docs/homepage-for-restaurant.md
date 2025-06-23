# Step-by-Step Plan to Implement New Restaurant Homepage

## **Phase 1: Database Schema Updates** (Week 1) ✅

### Step 1.1: Create Database Migration ✅
- **Goal**: Add new fields and tables to support the homepage features
- **Files to create**:
  - `infra/migrations/016_homepage_enhancements.sql` ✅

**Migration will include**:
```sql
-- Add photo_url to users table for owner avatars
ALTER TABLE users ADD COLUMN photo_url text;

-- Add owner story fields to restaurants table
ALTER TABLE restaurants ADD COLUMN owner_story_en text;
ALTER TABLE restaurants ADD COLUMN owner_story_ja text;
ALTER TABLE restaurants ADD COLUMN owner_story_vi text;

-- Create gallery table
CREATE TABLE restaurant_gallery_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  alt_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes and RLS policies for gallery table
```

### Step 1.2: Update Restaurant Data API ✅
- **Goal**: Extend the existing API to return owner info, story, and gallery data
- **Files to modify**:
  - route.ts

**Enhancements**:
- Fetch owners (users with role='owner') 
- Include owner story in multiple languages
- Include gallery images with proper ordering
- Add Google Maps integration placeholder

## **Phase 2: Backend API Enhancements** (Week 1-2) ✅

### Step 2.1: Create Gallery Management API ✅
- **Files to create**:
  - `web/app/api/v1/restaurant/gallery/route.ts` (GET, POST) ✅
  - `web/app/api/v1/restaurant/gallery/[id]/route.ts` (PUT, DELETE) ✅

### Step 2.2: Create Owner Story API ✅
- **Files to create**:
  - `web/app/api/v1/restaurant/owner-story/route.ts` (GET, PUT) ✅

### Step 2.3: Create Signature Dishes API ✅
- **Files to create**:
  - `web/app/api/v1/restaurant/signature-dishes/route.ts` (GET, PUT) ✅

## **Phase 3: New Homepage Components** (Week 2-3) ✅

### Step 3.1: Create Hero Section Component ✅
- **File to create**: `web/components/features/customer/homepage/HeroSection.tsx` ✅
- **Features**:
  - Restaurant logo, name, tagline ✅
  - Hero image carousel from gallery ✅
  - Key action buttons (View Menu, Reserve, Call) ✅
  - Google rating display ✅

### Step 3.2: Create Owner Story Component ✅
- **File to create**: `web/components/features/customer/homepage/OwnerStorySection.tsx` ✅
- **Features**:
  - Owner photo/avatar display ✅
  - Multi-language owner story ✅
  - Graceful fallback when no story exists ✅
  - Admin encouragement messages ✅

### Step 3.3: Create Gallery Component ✅
- **File to create**: `web/components/features/customer/homepage/GallerySection.tsx` ✅
- **Features**:
  - Responsive carousel (mobile) / grid (desktop) ✅
  - Image captions and alt text ✅
  - Lazy loading optimization ✅

### Step 3.4: Create Signature Dishes Component ✅
- **File to create**: `web/components/features/customer/homepage/SignatureDishesSection.tsx` ✅
- **Features**:
  - 2-4 highlighted menu items ✅
  - Images, descriptions, prices ✅
  - "Browse Full Menu" CTA ✅

### Step 3.5: Create Reviews & Map Component ✅
- **File to create**: `web/components/features/customer/homepage/ReviewsMapSection.tsx` ✅
- **Features**:
  - Google rating and review count ✅
  - Google Maps embed ✅
  - Directions and "View on Google Maps" buttons ✅

### Step 3.6: Create Contact & Hours Component ✅
- **File to create**: `web/components/features/customer/homepage/ContactHoursSection.tsx` ✅
- **Features**:
  - Opening hours with "Open Now" status ✅
  - Address, phone, website, social links ✅
  - Responsive contact cards ✅

## **Phase 4: Main Homepage Integration** (Week 3) ✅

### Step 4.1: Create New Homepage Container ✅
- **File to create**: `web/components/features/customer/screens/NewHomePage.tsx` ✅
- **Integration**:
  - Combine all section components ✅
  - Handle responsive layout (mobile/desktop) ✅
  - Implement graceful fallbacks ✅
  - Add loading states and error handling ✅

### Step 4.2: Update Routing ✅
- **Files to create**:
  - `web/components/features/customer/homepage/index.ts` ✅
- **Integration**:
  - Export all homepage components ✅
  - Ready for routing integration ✅

## **Phase 5: Admin Panel Enhancements** (Week 4)

### Step 5.1: Gallery Management UI
- **File to create**: `web/components/features/admin/gallery/GalleryManager.tsx`
- **Features**:
  - Upload/delete images
  - Drag-to-reorder functionality
  - Caption and alt text editing

### Step 5.2: Owner Story Editor
- **File to create**: `web/components/features/admin/profile/OwnerStoryEditor.tsx`
- **Features**:
  - Multi-language story editing
  - Rich text editor
  - Photo upload for owner avatar

### Step 5.3: Signature Dishes Selector
- **File to create**: `web/components/features/admin/menu/SignatureDishesSelector.tsx`
- **Features**:
  - Select dishes to highlight on homepage
  - Reorder highlighted dishes

### Step 5.4: Homepage Preview
- **File to create**: `web/components/features/admin/homepage/HomepagePreview.tsx`
- **Features**:
  - Live preview of homepage changes
  - Mobile/desktop responsive preview

## **Phase 6: Performance & Accessibility** (Week 4-5)

### Step 6.1: Performance Optimizations
- **Implement**:
  - Image optimization and lazy loading
  - Component code splitting
  - API response caching
  - Progressive loading strategies

### Step 6.2: Accessibility Enhancements
- **Implement**:
  - Proper alt text for all images
  - ARIA labels for buttons and interactive elements
  - Keyboard navigation support
  - Screen reader compatibility

### Step 6.3: SEO Optimization
- **Implement**:
  - Meta tags and Open Graph data
  - Structured data for restaurants
  - Proper heading hierarchy

## **Phase 7: Testing & Polish** (Week 5)

### Step 7.1: Component Testing
- Create unit tests for all new components
- Integration tests for API endpoints
- E2E tests for critical user flows

### Step 7.2: Mobile Responsiveness
- Test across different device sizes
- Ensure touch-friendly interactions
- Optimize for mobile performance

### Step 7.3: Browser Compatibility
- Test across modern browsers
- Implement necessary polyfills
- Ensure graceful degradation

## **Phase 8: Google Integration** (Week 6)

### Step 8.1: Google Maps Integration
- **Implement**:
  - Dynamic map embedding based on restaurant address
  - Directions integration
  - Place details from Google Places API

### Step 8.2: Google Reviews Integration
- **Implement**:
  - Fetch and display Google reviews
  - Rating display with proper attribution
  - Review highlights and photos

## **Implementation Priority**

**High Priority (Must Have)**:
1. Database migrations and API updates
2. Basic homepage structure with existing data
3. Hero section with action buttons
4. Contact information and hours

**Medium Priority (Should Have)**:
1. Owner story section
2. Gallery functionality
3. Signature dishes section
4. Admin panel for content management

**Low Priority (Nice to Have)**:
1. Google Maps integration
2. Google Reviews integration
3. Advanced animations and interactions
4. Admin homepage preview

## **Files Structure After Implementation**

```
web/components/features/customer/
├── homepage/
│   ├── HeroSection.tsx
│   ├── OwnerStorySection.tsx
│   ├── GallerySection.tsx
│   ├── SignatureDishesSection.tsx
│   ├── ReviewsMapSection.tsx
│   └── ContactHoursSection.tsx
├── screens/
│   ├── HomePage.tsx (current - to be replaced)
│   └── NewHomePage.tsx (new implementation)
└── layout/
    ├── CustomerHeader.tsx (existing)
    └── CustomerFooter.tsx (existing)

web/components/features/admin/
├── gallery/
│   └── GalleryManager.tsx
├── profile/
│   └── OwnerStoryEditor.tsx
├── menu/
│   └── SignatureDishesSelector.tsx
└── homepage/
    └── HomepagePreview.tsx

web/app/api/v1/restaurant/
├── data/route.ts (existing - to be enhanced)
├── gallery/
│   ├── route.ts
│   └── [id]/route.ts
└── owner-story/
    └── route.ts
```