import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSubdomainFromHost } from "@/lib/utils";

/**
 * Customer API: Check QR code and get table/session info
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ 
      error: "QR code required" 
    }, { status: 400 });
  }

  try {
    // Get subdomain from host header
    const hostHeader = req.headers.get('host') || '';
    const subdomain = getSubdomainFromHost(hostHeader);

    if (!subdomain) {
      return NextResponse.json({ 
        error: "Invalid subdomain" 
      }, { status: 400 });
    }

    // Get restaurant ID from subdomain
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("subdomain", subdomain)
      .single();

    if (restaurantError || !restaurant) {
      return NextResponse.json({
        error: "Restaurant not found",
        details: restaurantError?.message
      }, { status: 404 });
    }

    // Call RPC to get table session info by code
    const { data, error } = await supabaseAdmin.rpc('get_table_session_by_code', {
      input_code: code,
      input_restaurant_id: restaurant.id
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: "Invalid QR code"
      }, { status: 400 });
    }

    const row = data[0] as {
      table_id: string;
      restaurant_id: string;
      active_session_id: string | null;
      require_passcode: boolean;
    };

    return NextResponse.json({
      success: true,
      tableId: row.table_id,
      restaurantId: row.restaurant_id,
      activeSessionId: row.active_session_id,
      requirePasscode: row.require_passcode
    });

  } catch (error) {
    console.error("Error checking QR code:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to process QR code"
    }, { status: 500 });
  }
}
