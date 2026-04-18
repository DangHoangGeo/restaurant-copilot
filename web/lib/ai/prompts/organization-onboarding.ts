export interface OrganizationOnboardingAIRequest {
  companyName: string;
  branchName?: string;
  ownerLanguage: 'en' | 'ja' | 'vi';
  ownerIntro: string;
  openingHours?: string;
  cuisine?: string;
  city?: string;
  style?: string;
  specialties?: string;
}

export function buildOrganizationOnboardingPrompt(
  data: OrganizationOnboardingAIRequest
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
    .join('\n');

  return `
You are helping a restaurant founder in Japan prepare calm, trustworthy homepage copy for a new restaurant company.

Business context:
${contextInfo}

Return valid JSON only in this exact shape:
{
  "description_en": "English brand introduction, 70-110 words",
  "description_ja": "Japanese brand introduction, 70-110 words",
  "description_vi": "Vietnamese brand introduction, 70-110 words",
  "brand_color": "#RRGGBB",
  "hero_title_en": "Short English homepage headline, 4-8 words",
  "hero_title_ja": "Short Japanese homepage headline, 4-8 words",
  "hero_title_vi": "Short Vietnamese homepage headline, 4-8 words",
  "hero_subtitle_en": "English homepage subtitle, 12-24 words",
  "hero_subtitle_ja": "Japanese homepage subtitle, 12-24 words",
  "hero_subtitle_vi": "Vietnamese homepage subtitle, 12-24 words",
  "owner_story_en": "English founder story, 60-120 words",
  "owner_story_ja": "Japanese founder story, 60-120 words",
  "owner_story_vi": "Vietnamese founder story, 60-120 words",
  "logo_svg": "<svg ...>...</svg>"
}

Guidelines:
- Write for Vietnamese restaurant owners in Japan.
- Keep the tone warm, trustworthy, and operationally realistic.
- Avoid exaggerated marketing clichés.
- Mention hospitality, food quality, and consistency across branches when appropriate.
- Make each language natural, not literal.
- The hero copy should feel clean and premium, not noisy.
- The owner story should sound human and grounded in daily restaurant work.
- Pick one calm, memorable brand color that fits a Japan-based restaurant business.
- The logo SVG must be simple, elegant, and production-safe:
  - valid standalone SVG only
  - no scripts
  - no external assets
  - use the company or branch initials if helpful
  - work on light backgrounds
`;
}
