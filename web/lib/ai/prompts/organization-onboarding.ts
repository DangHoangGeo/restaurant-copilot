export interface OrganizationOnboardingAIRequest {
  companyName: string;
  branchName?: string;
  ownerLanguage: "en" | "ja" | "vi";
  ownerIntro: string;
  openingHours?: string;
  cuisine?: string;
  city?: string;
  style?: string;
  specialties?: string;
}

export function buildOrganizationOnboardingPrompt(
  data: OrganizationOnboardingAIRequest,
): string {
  const contextInfo = [
    `Company Name: ${data.companyName}`,
    data.branchName ? `Starter Branch Name: ${data.branchName}` : null,
    `Owner Language: ${data.ownerLanguage}`,
    `Owner Intro: ${data.ownerIntro}`,
    data.openingHours ? `Opening Hours: ${data.openingHours}` : null,
    data.cuisine ? `Cuisine Focus: ${data.cuisine}` : null,
    data.city ? `Primary City: ${data.city}` : null,
    data.style ? `Brand Style: ${data.style}` : null,
    data.specialties ? `Specialties: ${data.specialties}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `
You are helping a restaurant founder in Japan prepare calm, trustworthy brand foundations for a new restaurant company.

Business context:
${contextInfo}

Return valid JSON only in this exact shape:
{
  "description_en": "English brand introduction, 70-110 words",
  "description_ja": "Japanese brand introduction, 70-110 words",
  "description_vi": "Vietnamese brand introduction, 70-110 words",
  "hero_title_en": "Short English homepage headline, 4-8 words",
  "hero_title_ja": "Short Japanese homepage headline, 4-8 words",
  "hero_title_vi": "Short Vietnamese homepage headline, 4-8 words",
  "hero_subtitle_en": "English homepage subtitle, 12-24 words",
  "hero_subtitle_ja": "Japanese homepage subtitle, 12-24 words",
  "hero_subtitle_vi": "Vietnamese homepage subtitle, 12-24 words",
  "owner_story_en": "English founder story, 60-120 words",
  "owner_story_ja": "Japanese founder story, 60-120 words",
  "owner_story_vi": "Vietnamese founder story, 60-120 words",
  "brand_options": [
    {
      "name": "Short concept name",
      "summary": "One-sentence explanation of the direction",
      "brand_color": "#RRGGBB",
      "accent_color": "#RRGGBB",
      "color_reason": "Why these colors fit the provided customer context",
      "logo_prompt": "Concrete image-generation prompt for a simple square logo mark"
    },
    {
      "name": "Short concept name",
      "summary": "One-sentence explanation of the direction",
      "brand_color": "#RRGGBB",
      "accent_color": "#RRGGBB",
      "color_reason": "Why these colors fit the provided customer context",
      "logo_prompt": "Concrete image-generation prompt for a simple square logo mark"
    },
    {
      "name": "Short concept name",
      "summary": "One-sentence explanation of the direction",
      "brand_color": "#RRGGBB",
      "accent_color": "#RRGGBB",
      "color_reason": "Why these colors fit the provided customer context",
      "logo_prompt": "Concrete image-generation prompt for a simple square logo mark"
    }
  ],
  "food_category_suggestions": [
    {
      "name_en": "Context-specific English category",
      "name_ja": "Natural Japanese category",
      "name_vi": "Natural Vietnamese category",
      "kind": "basic"
    },
    {
      "name_en": "Context-specific English category",
      "name_ja": "Natural Japanese category",
      "name_vi": "Natural Vietnamese category",
      "kind": "specialty"
    }
  ]
}

Guidelines:
- Write for Vietnamese restaurant owners in Japan.
- Keep the tone warm, trustworthy, and operationally realistic.
- Avoid exaggerated marketing clichés.
- Mention hospitality, food quality, and consistency across branches when appropriate.
- Make each language natural, not literal.
- The hero copy should feel clean and premium, not noisy.
- The owner story should sound human and grounded in daily restaurant work.
- Return exactly 3 brand options that feel distinct but still calm and practical.
- For each brand option, explain why the primary and accent color fit the customer's own context.
- Choose restaurant-safe colors only:
  - primary color must be medium-dark enough for readable customer-facing buttons
  - accent color must be softer and used as a supporting tint, not a second loud brand color
  - avoid pure black, pure white, neon colors, generic blue SaaS palettes, and purple AI gradients
  - prefer warm food, ingredient, wood, herb, tea, clay, charcoal, rice, or muted hospitality tones
- For each brand option, write a logo_prompt for Gemini Image:
  - generate a simple square restaurant logo mark, not a full poster
  - no readable words, no small text, no address, no phone number
  - use the company or branch initials only if the initials are simple and likely to render cleanly
  - include the brand_color and accent_color as the intended palette
  - work on light backgrounds and small mobile UI
- Use one primary brand color and one accent color for each option.
- The category list must be based on the provided owner intro, cuisine, city, style, specialties, and opening hours.
- Return 5-8 reusable company-level menu categories.
- Do not use generic categories like Starters, Main dishes, Drinks, or Desserts unless the customer's information specifically supports them.
- Prefer concrete categories customers would recognize from this restaurant, such as pho, banh mi, grilled dishes, lunch sets, family sets, coffee, late-night bowls, seasonal specials, or similar context-specific groupings.
- Keep categories reusable at the company level so future branches can inherit them first.
`;
}
