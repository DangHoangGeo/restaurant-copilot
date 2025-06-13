import { NextRequest, NextResponse } from 'next/server';
import { createGeminiHelper } from '@/lib/gemini';

/**
 * API endpoint for generating restaurant descriptions using Google Gemini AI
 * POST /api/v1/ai/generate-restaurant-description
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      restaurantName, 
      cuisine, 
      atmosphere, 
      specialties, 
      location,
      baseDescription,
      language = 'en' 
    } = body;

    if (!restaurantName) {
      return NextResponse.json(
        { error: 'Missing required field: restaurantName' },
        { status: 400 }
      );
    }

    if (!['en', 'ja', 'vi'].includes(language)) {
      return NextResponse.json(
        { error: 'Language must be one of: en, ja, vi' },
        { status: 400 }
      );
    }

    const gemini = createGeminiHelper();
    
    // Create a comprehensive prompt for restaurant description
    const contextInfo = [
      restaurantName && `Restaurant Name: ${restaurantName}`,
      cuisine && `Cuisine Type: ${cuisine}`,
      atmosphere && `Atmosphere: ${atmosphere}`,
      specialties && `Specialties: ${specialties}`,
      location && `Location: ${location}`,
      baseDescription && `Additional Info: ${baseDescription}`
    ].filter(Boolean).join('\n');

    const description = await gemini.generateRestaurantDescription(
      restaurantName,
      contextInfo,
      language as 'en' | 'ja' | 'vi'
    );

    return NextResponse.json(description);
  } catch (error) {
    console.error('Restaurant description generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate restaurant description',
        fallback: `Could not generate description at this time.`
      },
      { status: 500 }
    );
  }
}
