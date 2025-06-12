import { NextRequest, NextResponse } from 'next/server';
import { createGeminiHelper, TranslationRequest } from '@/lib/gemini';

// Fallback translations for common items when Gemini is unavailable
const fallbackTranslations: Record<string, { en: string; ja: string; vi: string }> = {
  // Common Vietnamese food items
  'phở': { en: 'Pho Noodle Soup', ja: 'フォー', vi: 'phở' },
  'bánh mì': { en: 'Vietnamese Sandwich', ja: 'バインミー', vi: 'bánh mì' },
  'cơm tấm': { en: 'Broken Rice', ja: 'コムタム', vi: 'cơm tấm' },
  'bún bò huế': { en: 'Hue Beef Noodle Soup', ja: 'ブンボーフエ', vi: 'bún bò huế' },
  'gỏi cuốn': { en: 'Fresh Spring Rolls', ja: 'ゴイクン', vi: 'gỏi cuốn' },
  'chả cá': { en: 'Grilled Fish Cake', ja: 'チャーカー', vi: 'chả cá' },
  'bún chả': { en: 'Grilled Pork Vermicelli', ja: 'ブンチャー', vi: 'bún chả' },
  'cà phê': { en: 'Vietnamese Coffee', ja: 'ベトナムコーヒー', vi: 'cà phê' },
  'chè': { en: 'Sweet Dessert Soup', ja: 'チェー', vi: 'chè' },
  
  // Common toppings
  'thịt nướng': { en: 'Grilled Meat', ja: 'グリル肉', vi: 'thịt nướng' },
  'tôm': { en: 'Shrimp', ja: 'エビ', vi: 'tôm' },
  'chả': { en: 'Fish Cake', ja: '魚のすり身', vi: 'chả' },
  'trứng': { en: 'Egg', ja: '卵', vi: 'trứng' },
  'rau sống': { en: 'Fresh Herbs', ja: '生野菜', vi: 'rau sống' },
  'đậu phộng': { en: 'Peanuts', ja: 'ピーナッツ', vi: 'đậu phộng' },
  'hành phi': { en: 'Fried Onions', ja: 'フライドオニオン', vi: 'hành phi' },
  'nước mắm': { en: 'Fish Sauce', ja: 'ヌックマム', vi: 'nước mắm' },
  'tương ớt': { en: 'Chili Sauce', ja: 'チリソース', vi: 'tương ớt' },
};

// Enhanced translation function using Google Gemini AI
async function translateWithGemini(text: string, context: 'item' | 'topping'): Promise<{ en: string; ja: string; vi: string }> {
  try {
    // First check fallback translations for instant responses on common items
    const lowerText = text.toLowerCase().trim();
    if (fallbackTranslations[lowerText]) {
      console.log(`Using fallback translation for: ${text}`);
      return fallbackTranslations[lowerText];
    }

    // Use Gemini for more complex translations
    const gemini = createGeminiHelper();
    
    const contextMap: Record<string, TranslationRequest['context']> = {
      item: 'menu_item',
      topping: 'topping'
    };

    const translationRequest: TranslationRequest = {
      text,
      context: contextMap[context] || 'menu_item',
      sourceLanguage: 'auto'
    };

    console.log(`Translating with Gemini: ${text} (context: ${context})`);
    const result = await gemini.translateMenuText(translationRequest);
    
    return result;
  } catch (error) {
    console.error('Gemini translation failed, using fallback:', error);
    
    // Fallback to basic translation pattern
    return {
      en: `${text} (English)`,
      ja: `${text} (日本語)`,
      vi: text,
    };
  }
}

export async function POST(request: NextRequest) {
  let body: { text?: string; field?: string; context?: string } = {};
  
  try {
    body = await request.json();
    const { text, field, context } = body;

    if (!text || !field || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: text, field, context' },
        { status: 400 }
      );
    }

    if (!['item', 'topping', 'category'].includes(context)) {
      return NextResponse.json(
        { error: 'Context must be either "item", "topping", or "category"' },
        { status: 400 }
      );
    }

    // Get translations using Google Gemini AI
    // For categories, use 'item' context since they are similar restaurant menu text
    const apiContext = context === 'category' ? 'item' : context;
    const translations = await translateWithGemini(text, apiContext as 'item' | 'topping');

    return NextResponse.json(translations);
  } catch (error) {
    console.error('Translation API error:', error);
    
    // Return a fallback response instead of failing completely
    const fallbackTranslation = {
      en: `${body?.text || 'Unknown'} (English)`,
      ja: `${body?.text || 'Unknown'} (日本語)`,
      vi: body?.text || 'Unknown',
    };

    return NextResponse.json(fallbackTranslation);
  }
}
