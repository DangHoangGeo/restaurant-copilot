import { NextRequest, NextResponse } from 'next/server';
import { createGeminiHelper } from '@/lib/gemini';
import { buildOnboardingPrompt, validateOnboardingResponse } from '@/lib/ai/prompts/onboarding';
import type { OnboardingAIRequest, OnboardingAIResponse } from '@/shared/types/ai';

/**
 * API endpoint for generating onboarding content using Gemini AI
 * POST /api/v1/restaurant/onboarding/ai-generate
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, cuisine, city, style, specialties } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Restaurant name is required' },
        { status: 400 }
      );
    }

    const aiRequest: OnboardingAIRequest = {
      name: name.trim(),
      cuisine: cuisine?.trim(),
      city: city?.trim(),
      style: style?.trim(),
      specialties: specialties?.trim(),
    };

    const gemini = createGeminiHelper();
    const prompt = buildOnboardingPrompt(aiRequest);

    // Generate content using Gemini AI
    const result = await gemini.generateContent(prompt, 'onboarding');
    
    // Extract JSON from the response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response');
    }

    const aiResponse = JSON.parse(jsonMatch[0]);

    // Validate the response structure
    if (!validateOnboardingResponse(aiResponse)) {
      throw new Error('Invalid AI response structure');
    }

    return NextResponse.json(aiResponse);
  } catch (error) {
    console.error('Onboarding AI generation error:', error);
    
    // Return fallback content instead of error
    const fallbackResponse: OnboardingAIResponse = {
      hero: {
        title: "Welcome to Our Restaurant",
        subtitle: "Delicious food and warm hospitality await you"
      },
      ownerStory: {
        story_en: "We are passionate about serving authentic cuisine made with the freshest ingredients. Our family has been dedicated to creating memorable dining experiences for over a decade, bringing traditional flavors with a modern touch.",
        story_ja: "私たちは新鮮な食材で作る本格的な料理を提供することに情熱を注いでいます。私たちの家族は10年以上にわたって思い出に残るダイニング体験を創造することに専念し、伝統的な味をモダンなタッチで提供しています。",
        story_vi: "Chúng tôi đam mê phục vụ các món ăn đậm đà được chế biến từ những nguyên liệu tươi ngon nhất. Gia đình chúng tôi đã dành hơn một thập kỷ để tạo ra những trải nghiệm ẩm thực đáng nhớ, mang đến hương vị truyền thống với phong cách hiện đại."
      },
      signatureDishes: [
        {
          name_en: "Chef's Special",
          name_ja: "シェフスペシャル",
          name_vi: "Món Đặc Biệt",
          description_en: "Our signature dish featuring premium ingredients and traditional cooking techniques",
          description_ja: "プレミアム食材と伝統的な調理技術を使った私たちの看板料理",
          description_vi: "Món ăn đặc trưng với nguyên liệu cao cấp và kỹ thuật nấu nướng truyền thống"
        },
        {
          name_en: "House Special Soup",
          name_ja: "名物スープ",
          name_vi: "Soup Đặc Biệt",
          description_en: "Rich and flavorful soup prepared with our secret recipe and fresh herbs",
          description_ja: "秘伝のレシピと新鮮なハーブで作られた豊かで風味豊かなスープ",
          description_vi: "Súp đậm đà hương vị được chế biến theo công thức bí mật và thảo mộc tươi"
        },
        {
          name_en: "Grilled Specialty",
          name_ja: "グリル専門料理",
          name_vi: "Món Nướng Đặc Biệt",
          description_en: "Perfectly grilled with aromatic spices and served with seasonal vegetables",
          description_ja: "香り高いスパイスで完璧にグリルし、季節の野菜と一緒にお召し上がりください",
          description_vi: "Được nướng hoàn hảo với gia vị thơm ngon và phục vụ cùng rau củ theo mùa"
        }
      ]
    };

    return NextResponse.json(fallbackResponse);
  }
}
