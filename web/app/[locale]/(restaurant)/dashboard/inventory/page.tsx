// Inventory management page
// Shows all inventory items, stock levels, and management tools

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { InventoryClientContent } from "./inventory-client-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "owner.inventory" });
  return { title: t("pageTitle") };
}

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getUserFromRequest();

  if (!user?.restaurantId) {
    redirect(`/${locale}/dashboard`);
  }

  const restaurantId = user.restaurantId;
  const canWrite = user.role && ['owner', 'manager'].includes(user.role);

  // Fetch all inventory items for this restaurant
  const { data: inventoryItems, error } = await supabaseAdmin
    .from('inventory_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching inventory items:', error);
  }

  return (
    <InventoryClientContent
      initialItems={inventoryItems || []}
      canWrite={canWrite}
      locale={locale}
    />
  );
}
