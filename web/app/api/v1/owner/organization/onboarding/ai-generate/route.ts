import { NextRequest, NextResponse } from "next/server";
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from "@/lib/server/authorization/service";
import {
  createGeminiHelper,
  createGeminiImageHelper,
  type GeminiHelper,
} from "@/lib/gemini";
import { buildOrganizationOnboardingPrompt } from "@/lib/ai/prompts/organization-onboarding";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeGeneratedLogoSvg } from "@/lib/utils/branding-assets";

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{6})$/;
const MAX_LOGO_IMAGE_BYTES = 5 * 1024 * 1024;
const LOGO_IMAGE_TIMEOUT_MS = 35_000;

const FALLBACK_BRAND_PALETTES = [
  {
    name: "Warm hearth",
    summary: "A steady, welcoming direction for everyday comfort food.",
    brand_color: "#B65A2E",
    accent_color: "#F4D7B8",
    color_reason:
      "Warm clay and cream tones fit a welcoming restaurant brand built around comfort and daily hospitality.",
  },
  {
    name: "Market green",
    summary:
      "A fresh, ingredient-led look for balanced menus and daily specials.",
    brand_color: "#4E6F52",
    accent_color: "#DDE7D2",
    color_reason:
      "Fresh green tones work well when the founder wants the brand to feel ingredient-led and calm.",
  },
  {
    name: "Midnight service",
    summary: "A more refined option for brands that want a clean premium feel.",
    brand_color: "#2E4057",
    accent_color: "#D9C7A2",
    color_reason:
      "Deep blue with a soft gold accent creates a more polished evening-service feel.",
  },
] as const;

const DEFAULT_CONTEXTUAL_CATEGORY_SUGGESTIONS = [
  {
    name_en: "House favorites",
    name_ja: "お店のおすすめ",
    name_vi: "Món được yêu thích",
    kind: "specialty",
  },
  {
    name_en: "Daily meals",
    name_ja: "日替わりごはん",
    name_vi: "Bữa ăn hằng ngày",
    kind: "basic",
  },
  {
    name_en: "Family sets",
    name_ja: "ファミリーセット",
    name_vi: "Set gia đình",
    kind: "basic",
  },
  {
    name_en: "Seasonal specials",
    name_ja: "季節のおすすめ",
    name_vi: "Món theo mùa",
    kind: "specialty",
  },
  {
    name_en: "Drinks for the table",
    name_ja: "テーブルドリンク",
    name_vi: "Đồ uống dùng chung",
    kind: "basic",
  },
] as const;

type BrandOption = {
  id: string;
  name: string;
  summary: string;
  brand_color: string;
  accent_color: string;
  color_reason: string;
  logo_url: string | null;
};

type FoodCategorySuggestion = {
  name_en: string;
  name_ja: string;
  name_vi: string;
  kind: "basic" | "specialty";
};

function normalizeHexColor(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && HEX_COLOR_RE.test(trimmed) ? trimmed : fallback;
}

function normalizeCategoryKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function getCompanyInitials(companyName: string) {
  const parts = companyName.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (parts.length === 0) return "R";
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "R";
}

