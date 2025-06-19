import { NextRequest, NextResponse } from 'next/server';
import { createGeminiHelper } from '@/lib/gemini';

/**
 * API endpoint for generating menu descriptions using Google Gemini AI
 * POST /api/v1/ai/generate-description
 */
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
    console.log('Context Info:', contextInfo);

    const gemini = createGeminiHelper();
    const data = await gemini.generateMenuItemNameDescTags(itemName, contextInfo, language);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Description generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate description',
        fallback: `Could not generate description at this time.`
      },
      { status: 500 }
    );
  }
}
