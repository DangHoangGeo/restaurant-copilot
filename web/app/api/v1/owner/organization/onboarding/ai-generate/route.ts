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

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{6})$/;

const FALLBACK_BRAND_PALETTES = [
  {
    name: 'Warm hearth',
    summary: 'A steady, welcoming direction for everyday comfort food.',
    brand_color: '#B65A2E',
    accent_color: '#F4D7B8',
  },
  {
    name: 'Market green',
    summary: 'A fresh, ingredient-led look for balanced menus and daily specials.',
    brand_color: '#4E6F52',
    accent_color: '#DDE7D2',
  },
  {
    name: 'Midnight service',
    summary: 'A more refined option for brands that want a clean premium feel.',
    brand_color: '#2E4057',
    accent_color: '#D9C7A2',
  },
] as const;

const FALLBACK_CATEGORY_SUGGESTIONS = [
  { name_en: 'Starters', name_ja: '前菜', name_vi: 'Món khai vị', kind: 'basic' },
  { name_en: 'Main dishes', name_ja: 'メイン', name_vi: 'Món chính', kind: 'basic' },
  { name_en: 'Drinks', name_ja: 'ドリンク', name_vi: 'Đồ uống', kind: 'basic' },
  { name_en: 'Desserts', name_ja: 'デザート', name_vi: 'Món tráng miệng', kind: 'basic' },
  { name_en: 'House specials', name_ja: 'おすすめ', name_vi: 'Món nổi bật', kind: 'specialty' },
  { name_en: 'Seasonal dishes', name_ja: '季節限定', name_vi: 'Món theo mùa', kind: 'specialty' },
] as const;

type BrandOption = {
  id: string;
  name: string;
  summary: string;
  brand_color: string;
  accent_color: string;
  logo_url: string | null;
};

type FoodCategorySuggestion = {
  name_en: string;
  name_ja: string;
  name_vi: string;
  kind: 'basic' | 'specialty';
};

function normalizeHexColor(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && HEX_COLOR_RE.test(trimmed) ? trimmed : fallback;
}

function normalizeCategoryKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function getCompanyInitials(companyName: string) {
  const parts = companyName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return 'R';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'R';
}

function buildFallbackLogoSvg(params: {
  initials: string;
  brandColor: string;
  accentColor: string;
  variant: number;
}) {
  const { initials, brandColor, accentColor, variant } = params;

  if (variant === 1) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
        <rect width="240" height="240" rx="56" fill="#FFF9F3"/>
        <rect x="34" y="34" width="172" height="172" rx="42" fill="${brandColor}" opacity="0.14"/>
        <circle cx="120" cy="120" r="58" fill="${brandColor}"/>
        <circle cx="120" cy="120" r="40" fill="${accentColor}" opacity="0.28"/>
        <text x="120" y="134" text-anchor="middle" font-family="Arial, sans-serif" font-size="54" font-weight="700" fill="#FFF9F3">${initials}</text>
      </svg>
    `;
  }

  if (variant === 2) {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
        <rect width="240" height="240" rx="56" fill="#F8F7F3"/>
        <path d="M48 154C48 105.399 87.399 66 136 66H192V174H48V154Z" fill="${brandColor}"/>
        <path d="M48 174H154C154 130.922 119.078 96 76 96H48V174Z" fill="${accentColor}"/>
        <text x="120" y="146" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#1F1F1A">${initials}</text>
      </svg>
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" fill="none">
      <rect width="240" height="240" rx="56" fill="#F7F4EE"/>
      <rect x="38" y="58" width="164" height="124" rx="34" fill="${brandColor}"/>
      <path d="M58 162C86 137.333 112.667 125 138 125C156.667 125 174.667 131 192 143V182H58V162Z" fill="${accentColor}" opacity="0.88"/>
      <text x="120" y="132" text-anchor="middle" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="#FFFDF8">${initials}</text>
    </svg>
  `;
}

