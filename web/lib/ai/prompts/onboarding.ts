/**
 * AI Prompt Templates for Owner Onboarding
 * 
 * Contains Gemini AI prompt templates to generate initial restaurant content
 * during the onboarding flow.
 */

export interface OnboardingAIRequest {
  name: string;
  cuisine?: string;
  city?: string;
  style?: string;
  specialties?: string;
}

export interface OnboardingAIResponse {
  hero: {
    title: string;
    subtitle: string;
  };
  ownerStory: {
    story_en: string;
    story_ja: string;
    story_vi: string;
  };
  signatureDishes: Array<{
    name_en: string;
    name_ja: string;
    name_vi: string;
    description_en: string;
    description_ja: string;
    description_vi: string;
  }>;
}

/**
 * Build prompt for generating onboarding content
 */
export function buildOnboardingPrompt(data: OnboardingAIRequest): string {
  const contextInfo = [
    `Restaurant Name: ${data.name}`,
    data.cuisine && `Cuisine Type: ${data.cuisine}`,
    data.city && `Location: ${data.city}`,
    data.style && `Style/Atmosphere: ${data.style}`,
    data.specialties && `Specialties: ${data.specialties}`
  ].filter(Boolean).join('\n');

  return `
You are a professional restaurant marketing expert helping a new restaurant owner create their initial homepage content.

Restaurant Information:
${contextInfo}

Please generate comprehensive onboarding content in this exact JSON format:

{
  "hero": {
    "title": "Catchy restaurant name or tagline (8 words max)",
    "subtitle": "Brief compelling description (15 words max)"
  },
  "ownerStory": {
    "story_en": "Personal owner story in English (80-120 words)",
    "story_ja": "Personal owner story in Japanese (80-120 words)",
    "story_vi": "Personal owner story in Vietnamese (80-120 words)"
  },
  "signatureDishes": [
    {
      "name_en": "English dish name",
      "name_ja": "Japanese dish name",
      "name_vi": "Vietnamese dish name", 
      "description_en": "English description (20-30 words)",
      "description_ja": "Japanese description (20-30 words)",
      "description_vi": "Vietnamese description (20-30 words)"
    }
  ]
}

Guidelines:
- Hero title should be memorable and appetizing
- Hero subtitle should highlight what makes this restaurant special
- Owner story should be warm, personal, and authentic
- Owner story should mention passion for food and hospitality
- Generate 3 signature dishes based on the cuisine type
- Dish names should sound appetizing and authentic to the cuisine
- Descriptions should highlight key ingredients and preparation
- All content should feel authentic and not generic
- Use proper cultural language for each market
- Make the content restaurant-specific, not template-like
`;
}

/**
 * Validate the AI response structure
 */
export function validateOnboardingResponse(response: OnboardingAIResponse): response is OnboardingAIResponse {
  return (
    response &&
    typeof response === 'object' &&
    response.hero &&
    typeof response.hero.title === 'string' &&
    typeof response.hero.subtitle === 'string' &&
    response.ownerStory &&
    typeof response.ownerStory.story_en === 'string' &&
    typeof response.ownerStory.story_ja === 'string' &&
    typeof response.ownerStory.story_vi === 'string' &&
    Array.isArray(response.signatureDishes) &&
    response.signatureDishes.length >= 2 &&
    response.signatureDishes.length <= 4 &&
    response.signatureDishes.every((dish) =>
      dish &&
      typeof dish.name_en === 'string' &&
      typeof dish.name_ja === 'string' &&
      typeof dish.name_vi === 'string' &&
      typeof dish.description_en === 'string' &&
      typeof dish.description_ja === 'string' &&
      typeof dish.description_vi === 'string'
    )
  );
}
