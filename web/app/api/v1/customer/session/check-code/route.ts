import { NextRequest, NextResponse } from "next/server";
import { resolveCustomerEntryContext } from "@/lib/server/customer-entry";

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
    const entry = await resolveCustomerEntryContext({
      host: req.headers.get('host'),
      orgIdentifier: req.nextUrl.searchParams.get('org'),
      branchCode: req.nextUrl.searchParams.get('branch'),
      tableCode: code,
    });

    if (!entry) {
      return NextResponse.json({
        success: false,
        error: "Invalid QR code"
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      tableId: entry.tableId,
      restaurantId: entry.restaurant.id,
      activeSessionId: entry.activeSessionId,
      requirePasscode: entry.requirePasscode
    });

  } catch (error) {
    console.error("Error checking QR code:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to process QR code"
    }, { status: 500 });
  }
}
