import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSubdomainFromHost } from "@/lib/utils";

/**
 * Customer API: Get tables data by subdomain
 * Returns available tables for booking
 */
export async function GET(req: NextRequest) {
  try {
    // Get subdomain from host header or query param
    const hostHeader = req.headers.get('host') || '';
    const subdomainFromHost = getSubdomainFromHost(hostHeader);
    const subdomainFromQuery = req.nextUrl.searchParams.get("subdomain");
    
    const subdomain = subdomainFromQuery || subdomainFromHost;

    if (!subdomain) {
      return NextResponse.json({ 
        error: "No subdomain provided" 
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

    // Fetch tables
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from("tables")
      .select(`
        id,
        name,
        capacity,
        status,
        is_outdoor,
        is_accessible,
        notes,
        qr_code
      `)
      .eq("restaurant_id", restaurant.id)
      .eq("status", "available") // Only return available tables for customers
      .order("name", { ascending: true });

    if (tablesError) {
      console.error("Error fetching tables:", tablesError);
      return NextResponse.json({
        error: "Failed to load tables",
        details: tablesError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      tables: tables || []
    });

  } catch (error) {
    console.error("Unexpected error in customer tables API:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({
      error: "Failed to load tables data",
      details: message
    }, { status: 500 });
  }
}
