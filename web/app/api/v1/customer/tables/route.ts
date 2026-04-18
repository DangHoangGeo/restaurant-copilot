import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePublicRestaurantContext } from "@/lib/server/customer-entry";

/**
 * Customer API: Get tables data by subdomain
 * Returns available tables for booking
 */
export async function GET(req: NextRequest) {
  try {
    const restaurantIdParam = req.nextUrl.searchParams.get("restaurantId");
    let restaurantId = restaurantIdParam;

    if (!restaurantId) {
      const restaurantContext = await resolvePublicRestaurantContext({
        host: req.headers.get("host"),
        orgIdentifier: req.nextUrl.searchParams.get("org"),
        branchCode: req.nextUrl.searchParams.get("branch"),
        subdomain: req.nextUrl.searchParams.get("subdomain"),
      });

      if (!restaurantContext) {
        return NextResponse.json(
          {
            error: "Restaurant not found",
          },
          { status: 404 },
        );
      }

      restaurantId = restaurantContext.restaurant.id;
    }

    if (!restaurantId) {
      return NextResponse.json(
        {
          error: "No restaurant provided",
        },
        { status: 400 },
      );
    }

    // Fetch tables
    const { data: tables, error: tablesError } = await supabaseAdmin
      .from("tables")
      .select(
        `
        id,
        name,
        capacity,
        status,
        is_outdoor,
        is_accessible,
        notes,
        qr_code
      `,
      )
      .eq("restaurant_id", restaurantId)
      .eq("status", "available") // Only return available tables for customers
      .order("name", { ascending: true });

    if (tablesError) {
      console.error("Error fetching tables:", tablesError);
      return NextResponse.json(
        {
          error: "Failed to load tables",
          details: tablesError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      tables: tables || [],
    });
  } catch (error) {
    console.error("Unexpected error in customer tables API:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to load tables data",
        details: message,
      },
      { status: 500 },
    );
  }
}
