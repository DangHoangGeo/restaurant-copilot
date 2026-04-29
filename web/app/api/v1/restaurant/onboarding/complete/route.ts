import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { invalidateCustomerPublicCache } from '@/lib/server/customer-cache';

// Validation schema for onboarding completion
const onboardingCompleteSchema = z.object({
  // Restaurant settings
  name: z.string().min(1).max(100),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(100).optional(),
  address: z.string().max(500).optional(),
  website: z.string().url().max(200).optional(),
  
  // Homepage content - hero section
  hero_title_en: z.string().max(100).optional(),
  hero_title_ja: z.string().max(100).optional(),
  hero_title_vi: z.string().max(100).optional(),
  hero_subtitle_en: z.string().max(200).optional(),
  hero_subtitle_ja: z.string().max(200).optional(),
  hero_subtitle_vi: z.string().max(200).optional(),
  
  // Owner story content
  owner_story_en: z.string().max(1000).optional(),
  owner_story_ja: z.string().max(1000).optional(),
  owner_story_vi: z.string().max(1000).optional(),
  
  // Media URLs
  logo_url: z.string().url().or(z.literal('')).optional(),
  owner_photo_url: z.string().url().or(z.literal('')).optional(),
  gallery_images: z.array(z.string().url()).optional(),
  
  // Signature dishes (will be processed separately)
  signature_dishes: z.array(z.object({
    name_en: z.string().min(1),
    name_ja: z.string().optional(),
    name_vi: z.string().optional(),
    description_en: z.string().optional(),
    description_ja: z.string().optional(),
    description_vi: z.string().optional(),
    price: z.number().min(0).default(0),
  })).optional(),
});

type OnboardingCompleteData = z.infer<typeof onboardingCompleteSchema>;

