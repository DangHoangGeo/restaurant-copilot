import { NextRequest, NextResponse } from 'next/server';
import { createGeminiHelper } from '@/lib/gemini';

/**
 * API endpoint for menu item analysis and suggestions using Google Gemini AI
 * POST /api/v1/ai/analyze-menu-item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price, category, ratings, orders } = body;

    if (!name || !price || !category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, category' },
        { status: 400 }
      );
    }

    const gemini = createGeminiHelper();
    const analysis = await gemini.analyzeMenuItem({
      name,
      description: description || '',
      price: parseFloat(price),
      category,
      ratings: ratings ? parseFloat(ratings) : undefined,
      orders: orders ? parseInt(orders) : undefined,
    });

    return NextResponse.json({
      analysis,
      itemData: {
        name,
        description,
        price,
        category,
        ratings,
        orders
      }
    });
  } catch (error) {
    console.error('Menu analysis error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze menu item',
        analysis: {
          suggestions: ['Consider adding more descriptive language'],
          marketingTips: ['Highlight unique ingredients or preparation methods'],
          pricingAdvice: 'Review competitor pricing in your area'
        }
      },
      { status: 500 }
    );
  }
}
