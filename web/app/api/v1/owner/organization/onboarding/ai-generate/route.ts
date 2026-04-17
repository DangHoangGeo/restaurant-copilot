import { NextRequest, NextResponse } from 'next/server';
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { createGeminiHelper } from '@/lib/gemini';
import { buildOrganizationOnboardingPrompt } from '@/lib/ai/prompts/organization-onboarding';
import { resolveOrgContext } from '@/lib/server/organizations/service';

export async function POST(request: NextRequest) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canChangeOrgSettings()) {
    return forbidden('Requires organization_settings permission');
  }

  try {
    const body = (await request.json()) as {
      companyName?: string;
      cuisine?: string;
      city?: string;
      style?: string;
      specialties?: string;
    };

    const companyName = body.companyName?.trim() || ctx!.organization.name;
    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }

    const gemini = createGeminiHelper();
    const prompt = buildOrganizationOnboardingPrompt({
      companyName,
      cuisine: body.cuisine?.trim(),
      city: body.city?.trim(),
      style: body.style?.trim(),
      specialties: body.specialties?.trim(),
    });

    const result = await gemini.generateContent(prompt, 'organization-onboarding');
    const jsonMatch = result.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      description_en?: string;
      description_ja?: string;
      description_vi?: string;
    };

    return NextResponse.json({
      description_en: parsed.description_en ?? '',
      description_ja: parsed.description_ja ?? '',
      description_vi: parsed.description_vi ?? '',
    });
  } catch (error) {
    console.error('Organization onboarding AI generation failed:', error);

    return NextResponse.json({
      description_en:
        'We run our restaurants with care, consistent quality, and warm hospitality so every guest feels comfortable from the first visit.',
      description_ja:
        '私たちは、安定した品質とあたたかいおもてなしを大切にし、どの店舗でも安心して食事を楽しめる体験を届けます。',
      description_vi:
        'Chúng tôi vận hành nhà hàng với sự chỉn chu, chất lượng ổn định và sự hiếu khách ấm áp để mỗi thực khách đều cảm thấy yên tâm ngay từ lần đầu ghé thăm.',
    });
  }
}
