# Owner Onboarding Implementation

## Overview

The owner onboarding system provides a streamlined, AI-assisted setup process for new restaurant owners. It merges Restaurant Settings and Homepage Management into a single cohesive flow that guides users through essential setup steps.

## Features Implemented

### ✅ Core Onboarding Flow
- **4-step wizard interface** with progress tracking
- **AI-powered content generation** using Gemini AI
- **Media upload capabilities** for logos, owner photos, and gallery images
- **Multi-language support** (English, Japanese, Vietnamese)
- **Comprehensive review step** before completion

### ✅ Database Schema
- Added `onboarded` boolean flag to restaurants table
- Added hero content fields (`hero_title_*`, `hero_subtitle_*`)
- Created `complete_restaurant_onboarding` RPC function for transactional updates

### ✅ Navigation & Routing
- **Dynamic sidebar navigation** showing onboarding link for non-onboarded restaurants
- **Middleware protection** redirecting non-onboarded users to onboarding flow
- **Feature flag support** for gradual rollout
- **Fallback screens** for settings and homepage pages

### ✅ AI Integration
- **Structured prompts** for generating restaurant content
- **Fallback content** when AI services are unavailable
- **Multi-language content generation**
- **Context-aware suggestions** based on restaurant type and cuisine

## File Structure

```
web/
├── app/[locale]/(restaurant)/dashboard/onboarding/
│   ├── page.tsx                           # Server component
│   ├── onboarding-client-content.tsx      # Main wizard component
│   └── steps/
│       ├── BasicInfoStep.tsx              # Step 1: Basic information
│       ├── AIGenerationStep.tsx           # Step 2: AI content generation
│       ├── MediaUploadStep.tsx            # Step 3: Media uploads
│       ├── ReviewStep.tsx                 # Step 4: Review & complete
│       └── index.ts                       # Exports
├── app/api/v1/restaurant/onboarding/
│   ├── ai-generate/route.ts               # AI content generation endpoint
│   ├── complete/route.ts                  # Completion endpoint
│   └── ../upload/media/route.ts           # Media upload endpoint
├── contexts/RestaurantContext.tsx          # Updated with onboarding state
├── components/features/admin/dashboard/layout/
│   └── admin-sidebar.tsx                  # Dynamic navigation
├── lib/ai/prompts/onboarding.ts           # AI prompt templates
├── shared/types/ai.ts                     # AI type definitions
├── messages/*/owner/onboarding.json       # Translations
└── middleware.ts                          # Onboarding redirects
```

## Database Schema Changes

### Restaurants Table Updates
```sql
-- Add onboarding flag
ALTER TABLE restaurants ADD COLUMN onboarded BOOLEAN DEFAULT FALSE;

-- Add hero content fields
ALTER TABLE restaurants ADD COLUMN hero_title_en TEXT;
ALTER TABLE restaurants ADD COLUMN hero_title_ja TEXT;
ALTER TABLE restaurants ADD COLUMN hero_title_vi TEXT;
ALTER TABLE restaurants ADD COLUMN hero_subtitle_en TEXT;
ALTER TABLE restaurants ADD COLUMN hero_subtitle_ja TEXT;
ALTER TABLE restaurants ADD COLUMN hero_subtitle_vi TEXT;
```

### RPC Function
```sql
CREATE OR REPLACE FUNCTION complete_restaurant_onboarding(
  p_restaurant_data jsonb,
  p_owner_photos jsonb DEFAULT NULL,
  p_gallery_images jsonb DEFAULT NULL
)
RETURNS jsonb;
```

## API Endpoints

### POST `/api/v1/restaurant/onboarding/ai-generate`
Generates AI content for restaurant setup.

**Request:**
```json
{
  "restaurantName": "string",
  "cuisineType": "string",
  "description": "string",
  "ownerName": "string"
}
```

**Response:**
```json
{
  "heroContent": {
    "title_en": "string",
    "subtitle_en": "string",
    // ... other languages
  },
  "ownerStory": {
    "story_en": "string",
    // ... other languages
  },
  "signatureDishes": ["string"]
}
```

### POST `/api/v1/restaurant/onboarding/complete`
Completes the onboarding process.

**Request:**
```json
{
  "restaurantData": { /* restaurant updates */ },
  "ownerPhotos": [{ /* photo data */ }],
  "galleryImages": [{ /* image data */ }]
}
```

### POST `/api/v1/upload/media`
Handles media uploads during onboarding.

## Feature Flags

```typescript
FEATURE_FLAGS.onboarding: boolean // Default: true
```

Set `NEXT_PUBLIC_FEATURE_ONBOARDING=false` to disable the feature.

## Usage Flow

1. **New restaurant owner signs up**
2. **Middleware detects `onboarded: false`**
3. **User is redirected to `/dashboard/onboarding`**
4. **4-step wizard guides through setup:**
   - Basic information (name, contact, hours)
   - AI content generation (hero, story, dishes)
   - Media uploads (logo, photos, gallery)
   - Review and completion
5. **Onboarding completion updates database**
6. **User gains access to full dashboard**

## Integration Points

### RestaurantContext
```typescript
interface RestaurantContextType {
  restaurantSettings: RestaurantSettings | null;
  isLoading: boolean;
  error: string | null;
  refetchSettings: () => Promise<void>;
  updateSettings: (settings: RestaurantSettings) => void;
  isOnboarded: boolean;        // NEW
  needsOnboarding: boolean;    // NEW
}
```

### Middleware Protection
- Checks onboarding status for dashboard routes
- Redirects non-onboarded users to onboarding
- Prevents access to settings/homepage before onboarding

### Sidebar Navigation
- Shows "Get Started" link for non-onboarded restaurants
- Hides advanced features until onboarding is complete
- Dynamic based on onboarding status

## Error Handling

- **AI service failures:** Fallback to default content
- **Upload failures:** Retry mechanisms and error feedback
- **Network issues:** Graceful degradation and retry options
- **Validation errors:** Field-level feedback and correction guidance

## Accessibility

- **Keyboard navigation** support
- **Screen reader friendly** with proper ARIA labels
- **Progress indicators** for screen readers
- **Focus management** between steps

## Performance

- **Lazy loading** of step components
- **Optimistic updates** for better UX
- **Image optimization** for uploads
- **Minimal API calls** with efficient caching

## Testing

Basic integration tests are provided in `/tests/onboarding.test.ts`. To run tests:

```bash
npm test -- onboarding
```

## Deployment

1. **Run database migrations** (provided separately)
2. **Set feature flag** if needed: `NEXT_PUBLIC_FEATURE_ONBOARDING=true`
3. **Deploy application** with onboarding endpoints
4. **Verify AI integration** (Gemini API key configured)

## Monitoring

Key metrics to monitor:
- **Onboarding completion rate**
- **AI generation success rate** 
- **Step abandonment points**
- **Media upload success rate**
- **Time to complete onboarding**

## Future Enhancements

- **Progress saving** for partial completions
- **A/B testing** of onboarding flows
- **Advanced AI prompts** based on cuisine types
- **Integration with external services** (Google My Business, etc.)
- **Bulk restaurant onboarding** for enterprise customers
