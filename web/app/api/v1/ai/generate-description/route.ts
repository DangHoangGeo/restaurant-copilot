import { NextRequest, NextResponse } from 'next/server';
import { createGeminiHelper } from '@/lib/gemini';

/**
 * API endpoint for generating menu descriptions using Google Gemini AI
 * POST /api/v1/ai/generate-description
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemName, initialData, language = 'en' } = body;

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

    let gemini;
    try {
      gemini = createGeminiHelper();
    } catch {
      return NextResponse.json({ en: '', ja: '', vi: '' });
    }

    const description = await gemini.generateMenuDescription(itemName, initialData, language);
    return NextResponse.json(description);
  } catch (error) {
    console.error('Description generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate description' },
      { status: 500 }
    );
  }
}
