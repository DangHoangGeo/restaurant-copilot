// GET /api/v1/platform/health/partitions
// Platform-admin health check for monthly order partitions.

import { NextRequest } from "next/server";
import {
  requirePlatformAdmin,
  platformApiError,
  platformApiResponse,
} from "@/lib/platform-admin";
import { supabaseReadAdmin } from "@/lib/supabase/read-client";

export async function GET(request: NextRequest) {
  const authError = await requirePlatformAdmin();
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date") || undefined;
    const rawMonthsAhead = searchParams.get("months_ahead");
    const monthsAhead = rawMonthsAhead ? Number(rawMonthsAhead) : 3;

    if (!Number.isInteger(monthsAhead) || monthsAhead < 0 || monthsAhead > 24) {
      return platformApiError("months_ahead must be an integer from 0 to 24", 400);
    }

    const { data, error } = await supabaseReadAdmin.rpc(
      "get_order_partition_health",
      {
        p_start_date: startDate ?? null,
        p_months_ahead: monthsAhead,
      },
      { get: true },
    );

    if (error) {
      console.error("Error fetching partition health:", error);
      return platformApiError("Failed to fetch partition health", 500);
    }

    return platformApiResponse(data);
  } catch (error) {
    console.error("Error in GET /platform/health/partitions:", error);
    return platformApiError("Internal server error", 500);
  }
}
