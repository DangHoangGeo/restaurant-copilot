export interface OrganizationOnboardingAIRequest {
  companyName: string;
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
  "description_vi": "Vietnamese brand introduction, 70-110 words"
}

Guidelines:
- Write for Vietnamese restaurant owners in Japan.
- Keep the tone warm, trustworthy, and operationally realistic.
- Avoid exaggerated marketing clichés.
- Mention hospitality, food quality, and consistency across branches when appropriate.
- Make each language natural, not literal.
`;
}
