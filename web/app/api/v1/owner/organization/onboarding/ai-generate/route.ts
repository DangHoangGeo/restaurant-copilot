import { NextRequest, NextResponse } from 'next/server';
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { createGeminiHelper } from '@/lib/gemini';
import { buildOrganizationOnboardingPrompt } from '@/lib/ai/prompts/organization-onboarding';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sanitizeGeneratedLogoSvg } from '@/lib/utils/branding-assets';

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
      branchName?: string;
      ownerLanguage?: 'en' | 'ja' | 'vi';
      ownerIntro?: string;
      openingHours?: string;
      cuisine?: string;
      city?: string;
      style?: string;
      specialties?: string;
    };

    const companyName = body.companyName?.trim() || ctx!.organization.name;
    if (!companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    const ownerIntro = body.ownerIntro?.trim();
    if (!ownerIntro) {
      return NextResponse.json({ error: 'Owner introduction is required' }, { status: 400 });
    }

    const gemini = createGeminiHelper({
      model: process.env.GEMINI_TEXT_MODEL_FAST,
    });
    const prompt = buildOrganizationOnboardingPrompt({
      companyName,
      branchName: body.branchName?.trim(),
      ownerLanguage: body.ownerLanguage ?? 'vi',
      ownerIntro,
      openingHours: body.openingHours?.trim(),
      cuisine: body.cuisine?.trim(),
      city: body.city?.trim(),
      style: body.style?.trim(),
      specialties: body.specialties?.trim(),
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timed out after 30 seconds')), 30_000)
    );
    const result = await Promise.race([
      gemini.generateContent(prompt, 'organization-onboarding'),
      timeoutPromise,
    ]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      description_en?: string;
      description_ja?: string;
      description_vi?: string;
      brand_color?: string;
      hero_title_en?: string;
      hero_title_ja?: string;
      hero_title_vi?: string;
      hero_subtitle_en?: string;
      hero_subtitle_ja?: string;
      hero_subtitle_vi?: string;
      owner_story_en?: string;
      owner_story_ja?: string;
      owner_story_vi?: string;
      logo_svg?: string;
    };

    let logoUrl: string | null = null;
    const safeLogoSvg = parsed.logo_svg
      ? sanitizeGeneratedLogoSvg(parsed.logo_svg)
      : null;

    if (safeLogoSvg) {
      const svgPath = `organizations/${ctx!.organization.id}/branding/ai_logo_${Date.now()}.svg`;
      const svgBuffer = new Uint8Array(Buffer.from(safeLogoSvg, 'utf8'));
      const { data: uploadedLogo, error: uploadError } = await supabaseAdmin.storage
        .from('restaurant-uploads')
        .upload(svgPath, svgBuffer, {
          contentType: 'image/svg+xml',
          upsert: true,
        });

      if (!uploadError && uploadedLogo) {
        const { data: publicUrl } = supabaseAdmin.storage
          .from('restaurant-uploads')
          .getPublicUrl(uploadedLogo.path);
        logoUrl = publicUrl.publicUrl;
      }
    }

    return NextResponse.json({
      description_en: parsed.description_en ?? '',
      description_ja: parsed.description_ja ?? '',
      description_vi: parsed.description_vi ?? '',
      brand_color: parsed.brand_color ?? '#C45B2D',
      logo_url: logoUrl,
      hero_title_en: parsed.hero_title_en ?? '',
      hero_title_ja: parsed.hero_title_ja ?? '',
      hero_title_vi: parsed.hero_title_vi ?? '',
      hero_subtitle_en: parsed.hero_subtitle_en ?? '',
      hero_subtitle_ja: parsed.hero_subtitle_ja ?? '',
      hero_subtitle_vi: parsed.hero_subtitle_vi ?? '',
      owner_story_en: parsed.owner_story_en ?? '',
      owner_story_ja: parsed.owner_story_ja ?? '',
      owner_story_vi: parsed.owner_story_vi ?? '',
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
      brand_color: '#C45B2D',
      logo_url: null,
      hero_title_en: 'Warm meals, every day',
      hero_title_ja: '毎日に、あたたかい一皿を',
      hero_title_vi: 'Mỗi ngày một bữa ăn ấm áp',
      hero_subtitle_en:
        'Comforting food, steady quality, and a calm place for guests to return to again and again.',
      hero_subtitle_ja:
        'ほっとする料理と安定した品質で、何度でも訪れたくなる落ち着いた食事体験を届けます。',
      hero_subtitle_vi:
        'Món ăn thân thuộc, chất lượng ổn định và một không gian để khách muốn quay lại nhiều lần.',
      owner_story_en:
        'We built this restaurant with the belief that good hospitality comes from consistency, care, and respect for every guest who walks through the door.',
      owner_story_ja:
        'この店は、一人ひとりのお客様を大切にし、丁寧さと安定した品質を積み重ねることが本当のおもてなしにつながるという思いから始まりました。',
      owner_story_vi:
        'Chúng tôi bắt đầu nhà hàng này với niềm tin rằng sự hiếu khách chân thành đến từ tính ổn định, sự chỉn chu và sự tôn trọng dành cho từng vị khách ghé thăm.',
    });
  }
}