function buildContextualFallbackCategories(context: {
  ownerIntro?: string;
  cuisine?: string;
  specialties?: string;
}): FoodCategorySuggestion[] {
  const text = [context.ownerIntro, context.cuisine, context.specialties]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(phở|pho|bún|bun|bánh mì|banh mi|vietnam|việt|viet)/i.test(text)) {
    return [
      {
        name_en: "Pho bowls",
        name_ja: "フォー",
        name_vi: "Phở",
        kind: "basic",
      },
      {
        name_en: "Banh mi",
        name_ja: "バインミー",
        name_vi: "Bánh mì",
        kind: "basic",
      },
      {
        name_en: "Rice plates",
        name_ja: "ご飯プレート",
        name_vi: "Cơm phần",
        kind: "basic",
      },
      {
        name_en: "Fresh rolls",
        name_ja: "生春巻き",
        name_vi: "Gỏi cuốn",
        kind: "specialty",
      },
      {
        name_en: "Vietnamese coffee",
        name_ja: "ベトナムコーヒー",
        name_vi: "Cà phê Việt Nam",
        kind: "specialty",
      },
    ];
  }

  if (
    /(ramen|ラーメン|sushi|寿司|izakaya|居酒屋|yakitori|焼き鳥|japan|japanese)/i.test(
      text,
    )
  ) {
    return [
      {
        name_en: "Ramen bowls",
        name_ja: "ラーメン",
        name_vi: "Mì ramen",
        kind: "basic",
      },
      {
        name_en: "Small plates",
        name_ja: "小皿料理",
        name_vi: "Món nhỏ",
        kind: "basic",
      },
      {
        name_en: "Grilled skewers",
        name_ja: "焼き物",
        name_vi: "Xiên nướng",
        kind: "specialty",
      },
      {
        name_en: "Rice sets",
        name_ja: "定食",
        name_vi: "Set cơm",
        kind: "basic",
      },
      {
        name_en: "Seasonal specials",
        name_ja: "季節のおすすめ",
        name_vi: "Món theo mùa",
        kind: "specialty",
      },
    ];
  }

  if (/(coffee|cafe|café|bakery|bread|pastry|cake|dessert)/i.test(text)) {
    return [
      {
        name_en: "Coffee bar",
        name_ja: "コーヒー",
        name_vi: "Cà phê",
        kind: "basic",
      },
      {
        name_en: "Fresh bakery",
        name_ja: "焼きたてパン",
        name_vi: "Bánh mới nướng",
        kind: "basic",
      },
      {
        name_en: "Light meals",
        name_ja: "軽食",
        name_vi: "Món nhẹ",
        kind: "basic",
      },
      {
        name_en: "Signature sweets",
        name_ja: "おすすめスイーツ",
        name_vi: "Món ngọt nổi bật",
        kind: "specialty",
      },
      {
        name_en: "Seasonal drinks",
        name_ja: "季節のドリンク",
        name_vi: "Đồ uống theo mùa",
        kind: "specialty",
      },
    ];
  }

  return DEFAULT_CONTEXTUAL_CATEGORY_SUGGESTIONS.map((category) => ({
    name_en: category.name_en,
    name_ja: category.name_ja,
    name_vi: category.name_vi,
    kind: category.kind,
  }));
}

function getLogoImageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function buildLogoPrompt(params: {
  companyName: string;
  branchName?: string;
  ownerIntro: string;
  optionName: string;
  summary: string;
  brandColor: string;
  accentColor: string;
  rawPrompt?: string;
}) {
  const rawPrompt = params.rawPrompt?.trim();
  if (rawPrompt) {
    return `${rawPrompt}

Brand context:
- Company: ${params.companyName}
${params.branchName ? `- Starter branch: ${params.branchName}` : ""}
- Founder/customer context: ${params.ownerIntro}
- Primary color: ${params.brandColor}
- Accent color: ${params.accentColor}

Output requirements: square 1:1 logo mark, centered, clean restaurant identity, no readable words, no small text, no watermark, no mockup, no poster, light background.`;
  }

  return `Generate a unique square 1:1 logo mark for a restaurant brand.
Company: ${params.companyName}
${params.branchName ? `Starter branch: ${params.branchName}` : ""}
Brand direction: ${params.optionName}
Direction summary: ${params.summary}
Founder/customer context: ${params.ownerIntro}
Use this palette: primary ${params.brandColor}, accent ${params.accentColor}.
Style: simple premium restaurant logo, memorable icon, clean geometry, warm hospitality, works as a small app/logo avatar.
Avoid: readable words, small text, phone numbers, addresses, menu layouts, mockups, photorealistic storefronts, watermarks.`;
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
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
  const svgBuffer = new Uint8Array(Buffer.from(safeLogoSvg, "utf8"));
  const { data: uploadedLogo, error: uploadError } = await supabaseAdmin.storage
    .from("restaurant-uploads")
    .upload(svgPath, svgBuffer, {
      contentType: "image/svg+xml",
      upsert: true,
    });

  if (uploadError || !uploadedLogo) {
    return null;
  }

  const { data: publicUrl } = supabaseAdmin.storage
    .from("restaurant-uploads")
    .getPublicUrl(uploadedLogo.path);

  return publicUrl.publicUrl;
}

async function uploadLogoImage(params: {
  organizationId: string;
  imageBase64: string;
  mimeType: string;
  fileNameBase: string;
}) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(params.mimeType)) {
    return null;
  }

  const imageBuffer = Buffer.from(params.imageBase64, "base64");
  if (
    imageBuffer.byteLength === 0 ||
    imageBuffer.byteLength > MAX_LOGO_IMAGE_BYTES
  ) {
    return null;
  }

  const extension = getLogoImageExtension(params.mimeType);
  const imagePath = `organizations/${params.organizationId}/branding/${params.fileNameBase}.${extension}`;
  const { data: uploadedLogo, error: uploadError } = await supabaseAdmin.storage
    .from("restaurant-uploads")
    .upload(imagePath, new Uint8Array(imageBuffer), {
      contentType: params.mimeType,
      upsert: true,
    });

  if (uploadError || !uploadedLogo) {
    return null;
  }

  const { data: publicUrl } = supabaseAdmin.storage
    .from("restaurant-uploads")
    .getPublicUrl(uploadedLogo.path);

  return publicUrl.publicUrl;
}