async function uploadLogoSvg(params: {
  organizationId: string;
  svg: string;
  fileName: string;
}) {
  const safeLogoSvg = sanitizeGeneratedLogoSvg(params.svg);
  if (!safeLogoSvg) {
    return null;
  }

  const svgPath = `organizations/${params.organizationId}/branding/${params.fileName}`;
  const svgBuffer = new Uint8Array(Buffer.from(safeLogoSvg, 'utf8'));
  const { data: uploadedLogo, error: uploadError } = await supabaseAdmin.storage
    .from('restaurant-uploads')
    .upload(svgPath, svgBuffer, {
      contentType: 'image/svg+xml',
      upsert: true,
    });

  if (uploadError || !uploadedLogo) {
    return null;
  }

  const { data: publicUrl } = supabaseAdmin.storage
    .from('restaurant-uploads')
    .getPublicUrl(uploadedLogo.path);

  return publicUrl.publicUrl;
}

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
      hero_title_en?: string;
      hero_title_ja?: string;
      hero_title_vi?: string;
      hero_subtitle_en?: string;
      hero_subtitle_ja?: string;
      hero_subtitle_vi?: string;
      owner_story_en?: string;
      owner_story_ja?: string;
      owner_story_vi?: string;
      brand_options?: Array<{
        name?: string;
        summary?: string;
        brand_color?: string;
        accent_color?: string;
        logo_svg?: string;
      }>;
      food_category_suggestions?: Array<{
        name_en?: string;
        name_ja?: string;
        name_vi?: string;
        kind?: string;
      }>;
    };

    const initials = getCompanyInitials(companyName);
    const rawBrandOptions = Array.isArray(parsed.brand_options)
      ? parsed.brand_options
      : [];

    const brandOptions: BrandOption[] = [];
    for (let index = 0; index < 3; index += 1) {
      const fallback = FALLBACK_BRAND_PALETTES[index];
      const rawOption = rawBrandOptions[index];
      const brandColor = normalizeHexColor(rawOption?.brand_color, fallback.brand_color);
      const accentColor = normalizeHexColor(rawOption?.accent_color, fallback.accent_color);
      const logoSvg =
        rawOption?.logo_svg?.trim() ||
        buildFallbackLogoSvg({
          initials,
          brandColor,
          accentColor,
          variant: index + 1,
        });

      const logoUrl = await uploadLogoSvg({
        organizationId: ctx!.organization.id,
        svg: logoSvg,
        fileName: `ai_logo_option_${index + 1}_${Date.now()}.svg`,
      });

      brandOptions.push({
        id: `option-${index + 1}`,
        name: rawOption?.name?.trim() || fallback.name,
        summary: rawOption?.summary?.trim() || fallback.summary,
        brand_color: brandColor,
        accent_color: accentColor,
        logo_url: logoUrl,
      });
    }

    const categorySuggestions: FoodCategorySuggestion[] = [];
    const usedCategoryKeys = new Set<string>();
    const rawCategorySuggestions = Array.isArray(parsed.food_category_suggestions)
      ? parsed.food_category_suggestions
      : [];

    const addCategory = (category: {
      name_en?: string | null;
      name_ja?: string | null;
      name_vi?: string | null;
      kind?: string | null;
    }) => {
      const nameEn = category.name_en?.trim();
      if (!nameEn) return;

      const key = normalizeCategoryKey(nameEn);
      if (!key || usedCategoryKeys.has(key)) {
        return;
      }

      usedCategoryKeys.add(key);
      categorySuggestions.push({
        name_en: nameEn,
        name_ja: category.name_ja?.trim() || nameEn,
        name_vi: category.name_vi?.trim() || nameEn,
        kind: category.kind === 'specialty' ? 'specialty' : 'basic',
      });
    };

    FALLBACK_CATEGORY_SUGGESTIONS.forEach(addCategory);
    rawCategorySuggestions.forEach(addCategory);

    return NextResponse.json({
      description_en: parsed.description_en ?? '',
      description_ja: parsed.description_ja ?? '',
      description_vi: parsed.description_vi ?? '',
      hero_title_en: parsed.hero_title_en ?? '',
      hero_title_ja: parsed.hero_title_ja ?? '',
      hero_title_vi: parsed.hero_title_vi ?? '',
      hero_subtitle_en: parsed.hero_subtitle_en ?? '',
      hero_subtitle_ja: parsed.hero_subtitle_ja ?? '',
      hero_subtitle_vi: parsed.hero_subtitle_vi ?? '',
      owner_story_en: parsed.owner_story_en ?? '',
      owner_story_ja: parsed.owner_story_ja ?? '',
      owner_story_vi: parsed.owner_story_vi ?? '',
      brand_options: brandOptions,
      brand_color: brandOptions[0]?.brand_color ?? FALLBACK_BRAND_PALETTES[0].brand_color,
      logo_url: brandOptions[0]?.logo_url ?? null,
      food_category_suggestions: categorySuggestions,
    });
  } catch (error) {
    console.error('Organization onboarding AI generation failed:', error);

    const fallbackInitials = getCompanyInitials('Restaurant');
    const fallbackBrandOptions: BrandOption[] = [];

    for (let index = 0; index < FALLBACK_BRAND_PALETTES.length; index += 1) {
      const palette = FALLBACK_BRAND_PALETTES[index];
      const logoUrl = await uploadLogoSvg({
        organizationId: ctx!.organization.id,
        svg: buildFallbackLogoSvg({
          initials: fallbackInitials,
          brandColor: palette.brand_color,
          accentColor: palette.accent_color,
          variant: index + 1,
        }),
        fileName: `fallback_ai_logo_option_${index + 1}_${Date.now()}.svg`,
      });

      fallbackBrandOptions.push({
        id: `option-${index + 1}`,
        name: palette.name,
        summary: palette.summary,
        brand_color: palette.brand_color,
        accent_color: palette.accent_color,
        logo_url: logoUrl,
      });
    }

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
      brand_options: fallbackBrandOptions,
      logo_url: fallbackBrandOptions[0]?.logo_url ?? null,
      food_category_suggestions: FALLBACK_CATEGORY_SUGGESTIONS,
    });
  }
}
