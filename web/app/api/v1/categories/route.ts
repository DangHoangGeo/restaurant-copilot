import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getRestaurantIdFromSubdomain } from '@/lib/server/restaurant-settings';
import { headers } from 'next/headers';
import { getSubdomainFromHost } from '@/lib/utils';

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  position: z.number().optional().nullable(),
});

export async function GET() {
  try {
    const host = (await headers()).get("host") || "";
    const subdomain = getSubdomainFromHost(host);
    if (!subdomain) {
      return NextResponse.json({ error: "Subdomain is required" }, { status: 400 });
    }

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("subdomain", subdomain)
      .single();

      if (restaurantError || !restaurant) {
        return NextResponse.json(
          { error: restaurantError?.message || "Restaurant not found" },
          { status: 404 }
        );
      }

    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select(`
        id,
        name_en,
        name_ja,
        name_vi,
        position,
        menu_items (
          id,
          name_en,
          name_ja,
          name_vi,
          description_en,
          description_ja,
          description_vi,
          price,
          image_url,
          available,
          weekday_visibility,
          stock_level,
          position
        )
      `)
      .eq('restaurant_id', restaurant.id)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      return NextResponse.json({ message: 'Error fetching categories', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ categories }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknow error!" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const host = (await headers()).get("host") || "";
    const subdomain = host.split('.')[0]; // Simplified, make robust
    const restaurantId = await getRestaurantIdFromSubdomain(subdomain);

    if (!restaurantId) {
      return NextResponse.json({ message: 'Restaurant not found or invalid subdomain.' }, { status: 400 });
    }

    const body = await req.json();
    const validatedData = categorySchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ errors: validatedData.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, position } = validatedData.data;

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([{ restaurant_id: restaurantId, name, position }])
      .select()
      .single();

    if (error) {
      console.error('Error creating category:', error);
      return NextResponse.json({ message: 'Error creating category', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Category created successfully', category: data }, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : "Unknow error!" }, { status: 500 });
  }
}
