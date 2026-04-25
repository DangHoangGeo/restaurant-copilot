import { supabaseAdmin } from "@/lib/supabaseAdmin";

export interface PublicPlatformStats {
  restaurantCount: number;
  ordersLast24Hours: number;
}

export async function getPublicPlatformStats(): Promise<PublicPlatformStats> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [restaurantsResult, ordersResult] = await Promise.all([
    supabaseAdmin
      .from("restaurants")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("is_verified", true)
      .is("suspended_at", null),
    supabaseAdmin
      .from("orders")
      .select("id, restaurants!inner(id)", { count: "exact", head: true })
      .gte("created_at", since)
      .neq("status", "canceled")
      .eq("restaurants.is_active", true)
      .eq("restaurants.is_verified", true)
      .is("restaurants.suspended_at", null),
  ]);

  if (restaurantsResult.error) {
    console.error("Failed to load public restaurant count", restaurantsResult.error);
  }

  if (ordersResult.error) {
    console.error("Failed to load public order count", ordersResult.error);
  }

  return {
    restaurantCount: restaurantsResult.count ?? 0,
    ordersLast24Hours: ordersResult.count ?? 0,
  };
}
