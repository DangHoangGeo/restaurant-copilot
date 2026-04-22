import { NextRequest, NextResponse } from "next/server";
import { getCustomerSessionInfo } from "@/lib/server/customer-session";

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("sessionId");
    const restaurantId = req.nextUrl.searchParams.get("restaurantId");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "Restaurant ID is required" },
        { status: 400 }
      );
    }

    const order = await getCustomerSessionInfo({
      sessionId,
      restaurantId,
    });

    return NextResponse.json({ success: true, order });

  } catch (error) {
    console.error("Error fetching order history:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
