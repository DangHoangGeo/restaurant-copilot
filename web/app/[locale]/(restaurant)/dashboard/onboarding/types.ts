// Shared types for the onboarding flow

export interface OnboardingData {
  // Basic info
  name: string;
  subdomain: string;
  default_language: 'en' | 'ja' | 'vi';
  brand_color: string;
  contact_info?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  
  // AI generated content
  hero_title?: string;
  hero_subtitle?: string;
  owner_story_en?: string;
  owner_story_ja?: string;
  owner_story_vi?: string;
  signature_dishes?: Array<{
    name_en: string;
    name_ja?: string;
    name_vi?: string;
    description_en?: string;
    description_ja?: string;
    description_vi?: string;
    price: number;
  }>;
  
  // Media uploads
  logo_url?: string;
  hero_image_url?: string;
  owner_photo_url?: string;
  gallery_images?: string[];
}

export interface StepProps {
  data: OnboardingData;
  onUpdate: (updates: Partial<OnboardingData>) => void;
}

export interface BasicInfoStepProps extends StepProps {
  onNext: () => void;
  locale: string;
}

export interface AIGenerationStepProps extends StepProps {
  onNext: () => void;
  onBack: () => void;
}

export interface MediaUploadStepProps extends StepProps {
  onNext: () => void;
  onBack: () => void;
}

export interface ReviewStepProps extends StepProps {
  onComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
}
