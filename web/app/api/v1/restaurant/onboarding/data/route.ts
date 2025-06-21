import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * API endpoint for getting existing onboarding data
 * GET /api/v1/restaurant/onboarding/data
 */
export async function GET() {
  const user = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    console.log('🔍 Authentication failed - no user or restaurant ID');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get gallery images
    const { data: galleryImages, error: galleryError } = await supabaseAdmin
      .from('restaurant_gallery_images')
      .select('image_url')
      .eq('restaurant_id', user.restaurantId)
      .order('sort_order', { ascending: true });

    if (galleryError) {
      console.error('Error fetching gallery images:', galleryError);
    }

    // Get signature dishes
    const { data: signatureDishes, error: dishesError } = await supabaseAdmin
      .from('menu_items')
      .select(`
        name_en,
        name_ja,
        name_vi,
        description_en,
        description_ja,
        description_vi,
        price
      `)
      .eq('restaurant_id', user.restaurantId)
      .eq('is_signature', true)
      .order('position', { ascending: true });

    if (dishesError) {
      console.error('Error fetching signature dishes:', dishesError);
    }

    return NextResponse.json({
      success: true,
      data: {
        gallery_images: galleryImages?.map(img => img.image_url) || [],
        signature_dishes: signatureDishes || [],
      },
    });

  } catch (error) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch onboarding data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
