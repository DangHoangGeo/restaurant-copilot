# Owner Onboarding & AI-Assisted Setup Plan

This document outlines a detailed plan to merge the Restaurant Settings and Homepage Management into a single Owner Onboarding flow, enhanced with Gemine AI assistance to generate initial content and configuration.

---

## 1. Current Codebase Overview

**Settings Page**  
Location: `web/app/[locale]/(restaurant)/dashboard/settings/page.tsx`  
Client: `settings-client-content.tsx`, `settings-form.tsx`  
API: `/api/v1/restaurant/settings/route.ts`

**Homepage Management**  
Location: `web/app/[locale]/(restaurant)/dashboard/homepage/page.tsx`  
Client: `homepage-client-content.tsx` + tabs (`GalleryManager`, `OwnerStoryEditor`, `SignatureDishesSelector`, `HomepagePreview`)  
API: `/api/v1/restaurant/owner-story`, `/gallery`, `/signature-dishes` etc.

---

## 2. Merge into Onboarding Flow

### 2.1 New Route & Layout
- Create a new server route: `web/app/[locale]/(restaurant)/dashboard/onboarding/page.tsx`.
- Replace sidebar link `Settings` and `Homepage` with a single `Onboarding` item until setup is complete (tracked via `restaurantSettings.onboarded` flag).
- Client entry: `onboarding-client-content.tsx` hosting a multi-step wizard.

### 2.2 UI Steps
1. **Welcome & Basic Info**  
   - Form fields: Restaurant name, subdomain, default language, brand color.  
   - Upon submit, call AI to generate homepage content.
2. **AI-Generated Homepage Draft**  
   - Display AI draft hero text, owner story, sample signature dishes.  
   - Tabs: Preview + Edit fields inline.
3. **Gallery & Media Upload**  
   - Prompt user to upload logo and hero image.  
   - Allow additional gallery uploads.
4. **Review & Publish**  
   - Final preview with simulated homepage.  
   - Button: "Finish Onboarding" → marks `onboarded=true`, redirects to normal dashboard.

---

## 3. Gemine AI Integration

### 3.1 AI Endpoint
- Create new API: `web/app/api/v1/restaurant/onboarding/ai-generate/route.ts`  
  - Accepts basic info payload.  
  - Calls Gemine AI/OpenAI with prompt templates to generate:
    - Hero headline + subtitle
    - Owner story paragraphs
    - List of 3 signature dishes (name + description)
  - Returns JSON structure.

### 3.2 Prompt Design
```
You are an expert restaurant AI. Given:
- name: {restaurantName}
- cuisine: {cuisineType}
- location: {city}
Generate:
1. Hero title & subtitle (20 words max).
2. Owner story (100 words).
3. Three signature dish names + short descriptions.
```  
Store prompt templates in `web/lib/ai/prompts/onboarding.ts`.

### 3.3 Supabase Edge Function (optional)
- Offload heavy AI calls to an Edge Function (under `infra/functions/`).
- Route calls <code>supabase.functions.invoke('onboarding-generate', { payload })</code>.

---

## 4. Database & Back-End Updates

1. **Add `onboarded` flag** to `restaurants` table (via SQL migration).  
2. **Upsert settings & homepage** in single transaction:
   ```ts
   await supabaseAdmin
     .from('restaurants').upsert({ ...settings })
     .from('homepage').upsert({ owner_story, signature_dishes, hero_text });
   ```
3. **API Route**: `POST /api/v1/restaurant/onboarding/complete`  
   - Body: combined settings + homepage payload.  
   - Validates via Zod.  
   - Marks `onboarded = true`.

---

## 5. Context & State Management

- Extend `RestaurantContext`:
  - Expose `onboardingState` and helper to `refreshSettings()`.
  - In `AdminLayoutClient`, redirect to `/onboarding` if `!settings.onboarded`.

---

## 6. Translation & Content Keys

- New namespace: `owner/onboarding`  
  - File: `web/messages/{en,ja,vi}/owner/onboarding.json`  
  - Keys for each wizard step, buttons, error messages.
