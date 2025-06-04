import { supabaseAdmin } from "./supabaseAdmin";

export async function logEvent({ restaurantId, userId, level, endpoint, message, metadata }: {
  restaurantId?: string;
  userId?: string;
  level: "INFO"|"WARN"|"ERROR"|"DEBUG";
  endpoint: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  await supabaseAdmin.from("logs").insert([{
    restaurant_id: restaurantId, user_id: userId,
    level, endpoint, message, metadata
  }]);
}
