import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { organizationOnboardingSchema } from '@/lib/server/organizations/schemas';
import { resolveOrgContext, updateOrganization } from '@/lib/server/organizations/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canChangeOrgSettings()) {
    return forbidden('Requires organization_settings permission');
  }

  if (ctx!.organization.approval_status !== 'approved') {
    return forbidden('Organization must be approved before onboarding can be completed');
  }

  try {
    const body = await request.json();
    const input = organizationOnboardingSchema.parse(body);

    const { data: ownedBranch } = await supabaseAdmin
      .from('organization_restaurants')
      .select('restaurant_id')
      .eq('organization_id', ctx!.organization.id)
      .eq('restaurant_id', input.primary_branch.id)
      .maybeSingle();

    if (!ownedBranch) {
      return NextResponse.json({ error: 'Branch does not belong to this organization' }, { status: 403 });
    }

    const result = await updateOrganization(ctx!.organization.id, {
      name: input.name,
      country: input.country,
      timezone: input.timezone,
      currency: input.currency,
      logo_url: input.logo_url ?? null,
      brand_color: input.brand_color,
      website: input.website ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      description_en: input.description_en ?? null,
      description_ja: input.description_ja ?? null,
      description_vi: input.description_vi ?? null,
      onboarding_completed_at: new Date().toISOString(),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Failed to save onboarding' }, { status: 500 });
    }

    const branch = input.primary_branch;
    const restaurantUpdates = {
      name: branch.name,
      branch_code: branch.branch_code,
      default_language: branch.default_language,
      tax: branch.tax,
      address: branch.address ?? null,
      opening_hours: branch.opening_hours ?? null,
      phone: branch.phone ?? null,
      email: branch.email ?? null,
      website: branch.website ?? null,
      logo_url: branch.logo_url ?? input.logo_url ?? null,
      hero_title_en: branch.hero_title_en ?? null,
      hero_title_ja: branch.hero_title_ja ?? null,
      hero_title_vi: branch.hero_title_vi ?? null,
      hero_subtitle_en: branch.hero_subtitle_en ?? null,
      hero_subtitle_ja: branch.hero_subtitle_ja ?? null,
      hero_subtitle_vi: branch.hero_subtitle_vi ?? null,
      owner_story_en: branch.owner_story_en ?? null,
      owner_story_ja: branch.owner_story_ja ?? null,
      owner_story_vi: branch.owner_story_vi ?? null,
      owner_photo_url: branch.owner_photo_url ?? null,
      onboarded: true,
      updated_at: new Date().toISOString(),
    };

    const { error: restaurantError } = await supabaseAdmin
      .from('restaurants')
      .update(restaurantUpdates)
      .eq('id', branch.id);

    if (restaurantError) {
      console.error('Organization onboarding restaurant save failed:', restaurantError);
      return NextResponse.json({ error: 'Failed to save branch setup' }, { status: 500 });
    }

    if (branch.gallery_images) {
      const { error: deleteGalleryError } = await supabaseAdmin
        .from('restaurant_gallery_images')
        .delete()
        .eq('restaurant_id', branch.id);

      if (deleteGalleryError) {
        console.error('Failed to reset onboarding gallery images:', deleteGalleryError);
        return NextResponse.json({ error: 'Failed to save branch gallery' }, { status: 500 });
      }
    }

    if (branch.gallery_images && branch.gallery_images.length > 0) {
      const { error: galleryError } = await supabaseAdmin
        .from('restaurant_gallery_images')
        .insert(
          branch.gallery_images.map((imageUrl, index) => ({
            restaurant_id: branch.id,
            image_url: imageUrl,
            alt_text: `${branch.name} image ${index + 1}`,
            sort_order: index,
          }))
        );

      if (galleryError) {
        console.error('Failed to save onboarding gallery images:', galleryError);
        return NextResponse.json({ error: 'Failed to save branch gallery' }, { status: 500 });
      }
    }

    if (branch.signature_dishes) {
      const { error: deleteSignatureItemsError } = await supabaseAdmin
        .from('menu_items')
        .delete()
        .eq('restaurant_id', branch.id)
        .eq('is_signature', true);

      if (deleteSignatureItemsError) {
        console.error('Failed to reset signature dishes during onboarding:', deleteSignatureItemsError);
        return NextResponse.json({ error: 'Failed to save starter signature dishes' }, { status: 500 });
      }
    }

    if (branch.signature_dishes && branch.signature_dishes.length > 0) {
      const { data: existingCategory } = await supabaseAdmin
        .from('categories')
        .select('id')
        .eq('restaurant_id', branch.id)
        .eq('name_en', 'Signature Dishes')
        .maybeSingle();

      let categoryId = existingCategory?.id ?? null;

      if (!categoryId) {
        const { data: lastCategory } = await supabaseAdmin
          .from('categories')
          .select('position')
          .eq('restaurant_id', branch.id)
          .order('position', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: newCategory, error: categoryError } = await supabaseAdmin
          .from('categories')
          .insert({
            restaurant_id: branch.id,
            name_en: 'Signature Dishes',
            name_ja: 'おすすめ料理',
            name_vi: 'Món đặc biệt',
            position: (lastCategory?.position ?? -1) + 1,
          })
          .select('id')
          .single();

        if (categoryError || !newCategory) {
          console.error('Failed to create onboarding signature category:', categoryError);
          return NextResponse.json({ error: 'Failed to save starter signature dishes' }, { status: 500 });
        }

        categoryId = newCategory.id;
      }

      const { error: signatureError } = await supabaseAdmin
        .from('menu_items')
        .insert(
          branch.signature_dishes.map((dish, index) => ({
            restaurant_id: branch.id,
            category_id: categoryId,
            name_en: dish.name_en,
            name_ja: dish.name_ja || dish.name_en,
            name_vi: dish.name_vi || dish.name_en,
            description_en: dish.description_en ?? null,
            description_ja: dish.description_ja ?? null,
            description_vi: dish.description_vi ?? null,
            price: dish.price,
            is_signature: true,
            available: true,
            position: index,
          }))
        );

      if (signatureError) {
        console.error('Failed to save onboarding signature dishes:', signatureError);
        return NextResponse.json({ error: 'Failed to save starter signature dishes' }, { status: 500 });
      }
    }

    const { data: updatedRestaurant, error: updatedRestaurantError } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', branch.id)
      .single();

    if (updatedRestaurantError) {
      console.error('Failed to fetch updated onboarding branch:', updatedRestaurantError);
    }

    return NextResponse.json({
      success: true,
      organization: result.organization,
      restaurant: updatedRestaurant ?? null,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    console.error('Organization onboarding save failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
