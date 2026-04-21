import { NextRequest, NextResponse } from 'next/server';
import { createGeminiHelper } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemName, existingDescription, language, restaurantName, restaurantDescription } = body;

    if (!itemName) {
      return NextResponse.json(
        { error: 'Missing required field: itemName' },
        { status: 400 }
      );
    }

    if (!['en', 'ja', 'vi'].includes(language)) {
      return NextResponse.json(
        { error: 'Language must be one of: en, ja, vi' },
        { status: 400 }
      );
    }

    const contextInfo = `
      Dish Description: ${existingDescription || 'No existing description provided.'}
      Restaurant Name: ${restaurantName}
      Restaurant Description: ${restaurantDescription || 'No restaurant description provided.'}
    `;

    let gemini;
    try {
      gemini = createGeminiHelper();
    } catch {
      // Gemini not configured — return the item name prefilled so the UI still advances
      return NextResponse.json({
        name_en: language === 'en' ? itemName : '',
        name_ja: language === 'ja' ? itemName : '',
        name_vi: language === 'vi' ? itemName : '',
        description_en: '',
        description_ja: '',
        description_vi: '',
        tags: [],
      });
    }

    const data = await gemini.generateMenuItemNameDescTags(itemName, contextInfo, language);
    return NextResponse.json(data);
  } catch (error) {
    console.error('AI menu item generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate menu item copy' },
      { status: 500 }
    );
  }
}
