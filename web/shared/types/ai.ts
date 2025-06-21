/**
 * AI-related types for the restaurant management system
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

export interface AIGenerationError {
  message: string;
  code?: string;
  details?: string;
}