- Update `i18n/request.ts` to include `owner/onboarding`.

---

## 7. Testing & Validation

1. **Unit tests** for AI prompt builder functions.  
2. **Integration tests** for onboarding API routes (mock AI responses).  
3. **E2E tests**: simulate a new restaurant signup, complete onboarding flow.

---

## 8. Rollout & Feature Flag

- Wrap onboarding pages behind `FEATURE_FLAGS.onboardingWizard`.  
- Gradually enable for new restaurants only.  
- Provide fallback to legacy Settings & Homepage pages for existing customers.

---

**Next Steps:**
- Create migrations and AI prompt templates.
- Implement UI steps and API endpoints.

### Detailed Step A: Create Migrations & AI Prompt Templates
1. SQL Migration for `onboarded` flag:
   - In `infra/migrations/00XX_add_onboarded_flag.sql`, add a boolean `onboarded` column to `restaurants` (default `false`).
   - Write `DOWN` script to drop the column.
   - Run: `npm run infra:migrate` and verify schema.

2. AI Prompt Templates:
   - Create `web/lib/ai/prompts/onboarding.ts` exporting template functions:
     ```ts
     export function buildOnboardingPrompt(data: { name: string; cuisine: string; city: string }) {
       return `You are an expert restaurant AI. Given:
- name: ${data.name}
- cuisine: ${data.cuisine}
- location: ${data.city}
Generate:\n1. Hero title & subtitle (20 words max).\n2. Owner story (100 words).\n3. Three signature dish names + short descriptions.`;
     }
     ```
   - Add types in `web/shared/types/ai.ts` for AI request/response.
   - Write unit tests under `web/lib/ai/__tests__/onboarding.test.ts` to validate prompt format.

### Detailed Step B: Implement UI Steps & API Endpoints
1. **Onboarding Page & Wizard**:
   - New route file `web/app/[locale]/(restaurant)/dashboard/onboarding/page.tsx` (server component).
   - Client component `onboarding-client-content.tsx` with multi-step `react-step-wizard` or custom state.
   - Steps:
     1. Basic Info Form (`name`, `subdomain`, `default_language`, `brand_color`).
     2. AI Draft Preview & Edit (reuse `OwnerStoryEditor`, `SignatureDishesSelector`, hero text fields).
     3. Media Upload (logo & hero image + gallery manager).
     4. Final Review & Publish.
   - Use `react-hook-form` + Zod for validation in each step.

2. **AI‐Generate API**:
   - Create `web/app/api/v1/restaurant/onboarding/ai-generate/route.ts`.
   - In `POST`, parse body `{ name, cuisine, city }`, call `buildOnboardingPrompt()`, send to OpenAI via `web/lib/ai/client.ts` wrapper.
   - Return parsed JSON with keys: `hero`, `ownerStory`, `signatureDishes`.

3. **Complete Onboarding API**:
   - Create `web/app/api/v1/restaurant/onboarding/complete/route.ts`.
   - In `POST`, validate with Zod schema combining restaurant settings & homepage fields.
   - Transactionally upsert `restaurants` (settings + onboarded=true) and homepage tables (`owner_story`, `signature_dishes`, `hero_text`).
   - Return updated settings.

4. **Context & Redirect**:
   - In `RestaurantContext`, add `onboardingState` (`pending|complete`).
   - After complete, call `refreshSettings()`, detect `onboarded=true`, redirect to `/dashboard/homepage`.

5. **Feature Flag & Translations**:
   - Wrap onboarding routes/components with `FEATURE_FLAGS.onboardingWizard` guard.
   - Add `owner/onboarding.json` translations and include in `i18n/request.ts`.

6. **Testing**:
   - Integration tests for both new API routes (mock OpenAI, mock Supabase).
   - E2E test via Cypress to run through wizard.

---

> Once all pieces are in place, run end-to-end locally: 
> ```bash
> npm run dev:web && npm run infra:migrate && npm test
> ```
