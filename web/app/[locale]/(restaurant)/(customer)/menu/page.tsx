import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { MenuPageClient } from "./MenuPageClient";
import { SmartMenuSkeleton } from "@/components/ui/enhanced-skeleton";
import { headers } from "next/headers";
import { getSubdomainFromHost } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { Category } from "@/shared/types/menu";

interface MenuPageProps {
  params: {
    locale: string;
  };
}

async function getMenuData(subdomain: string): Promise<Category[] | null> {
  const { data: restaurant, error: restaurantError } = await supabaseAdmin
    .from("restaurants")
    .select("id")
    .eq("subdomain", subdomain)
    .single();

  if (restaurantError || !restaurant) {
    console.error("Restaurant not found for subdomain:", subdomain, restaurantError);
    return null;
  }

  const { data: categories, error: categoriesError } = await supabaseAdmin
    .from("categories")
    .select(
      `
      id,
      name_en,
      name_ja,
      name_vi,
      position,
      restaurant_id,
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
        position,
        category_id,
        tags,
        stock_level
      )
    `
    )
    .eq("restaurant_id", restaurant.id)
    .order("position", { ascending: true })
    .order("position", { foreignTable: "menu_items", ascending: true });

  if (categoriesError) {
    console.error("Error fetching menu categories:", categoriesError);
    return null;
  }

  return categories as Category[];
}

export default async function MenuPage({ params }: MenuPageProps) {
  setRequestLocale(params.locale);

  const headersList = headers();
  const host = headersList.get("host");
  const subdomain = getSubdomainFromHost(host || "");

  const categories = await getMenuData(subdomain);

  return (
    <Suspense fallback={<SmartMenuSkeleton />}>
      <MenuPageClient locale={params.locale} categories={categories || []} />
    </Suspense>
  );
}