export async function POST(request: NextRequest) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canChangeOrgSettings()) {
    return forbidden("Requires organization_settings permission");
  }

  let fallbackContext: {
    companyName: string;
    branchName?: string;
    ownerIntro: string;
    cuisine?: string;
    specialties?: string;
  } = {
    companyName: ctx!.organization.name || "Restaurant",
    ownerIntro: "",
  };

  try {
    const body = (await request.json()) as {
      companyName?: string;
      branchName?: string;
      ownerLanguage?: "en" | "ja" | "vi";
      ownerIntro?: string;
      openingHours?: string;
      cuisine?: string;
      city?: string;
      style?: string;
      specialties?: string;
    };

    const companyName = body.companyName?.trim() || ctx!.organization.name;
    if (!companyName) {
      return NextResponse.json(
        { error: "Company name is required" },
        { status: 400 },
      );
    }
    const ownerIntro = body.ownerIntro?.trim();
    if (!ownerIntro) {
      return NextResponse.json(
        { error: "Owner introduction is required" },
        { status: 400 },
      );
    }
    const branchName = body.branchName?.trim();
    const cuisine = body.cuisine?.trim();
    const specialties = body.specialties?.trim();
    fallbackContext = {
      companyName,
      branchName,
      ownerIntro,
      cuisine,
      specialties,
    };

    const gemini = createGeminiHelper({
      model: process.env.GEMINI_TEXT_MODEL_FAST,
    });
    const prompt = buildOrganizationOnboardingPrompt({
      companyName,
      branchName,
      ownerLanguage: body.ownerLanguage ?? "vi",
      ownerIntro,
      openingHours: body.openingHours?.trim(),
      cuisine,
      city: body.city?.trim(),
      style: body.style?.trim(),
      specialties,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("AI generation timed out after 30 seconds")),
        30_000,
      ),
    );
    const result = await Promise.race([
      gemini.generateContent(prompt, "organization-onboarding"),
      timeoutPromise,
    ]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No valid JSON found in AI response");
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
        color_reason?: string;
        logo_prompt?: string;
      }>;
      food_category_suggestions?: Array<{
        name_en?: string;
        name_ja?: string;
        name_vi?: string;
        kind?: string;
      }>;
    };

    const initials = getCompanyInitials(companyName);
    let imageGemini: GeminiHelper | null = null;
    try {
      imageGemini = createGeminiImageHelper({
        model: process.env.NEXT_PUBLIC_GEMINI_IMAGE_MODEL,
      });
    } catch (error) {
      console.warn(
        "Gemini image model is not configured; using fallback logo marks:",
        error,
      );
    }

    const rawBrandOptions = Array.isArray(parsed.brand_options)
      ? parsed.brand_options
      : [];

    const brandOptions = await Promise.all(
      Array.from({ length: 3 }, async (_, index): Promise<BrandOption> => {
        const fallback = FALLBACK_BRAND_PALETTES[index];
        const rawOption = rawBrandOptions[index];
        const brandColor = normalizeHexColor(
          rawOption?.brand_color,
          fallback.brand_color,
        );
        const accentColor = normalizeHexColor(
          rawOption?.accent_color,
          fallback.accent_color,
        );
        const optionName = rawOption?.name?.trim() || fallback.name;
        const summary = rawOption?.summary?.trim() || fallback.summary;
        const colorReason =
          rawOption?.color_reason?.trim() || fallback.color_reason;
        let logoUrl: string | null = null;

        if (imageGemini) {
          try {
            const image = await withTimeout(
              imageGemini.generateImage(
                buildLogoPrompt({
                  companyName,
                  branchName,
                  ownerIntro,
                  optionName,
                  summary,
                  brandColor,
                  accentColor,
                  rawPrompt: rawOption?.logo_prompt,
                }),
                "organization-onboarding-logo",
              ),
              LOGO_IMAGE_TIMEOUT_MS,
              `Gemini logo option ${index + 1} timed out`,
            );
            logoUrl = await uploadLogoImage({
              organizationId: ctx!.organization.id,
              imageBase64: image.data,
              mimeType: image.mimeType,
              fileNameBase: `gemini_logo_option_${index + 1}_${Date.now()}`,
            });
          } catch (error) {
            console.warn(`Gemini logo option ${index + 1} failed:`, error);
          }
        }

        if (!logoUrl) {
          logoUrl = await uploadLogoSvg({
            organizationId: ctx!.organization.id,
            svg: buildFallbackLogoSvg({
              initials,
              brandColor,
              accentColor,
              variant: index + 1,
            }),
            fileName: `fallback_ai_logo_option_${index + 1}_${Date.now()}.svg`,
          });
        }

        return {
          id: `option-${index + 1}`,
          name: optionName,
          summary,
          brand_color: brandColor,
          accent_color: accentColor,
          color_reason: colorReason,
          logo_url: logoUrl ?? null,
        };
      }),
    );

    const categorySuggestions: FoodCategorySuggestion[] = [];
    const usedCategoryKeys = new Set<string>();
    const rawCategorySuggestions = Array.isArray(
      parsed.food_category_suggestions,
    )
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
        kind: category.kind === "specialty" ? "specialty" : "basic",
      });
    };

    rawCategorySuggestions.forEach(addCategory);
    if (categorySuggestions.length === 0) {
      buildContextualFallbackCategories({
        ownerIntro,
        cuisine,
        specialties,
      }).forEach(addCategory);
    }

    return NextResponse.json({
      description_en: parsed.description_en ?? "",
      description_ja: parsed.description_ja ?? "",
      description_vi: parsed.description_vi ?? "",
      hero_title_en: parsed.hero_title_en ?? "",
      hero_title_ja: parsed.hero_title_ja ?? "",
      hero_title_vi: parsed.hero_title_vi ?? "",
      hero_subtitle_en: parsed.hero_subtitle_en ?? "",
      hero_subtitle_ja: parsed.hero_subtitle_ja ?? "",
      hero_subtitle_vi: parsed.hero_subtitle_vi ?? "",
      owner_story_en: parsed.owner_story_en ?? "",
      owner_story_ja: parsed.owner_story_ja ?? "",
      owner_story_vi: parsed.owner_story_vi ?? "",
      brand_options: brandOptions,
      brand_color:
        brandOptions[0]?.brand_color ?? FALLBACK_BRAND_PALETTES[0].brand_color,
      logo_url: brandOptions[0]?.logo_url ?? null,
      food_category_suggestions: categorySuggestions,
    });
  } catch (error) {
    console.error("Organization onboarding AI generation failed:", error);

    const fallbackInitials = getCompanyInitials(fallbackContext.companyName);
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
        color_reason: palette.color_reason,
        logo_url: logoUrl,
      });
    }

    const fallbackCategories = buildContextualFallbackCategories({
      ownerIntro: fallbackContext.ownerIntro,
      cuisine: fallbackContext.cuisine,
      specialties: fallbackContext.specialties,
    });

    return NextResponse.json({
      description_en:
        "We run our restaurants with care, consistent quality, and warm hospitality so every guest feels comfortable from the first visit.",
      description_ja:
        "私たちは、安定した品質とあたたかいおもてなしを大切にし、どの店舗でも安心して食事を楽しめる体験を届けます。",
      description_vi:
        "Chúng tôi vận hành nhà hàng với sự chỉn chu, chất lượng ổn định và sự hiếu khách ấm áp để mỗi thực khách đều cảm thấy yên tâm ngay từ lần đầu ghé thăm.",
      brand_color: "#C45B2D",
      hero_title_en: "Warm meals, every day",
      hero_title_ja: "毎日に、あたたかい一皿を",
      hero_title_vi: "Mỗi ngày một bữa ăn ấm áp",
      hero_subtitle_en:
        "Comforting food, steady quality, and a calm place for guests to return to again and again.",
      hero_subtitle_ja:
        "ほっとする料理と安定した品質で、何度でも訪れたくなる落ち着いた食事体験を届けます。",
      hero_subtitle_vi:
        "Món ăn thân thuộc, chất lượng ổn định và một không gian để khách muốn quay lại nhiều lần.",
      owner_story_en:
        "We built this restaurant with the belief that good hospitality comes from consistency, care, and respect for every guest who walks through the door.",
      owner_story_ja:
        "この店は、一人ひとりのお客様を大切にし、丁寧さと安定した品質を積み重ねることが本当のおもてなしにつながるという思いから始まりました。",
      owner_story_vi:
        "Chúng tôi bắt đầu nhà hàng này với niềm tin rằng sự hiếu khách chân thành đến từ tính ổn định, sự chỉn chu và sự tôn trọng dành cho từng vị khách ghé thăm.",
      brand_options: fallbackBrandOptions,
      logo_url: fallbackBrandOptions[0]?.logo_url ?? null,
      food_category_suggestions: fallbackCategories,
    });
  }
}