/**
 * API endpoint for completing the onboarding process
 * POST /api/v1/restaurant/onboarding/complete
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = onboardingCompleteSchema.safeParse(body);

    if (!validation.success) {
      console.error('Onboarding validation error:', validation.error);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          message: validation.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const data: OnboardingCompleteData = validation.data;
    const warnings: string[] = [];

    // Update restaurant data directly (simpler approach)
    const restaurantUpdates: Record<string, string | boolean> = {
      updated_at: new Date().toISOString(),
      onboarded: true,
    };

    // Add fields that have values
    if (data.name) restaurantUpdates.name = data.name;
    if (data.phone) restaurantUpdates.phone = data.phone;
    if (data.email) restaurantUpdates.email = data.email;
    if (data.address) restaurantUpdates.address = data.address;
    if (data.website) restaurantUpdates.website = data.website;
    if (data.logo_url) restaurantUpdates.logo_url = data.logo_url;
    if (data.owner_photo_url) restaurantUpdates.owner_photo_url = data.owner_photo_url;
    if (data.hero_title_en) restaurantUpdates.hero_title_en = data.hero_title_en;
    if (data.hero_title_ja) restaurantUpdates.hero_title_ja = data.hero_title_ja;
    if (data.hero_title_vi) restaurantUpdates.hero_title_vi = data.hero_title_vi;
    if (data.hero_subtitle_en) restaurantUpdates.hero_subtitle_en = data.hero_subtitle_en;
    if (data.hero_subtitle_ja) restaurantUpdates.hero_subtitle_ja = data.hero_subtitle_ja;
    if (data.hero_subtitle_vi) restaurantUpdates.hero_subtitle_vi = data.hero_subtitle_vi;
    if (data.owner_story_en) restaurantUpdates.owner_story_en = data.owner_story_en;
    if (data.owner_story_ja) restaurantUpdates.owner_story_ja = data.owner_story_ja;
    if (data.owner_story_vi) restaurantUpdates.owner_story_vi = data.owner_story_vi;

    // Update restaurant table
    const { error: updateError } = await supabaseAdmin
      .from('restaurants')
      .update(restaurantUpdates)
      .eq('id', user.restaurantId);

    if (updateError) {
      console.error('Restaurant update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update restaurant data', details: updateError.message },
        { status: 500 }
      );
    }

    // Handle gallery images if provided
    if (data.gallery_images && data.gallery_images.length > 0) {
      try {
        // Get current gallery count
        const { count } = await supabaseAdmin
          .from('restaurant_gallery_images')
          .select('*', { count: 'exact', head: true })
          .eq('restaurant_id', user.restaurantId);

        const existingCount = count || 0;

        // Insert new gallery images
        const galleryInserts = data.gallery_images.map((url, index) => ({
          restaurant_id: user.restaurantId,
          image_url: url,
          alt_text: `Gallery Image ${existingCount + index + 1}`,
          sort_order: existingCount + index,
        }));

        const { error: galleryError } = await supabaseAdmin
          .from('restaurant_gallery_images')
          .insert(galleryInserts);

        if (galleryError) {
          console.error('Gallery images error:', galleryError);
          warnings.push(`Failed to upload gallery images: ${galleryError.message}`);
        }
      } catch (galleryError) {
        console.error('Error processing gallery images:', galleryError);
        warnings.push(`Error processing gallery images: ${galleryError instanceof Error ? galleryError.message : 'Unknown error'}`);
      }
    }

    // Handle signature dishes separately if provided
    if (data.signature_dishes && data.signature_dishes.length > 0) {
      try {
        // First, get or create a "Signature Dishes" category
        let categoryId: string;
        
        const { data: existingCategory, error: categoryFetchError } = await supabaseAdmin
          .from('categories')
          .select('id')
          .eq('restaurant_id', user.restaurantId)
          .eq('name_en', 'Signature Dishes')
          .single();

        if (categoryFetchError && categoryFetchError.code !== 'PGRST116') {
          console.error('Error fetching signature category:', categoryFetchError);
        }

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          // Get the next available position for this restaurant
          const { data: maxPositionData } = await supabaseAdmin
            .from('categories')
            .select('position')
            .eq('restaurant_id', user.restaurantId)
            .order('position', { ascending: false })
            .limit(1)
            .single();

          const nextPosition = (maxPositionData?.position ?? -1) + 1;

          // Create a new signature dishes category
          const { data: newCategory, error: categoryCreateError } = await supabaseAdmin
            .from('categories')
            .insert({
              restaurant_id: user.restaurantId,
              name_en: 'Signature Dishes',
              name_ja: 'おすすめ料理',
              name_vi: 'Món đặc biệt',
              position: nextPosition,
            })
            .select('id')
            .single();

          if (categoryCreateError || !newCategory) {
            console.error('Error creating signature category:', categoryCreateError);
            throw new Error(`Failed to create signature dishes category: ${categoryCreateError?.message}`);
          }

          categoryId = newCategory.id;
        }

        // Insert signature dishes
        const menuItemsToInsert = data.signature_dishes.map((dish, index) => ({
          restaurant_id: user.restaurantId,
          category_id: categoryId,
          name_en: dish.name_en,
          name_ja: dish.name_ja || dish.name_en,
          name_vi: dish.name_vi || dish.name_en,
          description_en: dish.description_en || null,
          description_ja: dish.description_ja || null,
          description_vi: dish.description_vi || null,
          price: dish.price,
          is_signature: true,
          available: true,
          position: index,
        }));

        const { error: menuItemsError } = await supabaseAdmin
          .from('menu_items')
          .insert(menuItemsToInsert);

        if (menuItemsError) {
          console.error('Error creating signature dishes:', menuItemsError);
          warnings.push(`Failed to create signature dishes: ${menuItemsError.message}`);
        }
      } catch (signatureError) {
        console.error('Error processing signature dishes:', signatureError);
        warnings.push(`Error processing signature dishes: ${signatureError instanceof Error ? signatureError.message : 'Unknown error'}`);
      }
    }

    // Get the updated restaurant data to return
    const { data: updatedRestaurant, error: fetchError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', user.restaurantId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated restaurant:', fetchError);
      await invalidateCustomerPublicCache(user.restaurantId);
      // Return success anyway since onboarding completed
      return NextResponse.json({
        success: true,
        message: 'Onboarding completed successfully',
        restaurant_id: user.restaurantId,
        warnings: warnings.length > 0 ? warnings : undefined,
      });
    }

    await invalidateCustomerPublicCache(user.restaurantId);

    return NextResponse.json({
      success: true,
      message: warnings.length > 0 
        ? 'Onboarding completed with some warnings' 
        : 'Onboarding completed successfully',
      restaurant: updatedRestaurant,
      warnings: warnings.length > 0 ? warnings : undefined,
    });

  } catch (error) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to complete onboarding',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
